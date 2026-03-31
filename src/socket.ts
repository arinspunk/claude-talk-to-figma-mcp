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

// Session registry — tracks Figma plugin sessions with metadata
interface FigmaSession {
  channel: string;
  documentName: string;
  pageName: string;
  registeredAt: number;
  lastHeartbeat: number;
  clientId: string;
}
const sessions = new Map<string, FigmaSession>();

// Clean up stale sessions every 60s
setInterval(() => {
  const now = Date.now();
  sessions.forEach((session, channel) => {
    if (now - session.lastHeartbeat > 120_000) {
      logger.info(`Removing stale session for channel ${channel} (document: "${session.documentName}")`);
      sessions.delete(channel);
    }
  });
}, 60_000);

// Keep track of channel statistics
const stats = {
  totalConnections: 0,
  activeConnections: 0,
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0
};

function handleConnection(ws: ServerWebSocket<any>) {
  // Track connection statistics
  stats.totalConnections++;
  stats.activeConnections++;
  
  // Assign a unique client ID for better tracking
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  ws.data = { clientId };
  
  // Don't add to clients immediately - wait for channel join
  logger.info(`New client connected: ${clientId}`);

  // Send welcome message to the new client
  try {
    ws.send(JSON.stringify({
      type: "system",
      message: "Please join a channel to start communicating with Figma",
    }));
  } catch (error) {
    logger.error(`Failed to send welcome message to client ${clientId}:`, error);
    stats.errors++;
  }

  ws.close = () => {
    logger.info(`Client disconnected: ${clientId}`);
    stats.activeConnections--;

    // Remove client from their channel
    channels.forEach((clients, channelName) => {
      if (clients.has(ws)) {
        clients.delete(ws);
        logger.debug(`Removed client ${clientId} from channel: ${channelName}`);

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
      }
    });
  };
}

const server = Bun.serve({
  port: 3055,
  // uncomment this to allow connections in windows wsl
  // hostname: "0.0.0.0",
  fetch(req: Request, server: Server) {
    const url = new URL(req.url);
    
    // Log incoming requests
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
        stats
      }), {
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }

    // Handle sessions endpoint — list active Figma plugin sessions
    if (url.pathname === "/sessions") {
      const sessionList = Array.from(sessions.values()).map(s => ({
        channel: s.channel,
        documentName: s.documentName,
        pageName: s.pageName,
        registeredAt: s.registeredAt,
        lastHeartbeat: s.lastHeartbeat,
      }));
      return new Response(JSON.stringify(sessionList), {
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

    // Return response for non-WebSocket requests
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

        // Handle session registration from Figma plugins
        if (data.type === "register") {
          const channelName = data.channel;
          const metadata = data.metadata || {};
          if (channelName && typeof channelName === "string") {
            const now = Date.now();
            sessions.set(channelName, {
              channel: channelName,
              documentName: metadata.documentName || "Unknown",
              pageName: metadata.pageName || "Unknown",
              registeredAt: sessions.get(channelName)?.registeredAt || now,
              lastHeartbeat: now,
              clientId,
            });
            logger.info(`Session registered for channel ${channelName}: "${metadata.documentName}" / "${metadata.pageName}"`);
          }
          return;
        }

        // Handle heartbeat from Figma plugins
        if (data.type === "heartbeat") {
          const channelName = data.channel;
          if (channelName && sessions.has(channelName)) {
            sessions.get(channelName)!.lastHeartbeat = Date.now();
          }
          return;
        }

        // Handle regular messages
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

          // Broadcast to all clients in the channel
          try {
            let broadcastCount = 0;
            channelClients.forEach((client) => {
              if (client.readyState === WebSocket.OPEN) {
                logger.debug(`Broadcasting message to client in channel ${channelName}`);
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
            logger.info(`Broadcasted message to ${broadcastCount} clients in channel ${channelName}`);
          } catch (error) {
            logger.error(`Error broadcasting message to channel ${channelName}:`, error);
            stats.errors++;
          }
        }
        
        // Handle progress updates
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
          
          // Broadcast progress update to all clients in the channel
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
        
      } catch (err) {
        stats.errors++;
        logger.error("Error handling message:", err);
        try {
          // Send error back to client
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

      // Remove client from their channel and clean up sessions
      channels.forEach((clients, channelName) => {
        if (clients.delete(ws)) {
          logger.debug(`Removed client ${clientId} from channel ${channelName} due to connection close`);
          // Remove session if this was the registering client
          const session = sessions.get(channelName);
          if (session && session.clientId === clientId) {
            sessions.delete(channelName);
            logger.info(`Removed session for channel ${channelName} (client disconnected)`);
          }
        }
      });

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
    ...stats
  });
}, 5 * 60 * 1000);
