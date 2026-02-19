import { Server, ServerWebSocket } from "bun";

// Enhanced logging system
const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },
  debug: (message: string, ...args: any[]) => {
    console.log(`[DEBUG] ${message}`, ...args);
  },
  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },
  error: (message: string, ...args: any[]) => {
    console.error(`[ERROR] ${message}`, ...args);
  }
};

// Store clients by channel
const channels = new Map<string, Set<ServerWebSocket<any>>>();

// Keep track of channel statistics
const stats = {
  totalConnections: 0,
  activeConnections: 0,
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0,
  // Queue & routing stats
  queueDepthMax: 0,
  queuedCommands: 0,
  queueRejections: 0,
  blockedCommands: 0,
  unicastResponses: 0,
  discardedResponses: 0,
  cleanedStaleRequests: 0,
};

// ─── Command Queue & Response Routing Infrastructure ────────────────────────

// Track which client sent each request (for unicast response routing)
const requestToClient = new Map<string, { ws: ServerWebSocket<any>; timestamp: number }>();

// Track client roles per channel
const pluginClients = new Set<ServerWebSocket<any>>();
const agentClients = new Set<ServerWebSocket<any>>();

// Session deduplication: MCP agents send a stable sessionId in join messages.
// When the same session reconnects (e.g., after context compaction), the old
// connection is closed to prevent stale connections polluting routing.
const sessionToClient = new Map<string, ServerWebSocket<any>>();

// Creation commands that ALWAYS require parentId (prevents implicit page-context dependency)
const CREATION_COMMANDS = new Set([
  "create_rectangle", "create_frame", "create_text", "create_ellipse",
  "create_polygon", "create_star", "create_vector", "create_line",
  "create_component_instance", "create_component_set", "set_svg",
  "clone_node", "create_component_from_node",
]);

// Stateful commands blocked unconditionally (use parentId-based targeting instead)
const BLOCKED_COMMANDS = new Set(["set_current_page"]);

// Per-channel command queue
interface QueuedCommand {
  data: any;
  senderWs: ServerWebSocket<any>;
  requestId: string;
  enqueuedAt: number;
}

interface ChannelQueueState {
  queue: QueuedCommand[];
  isProcessing: boolean;
  currentCommandTimeout?: ReturnType<typeof setTimeout>;
  currentRequestId?: string;
}

// Per-command timeout: safety net if plugin hangs or disconnects
const COMMAND_TIMEOUT_MS = 120_000; // 2 minutes

const channelQueues = new Map<string, ChannelQueueState>();
const MAX_QUEUE_SIZE = 100;

// ─── Client Classification & Command Validation ──────────────────────────

function getPluginClient(channelName: string): ServerWebSocket<any> | null {
  const clients = channels.get(channelName);
  if (!clients) return null;
  for (const client of clients) {
    if (pluginClients.has(client)) return client;
  }
  return null;
}

function validateCommand(data: any, channelName: string): string | null {
  // Stateful commands are ALWAYS blocked regardless of agent count.
  // This prevents page-context conflicts between concurrent callers (sub-agents
  // sharing one MCP, team agents with separate MCPs, or any future multi-client scenario).
  const command = data.message?.command;
  const params = data.message?.params;

  if (BLOCKED_COMMANDS.has(command)) {
    return `"${command}" is a stateful command and is not allowed through the relay server. ` +
      `Instead, use the parentId parameter on creation commands to target a specific page or frame. ` +
      `Call get_pages to discover page node IDs, then pass the desired page ID as parentId.`;
  }

  if (CREATION_COMMANDS.has(command) && !params?.parentId) {
    return `"${command}" requires a parentId parameter. ` +
      `Pass the target page or frame node ID as parentId to specify where the element should be created. ` +
      `Call get_pages to discover available page IDs.`;
  }

  return null; // Valid
}

function classifyClient(ws: ServerWebSocket<any>, data: any): void {
  // Already classified
  if (pluginClients.has(ws) || agentClients.has(ws)) return;

  // Plugin sends responses (result/error fields) — it never sends commands
  if (data.message?.result !== undefined || data.message?.error !== undefined) {
    pluginClients.add(ws);
    logger.info(`Client ${ws.data?.clientId} classified as Figma plugin`);
    return;
  }

  // Agent sends commands (command field in message)
  if (data.message?.command) {
    agentClients.add(ws);
    logger.info(`Client ${ws.data?.clientId} classified as MCP agent`);
    return;
  }
}

// ─── Queue Processing ──────────────────────────────────────────────────────

function ensureQueueState(channelName: string): ChannelQueueState {
  if (!channelQueues.has(channelName)) {
    channelQueues.set(channelName, { queue: [], isProcessing: false });
  }
  return channelQueues.get(channelName)!;
}

function enqueueCommand(data: any, ws: ServerWebSocket<any>, channelName: string): void {
  const requestId = data.message?.id;
  if (!requestId) {
    logger.warn("Command missing message.id, cannot queue");
    return;
  }

  const queueState = ensureQueueState(channelName);

  // Check queue size limit
  if (queueState.queue.length >= MAX_QUEUE_SIZE) {
    ws.send(JSON.stringify({
      type: "broadcast",
      message: {
        id: requestId,
        error: `Command queue is full (${MAX_QUEUE_SIZE} pending commands). Wait for existing commands to complete.`,
      },
      sender: "You",
      channel: channelName,
    }));
    stats.queueRejections++;
    stats.messagesSent++;
    return;
  }

  // Track sender for unicast response routing
  requestToClient.set(requestId, { ws, timestamp: Date.now() });

  queueState.queue.push({
    data,
    senderWs: ws,
    requestId,
    enqueuedAt: Date.now(),
  });
  stats.queuedCommands++;

  // Track max depth
  if (queueState.queue.length > stats.queueDepthMax) {
    stats.queueDepthMax = queueState.queue.length;
  }

  const depth = queueState.queue.length;
  if (depth > 50) {
    logger.warn(`Queue depth warning: ${depth} commands pending in channel ${channelName}`);
  }

  processQueue(channelName);
}

function processQueue(channelName: string): void {
  const queueState = channelQueues.get(channelName);
  if (!queueState || queueState.isProcessing || queueState.queue.length === 0) return;

  queueState.isProcessing = true;
  const item = queueState.queue.shift()!;

  // Forward command to the Figma plugin.
  // If a classified plugin exists, send directly to it. Otherwise, forward to all
  // non-agent clients (bootstrap case: plugin hasn't been classified yet because
  // classification requires seeing a response, which requires receiving a command first).
  // Non-plugin clients (e.g., MCP) will simply ignore the message (no matching pending request).
  const pluginClient = getPluginClient(channelName);
  const payload = JSON.stringify({
    type: "broadcast",
    message: item.data.message,
    sender: "User",
    channel: channelName,
  });

  let forwarded = false;
  if (pluginClient && pluginClient.readyState === WebSocket.OPEN) {
    // Classified plugin found — send directly
    try {
      pluginClient.send(payload);
      stats.messagesSent++;
      forwarded = true;
    } catch (error) {
      logger.error(`Failed to forward command to plugin:`, error);
      stats.errors++;
    }
  } else {
    // No classified plugin — forward to all non-agent clients (bootstrap fallback)
    const clients = channels.get(channelName);
    if (clients) {
      for (const client of clients) {
        if (!agentClients.has(client) && client.readyState === WebSocket.OPEN) {
          try {
            client.send(payload);
            stats.messagesSent++;
            forwarded = true;
          } catch (error) {
            logger.error(`Failed to forward command to non-agent client:`, error);
          }
        }
      }
    }
  }

  if (!forwarded) {
    // No plugin connected — reject the command
    logger.warn(`No plugin client in channel ${channelName}, rejecting queued command`);
    if (item.senderWs.readyState === WebSocket.OPEN) {
      item.senderWs.send(JSON.stringify({
        type: "broadcast",
        message: { id: item.requestId, error: "No Figma plugin connected to this channel" },
        sender: "You",
        channel: channelName,
      }));
      stats.messagesSent++;
    }
    requestToClient.delete(item.requestId);
    queueState.isProcessing = false;
    // Use setTimeout to avoid stack overflow when draining large queues without a plugin
    setTimeout(() => processQueue(channelName), 0);
    return;
  }

  // Track current command for timeout/disconnect handling
  queueState.currentRequestId = item.requestId;

  // Start per-command timeout (safety net if plugin hangs)
  queueState.currentCommandTimeout = setTimeout(() => {
    // Guard: verify this timeout is still for the current in-flight command.
    // If handleResponseFromPlugin already processed this request, currentRequestId
    // will have been cleared — skip to avoid double-dequeue.
    if (queueState.currentRequestId !== item.requestId) return;

    logger.warn(`Command ${item.requestId} timed out after ${COMMAND_TIMEOUT_MS}ms in channel ${channelName}`);
    // Send timeout error to the requesting agent
    const entry = requestToClient.get(item.requestId);
    if (entry && entry.ws.readyState === WebSocket.OPEN) {
      try {
        entry.ws.send(JSON.stringify({
          type: "broadcast",
          message: { id: item.requestId, error: "Command timed out waiting for Figma plugin response" },
          sender: "User",
          channel: channelName,
        }));
        stats.messagesSent++;
      } catch (e) {
        logger.error(`Failed to send timeout error:`, e);
      }
    }
    requestToClient.delete(item.requestId);
    // Unblock queue
    queueState.isProcessing = false;
    queueState.currentCommandTimeout = undefined;
    queueState.currentRequestId = undefined;
    processQueue(channelName);
  }, COMMAND_TIMEOUT_MS);

  // Echo back to sender (for command echo filtering in websocket.ts)
  if (item.senderWs.readyState === WebSocket.OPEN) {
    try {
      item.senderWs.send(JSON.stringify({
        type: "broadcast",
        message: item.data.message,
        sender: "You",
        channel: channelName,
      }));
      stats.messagesSent++;
    } catch (error) {
      logger.error(`Failed to send command echo to sender:`, error);
    }
  }

  // Send queue position updates to all waiting agents
  queueState.queue.forEach((waiting, index) => {
    if (waiting.senderWs.readyState === WebSocket.OPEN) {
      try {
        waiting.senderWs.send(JSON.stringify({
          type: "queue_position",
          id: waiting.requestId,
          position: index + 1,
          queueSize: queueState.queue.length,
          message: {
            data: {
              status: "queued",
              progress: 0,
              message: `Queued at position ${index + 1} of ${queueState.queue.length}`,
            },
          },
        }));
        stats.messagesSent++;
      } catch (error) {
        logger.error(`Failed to send queue position update:`, error);
      }
    }
  });
}

function handleResponseFromPlugin(data: any, channelName: string): void {
  const responseId = data.message?.id;
  const entry = responseId ? requestToClient.get(responseId) : null;

  if (entry && entry.ws.readyState === WebSocket.OPEN) {
    // Unicast: send ONLY to the requesting agent
    try {
      entry.ws.send(JSON.stringify({
        type: "broadcast",
        message: data.message,
        sender: "User",
        channel: channelName,
      }));
      stats.unicastResponses++;
      stats.messagesSent++;
    } catch (error) {
      logger.error(`Failed to unicast response:`, error);
      stats.errors++;
    }
    requestToClient.delete(responseId);
  } else {
    // Sender disconnected or untracked response — discard to avoid confusing other agents
    if (responseId) {
      logger.info(`Discarding orphaned response for request ${responseId} (sender disconnected)`);
      requestToClient.delete(responseId);
    } else {
      logger.info(`Discarding untracked response (no request ID)`);
    }
    stats.discardedResponses++;
  }

  // Only unblock queue if this response matches the in-flight command.
  // Guards against stale responses (e.g., timeout already fired and dequeued next)
  // which would otherwise double-dequeue and break FIFO invariant.
  const queueState = channelQueues.get(channelName);
  if (queueState && responseId && responseId === queueState.currentRequestId) {
    if (queueState.currentCommandTimeout) {
      clearTimeout(queueState.currentCommandTimeout);
      queueState.currentCommandTimeout = undefined;
    }
    queueState.currentRequestId = undefined;
    queueState.isProcessing = false;
    processQueue(channelName);
  }
}

// ─── Cleanup ───────────────────────────────────────────────────────────────

function cleanupClient(ws: ServerWebSocket<any>, clientChannels: string[] = []): void {
  const isPlugin = pluginClients.has(ws);

  // If the disconnecting client is the plugin, flush the in-flight command
  // Scoped to channels this plugin was actually in (prevents aborting other channels)
  if (isPlugin) {
    const channelsToCheck = clientChannels.length > 0
      ? clientChannels
      : Array.from(channelQueues.keys()); // Fallback: check all (shouldn't happen)

    for (const channelName of channelsToCheck) {
      const queueState = channelQueues.get(channelName);
      if (!queueState) continue;

      if (queueState.isProcessing && queueState.currentRequestId) {
        const requestId = queueState.currentRequestId;
        logger.warn(`Plugin disconnected while command ${requestId} was in-flight on channel ${channelName}`);

        // Clear the command timeout
        if (queueState.currentCommandTimeout) {
          clearTimeout(queueState.currentCommandTimeout);
          queueState.currentCommandTimeout = undefined;
        }

        // Send error to the requesting agent
        const entry = requestToClient.get(requestId);
        if (entry && entry.ws.readyState === WebSocket.OPEN) {
          try {
            entry.ws.send(JSON.stringify({
              type: "broadcast",
              message: { id: requestId, error: "Figma plugin disconnected while processing command" },
              sender: "User",
              channel: channelName,
            }));
            stats.messagesSent++;
          } catch (e) {
            logger.error(`Failed to send plugin disconnect error:`, e);
          }
        }
        requestToClient.delete(requestId);

        // Unblock queue and drain remaining items (they'll fail with "No plugin connected")
        // Use setTimeout to avoid stack overflow when draining large queues
        queueState.isProcessing = false;
        queueState.currentRequestId = undefined;
        setTimeout(() => processQueue(channelName), 0);
      }
    }
  }

  // Clean up requestToClient entries for this client (agent disconnect case)
  if (!isPlugin) {
    for (const [requestId, entry] of requestToClient.entries()) {
      if (entry.ws === ws) {
        requestToClient.delete(requestId);
      }
    }
  }

  // Clean up queued commands from this client
  for (const [channelName, queueState] of channelQueues.entries()) {
    const before = queueState.queue.length;
    queueState.queue = queueState.queue.filter(item => {
      if (item.senderWs === ws) {
        logger.info(`Removing queued command ${item.requestId} from disconnected client`);
        requestToClient.delete(item.requestId);
        return false;
      }
      return true;
    });
    const removed = before - queueState.queue.length;
    if (removed > 0) {
      logger.info(`Cleaned up ${removed} queued commands from disconnected client in channel ${channelName}`);
    }
  }

  // Remove from role tracking
  agentClients.delete(ws);
  pluginClients.delete(ws);
}

// Periodic stale request cleanup (every 5 minutes)
setInterval(() => {
  const maxAge = 10 * 60 * 1000; // 10 minutes
  const now = Date.now();
  let cleaned = 0;
  for (const [requestId, entry] of requestToClient.entries()) {
    if (now - entry.timestamp > maxAge) {
      requestToClient.delete(requestId);
      cleaned++;
    }
  }
  if (cleaned > 0) {
    stats.cleanedStaleRequests += cleaned;
    logger.warn(`Cleaned up ${cleaned} stale request entries (age > 10 min)`);
  }
}, 5 * 60 * 1000);

// ─── Connection Handling ───────────────────────────────────────────────────

function handleConnection(ws: ServerWebSocket<any>) {
  stats.totalConnections++;
  stats.activeConnections++;

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  ws.data = { clientId };

  logger.info(`New client connected: ${clientId}`);

  try {
    ws.send(JSON.stringify({
      type: "system",
      message: "Please join a channel to start communicating with Figma",
    }));
  } catch (error) {
    logger.error(`Failed to send welcome message to client ${clientId}:`, error);
    stats.errors++;
  }
}

// ─── Server ────────────────────────────────────────────────────────────────

const server = Bun.serve({
  port: 3055,
  // uncomment this to allow connections in windows wsl
  // hostname: "0.0.0.0",
  fetch(req: Request, server: Server) {
    const url = new URL(req.url);

    logger.debug(`Received ${req.method} request to ${url.pathname}`);

    // Handle CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type, Authorization",
        },
      });
    }

    // Handle status endpoint
    if (url.pathname === "/status") {
      return new Response(JSON.stringify({
        status: "running",
        uptime: process.uptime(),
        stats,
        queue: {
          channels: Array.from(channelQueues.entries()).map(([name, state]) => ({
            channel: name,
            queueDepth: state.queue.length,
            isProcessing: state.isProcessing,
          })),
          pendingRequests: requestToClient.size,
          agentCount: agentClients.size,
          pluginCount: pluginClients.size,
        },
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Handle WebSocket upgrade
    try {
      const success = server.upgrade(req, {
        headers: {
          "Access-Control-Allow-Origin": "*",
        },
      });

      if (success) {
        return; // Upgraded to WebSocket
      }
    } catch (error) {
      logger.error("Failed to upgrade WebSocket connection:", error);
      stats.errors++;
      return new Response("Failed to upgrade to WebSocket", { status: 500 });
    }

    return new Response("Claude to Figma WebSocket server running. Try connecting with a WebSocket client.", {
      headers: {
        "Content-Type": "text/plain",
        "Access-Control-Allow-Origin": "*",
      },
    });
  },
  websocket: {
    open: handleConnection,
    message(ws: ServerWebSocket<any>, message: string | Buffer) {
      try {
        stats.messagesReceived++;
        const clientId = ws.data?.clientId || "unknown";

        logger.debug(`Received message from client ${clientId}:`, typeof message === 'string' ? message : '<binary>');
        const data = JSON.parse(message as string);

        // ─── Join ──────────────────────────────────────────────────────
        if (data.type === "join") {
          const channelName = data.channel;
          if (!channelName || typeof channelName !== "string") {
            logger.warn(`Client ${clientId} attempted to join without a valid channel name`);
            ws.send(JSON.stringify({
              type: "error",
              message: "Channel name is required"
            }));
            stats.messagesSent++;
            return;
          }

          // Session deduplication: if this client sends a sessionId (MCP agents do),
          // close the previous connection with the same sessionId to prevent stale
          // connections from polluting routing when an agent reconnects (e.g., after compaction).
          const sessionId = data.sessionId;
          if (sessionId && typeof sessionId === "string") {
            const oldWs = sessionToClient.get(sessionId);
            if (oldWs && oldWs !== ws) {
              logger.info(`Session ${sessionId} reconnected (client ${clientId}). Closing stale connection.`);
              // Clean up the old connection's state before closing
              const oldChannels: string[] = [];
              channels.forEach((clients, ch) => {
                if (clients.has(oldWs)) oldChannels.push(ch);
              });
              channels.forEach((clients) => clients.delete(oldWs));
              cleanupClient(oldWs, oldChannels);
              try { oldWs.close(1000, "Replaced by reconnecting session"); } catch {}
              stats.activeConnections--;
            }
            sessionToClient.set(sessionId, ws);
            ws.data.sessionId = sessionId;
          }

          // Create channel if it doesn't exist
          if (!channels.has(channelName)) {
            logger.info(`Creating new channel: ${channelName}`);
            channels.set(channelName, new Set());
          }

          // Add client to channel
          const channelClients = channels.get(channelName)!;
          channelClients.add(ws);
          logger.info(`Client ${clientId} joined channel: ${channelName}`);

          // Notify client they joined successfully
          try {
            ws.send(JSON.stringify({
              type: "system",
              message: `Joined channel: ${channelName}`,
              channel: channelName
            }));
            stats.messagesSent++;

            ws.send(JSON.stringify({
              type: "system",
              message: {
                id: data.id,
                result: "Connected to channel: " + channelName,
              },
              channel: channelName
            }));
            stats.messagesSent++;

            logger.debug(`Connection confirmation sent to client ${clientId} for channel ${channelName}`);
          } catch (error) {
            logger.error(`Failed to send join confirmation to client ${clientId}:`, error);
            stats.errors++;
          }

          // Notify other clients in channel
          try {
            let notificationCount = 0;
            channelClients.forEach((client) => {
              if (client !== ws && client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "system",
                  message: "A new client has joined the channel",
                  channel: channelName
                }));
                stats.messagesSent++;
                notificationCount++;
              }
            });
            if (notificationCount > 0) {
              logger.debug(`Notified ${notificationCount} other clients in channel ${channelName}`);
            }
          } catch (error) {
            logger.error(`Error notifying channel about new client:`, error);
            stats.errors++;
          }

          return;
        }

        // ─── Regular Messages (Commands & Responses) ───────────────────
        if (data.type === "message") {
          const channelName = data.channel;
          if (!channelName || typeof channelName !== "string") {
            logger.warn(`Client ${clientId} sent message without a valid channel name`);
            ws.send(JSON.stringify({
              type: "error",
              message: "Channel name is required"
            }));
            stats.messagesSent++;
            return;
          }

          const channelClients = channels.get(channelName);
          if (!channelClients || !channelClients.has(ws)) {
            logger.warn(`Client ${clientId} attempted to send to channel ${channelName} without joining first`);
            ws.send(JSON.stringify({
              type: "error",
              message: "You must join the channel first"
            }));
            stats.messagesSent++;
            return;
          }

          // Classify client on first message
          classifyClient(ws, data);

          // Check if this is a command from an agent (has command field)
          const isCommand = !!data.message?.command;

          // Check if this is a response from the plugin (has result or error)
          const isResponse = data.message?.result !== undefined || data.message?.error !== undefined;

          if (isResponse) {
            // Response from Figma plugin → route via unicast
            handleResponseFromPlugin(data, channelName);
            return;
          }

          if (isCommand) {
            // Command from an agent → validate & queue

            // Command validation (parentId required, stateful commands blocked)
            const validationError = validateCommand(data, channelName);
            if (validationError) {
              ws.send(JSON.stringify({
                type: "broadcast",
                message: { id: data.message.id, error: validationError },
                sender: "You",
                channel: channelName,
              }));
              stats.blockedCommands++;
              stats.messagesSent++;
              return;
            }

            // Enqueue the command
            enqueueCommand(data, ws, channelName);
            return;
          }

          // Fallback: non-command, non-response messages (e.g., ping) → broadcast
          try {
            let broadcastCount = 0;
            channelClients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "broadcast",
                  message: data.message,
                  sender: client === ws ? "You" : "User",
                  channel: channelName
                }));
                stats.messagesSent++;
                broadcastCount++;
              }
            });
            logger.debug(`Broadcasted non-command message to ${broadcastCount} clients in channel ${channelName}`);
          } catch (error) {
            logger.error(`Error broadcasting message to channel ${channelName}:`, error);
            stats.errors++;
          }
        }

        // ─── Progress Updates ──────────────────────────────────────────
        if (data.type === "progress_update") {
          const channelName = data.channel;
          if (!channelName || typeof channelName !== "string") {
            logger.warn(`Client ${clientId} sent progress update without a valid channel name`);
            return;
          }

          const channelClients = channels.get(channelName);
          if (!channelClients) {
            logger.warn(`Progress update for non-existent channel: ${channelName}`);
            return;
          }

          logger.debug(`Progress update for command ${data.id} in channel ${channelName}: ${data.message?.data?.status || 'unknown'} - ${data.message?.data?.progress || 0}%`);

          // Route progress update to the requesting agent (unicast) if tracked
          const requestId = data.id;
          const entry = requestId ? requestToClient.get(requestId) : null;

          if (entry && entry.ws.readyState === WebSocket.OPEN) {
            // Unicast progress to the requesting agent only
            try {
              entry.ws.send(JSON.stringify(data));
              stats.messagesSent++;
            } catch (error) {
              logger.error(`Failed to unicast progress update:`, error);
            }
          } else {
            // Fallback: broadcast to all (legacy behavior)
            try {
              channelClients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(JSON.stringify(data));
                  stats.messagesSent++;
                }
              });
            } catch (error) {
              logger.error(`Error broadcasting progress update:`, error);
              stats.errors++;
            }
          }
        }

      } catch (err) {
        stats.errors++;
        logger.error("Error handling message:", err);
        try {
          ws.send(JSON.stringify({
            type: "error",
            message: "Error processing your message: " + (err instanceof Error ? err.message : String(err))
          }));
          stats.messagesSent++;
        } catch (sendError) {
          logger.error("Failed to send error message to client:", sendError);
        }
      }
    },
    close(ws: ServerWebSocket<any>, code: number, reason: string) {
      const clientId = ws.data?.clientId || "unknown";
      logger.info(`WebSocket closed for client ${clientId}: Code ${code}, Reason: ${reason || 'No reason provided'}`);

      // Collect channels this client was in BEFORE removal (needed for plugin disconnect scoping)
      const clientChannels: string[] = [];
      channels.forEach((clients, channelName) => {
        if (clients.has(ws)) clientChannels.push(channelName);
      });

      // Remove client from their channel
      channels.forEach((clients, channelName) => {
        if (clients.delete(ws)) {
          logger.debug(`Removed client ${clientId} from channel ${channelName} due to connection close`);

          // Notify other clients in same channel
          try {
            clients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                client.send(JSON.stringify({
                  type: "system",
                  message: "A client has left the channel",
                  channel: channelName
                }));
                stats.messagesSent++;
              }
            });
          } catch (error) {
            logger.error(`Error notifying channel ${channelName} about client disconnect:`, error);
            stats.errors++;
          }

          // Clean up empty channels
          if (clients.size === 0) {
            channels.delete(channelName);
            channelQueues.delete(channelName);
            logger.debug(`Cleaned up empty channel: ${channelName}`);
          }
        }
      });

      // Clean up queue & routing state for this client
      cleanupClient(ws, clientChannels);

      // Clean up session deduplication entry (only if this ws is the current holder)
      if (ws.data?.sessionId) {
        const currentHolder = sessionToClient.get(ws.data.sessionId);
        if (currentHolder === ws) {
          sessionToClient.delete(ws.data.sessionId);
        }
      }

      stats.activeConnections--;
    },
    drain(ws: ServerWebSocket<any>) {
      const clientId = ws.data?.clientId || "unknown";
      logger.debug(`WebSocket backpressure relieved for client ${clientId}`);
    }
  }
});

logger.info(`Claude to Figma WebSocket server running on port ${server.port}`);
logger.info(`Status endpoint available at http://localhost:${server.port}/status`);

// Print server stats every 5 minutes
setInterval(() => {
  logger.info("Server stats:", {
    channels: channels.size,
    ...stats,
    queueState: Array.from(channelQueues.entries()).map(([name, state]) => ({
      channel: name,
      depth: state.queue.length,
      processing: state.isProcessing,
    })),
  });
}, 5 * 60 * 1000);
