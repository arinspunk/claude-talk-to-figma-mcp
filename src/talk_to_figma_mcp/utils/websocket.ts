import WebSocket from "ws";
import { v4 as uuidv4 } from "uuid";
import { logger, truncateForLog } from "./logger";
import { serverUrl, defaultPort, WS_URL, reconnectInterval } from "../config/config";
import { FigmaCommand, PendingRequest, RelayMessage } from "../types";

// WebSocket connection and request tracking
let ws: WebSocket | null = null;
let currentChannel: string | null = null;

// Zero-config sentinel channel. When the MCP is joined to this channel, the relay
// transparently routes commands to the single connected Figma plugin — no manual
// channel handshake required. A manual join_channel() call overrides this.
export const AUTO_CHANNEL = "__auto__";

// Stable session ID for this MCP process — survives reconnections.
// Sent in join messages so the server can deduplicate reconnecting agents
// (e.g., after context compaction) instead of counting them as separate agents.
const SESSION_ID = `mcp_${process.pid}_${Date.now()}`;

// Map of pending requests for promise tracking
const pendingRequests = new Map<string, PendingRequest>();

// Reconnect state: attempts since the last successful connection.
// Drives true exponential backoff (reset to 0 on every successful open).
let reconnectAttempts = 0;
const MAX_BACKOFF_MS = 30000;

// How long a command will wait for the connection + channel join to come up
// before failing (instead of rejecting immediately while a reconnect is in flight).
const CONNECTION_WAIT_MS = 15000;

/**
 * Connects to the Figma server via WebSocket.
 * @param port - Optional port for the connection (defaults to defaultPort from config)
 */
export function connectToFigma(port: number = defaultPort) {
  // If already connected, do nothing
  if (ws && ws.readyState === WebSocket.OPEN) {
    logger.info('Already connected to Figma');
    return;
  }

  // If connection is in progress (CONNECTING state), wait
  if (ws && ws.readyState === WebSocket.CONNECTING) {
    logger.info('Connection to Figma is already in progress');
    return;
  }

  // If there's an existing socket in a closing state, clean it up
  if (ws && (ws.readyState === WebSocket.CLOSING || ws.readyState === WebSocket.CLOSED)) {
    ws.removeAllListeners();
    ws = null;
  }

  const wsUrl = serverUrl === 'localhost' ? `${WS_URL}:${port}` : WS_URL;
  logger.info(`Connecting to Figma socket server at ${wsUrl}...`);
  
  try {
    ws = new WebSocket(wsUrl);
    
    // Add connection timeout
    const connectionTimeout = setTimeout(() => {
      if (ws && ws.readyState === WebSocket.CONNECTING) {
        logger.error('Connection to Figma timed out');
        ws.terminate();
      }
    }, 10000); // 10 second connection timeout
    
    ws.on('open', () => {
      clearTimeout(connectionTimeout);
      reconnectAttempts = 0;
      logger.info('Connected to Figma socket server');
      // Zero-config: auto-join the sentinel channel so Figma tool calls work
      // immediately without a manual join_channel handshake. If the user had
      // manually joined a named channel before a reconnect, restore that instead.
      const previous = currentChannel;
      currentChannel = null;
      const channelToJoin = previous && previous !== AUTO_CHANNEL ? previous : AUTO_CHANNEL;
      autoJoinChannel(channelToJoin);
    });

    ws.on("message", (data: any) => {
      try {
        const json = JSON.parse(data) as RelayMessage;

        // Handle queue position updates from server-side command queue
        if (json.type === 'queue_position') {
          const queueRequestId = json.id;
          if (queueRequestId && pendingRequests.has(queueRequestId)) {
            const request = pendingRequests.get(queueRequestId)!;
            request.lastActivity = Date.now();
            // Re-arm the caller's own inactivity budget — replacing it with a
            // fixed long timeout would stretch short-timeout calls (e.g. 15s
            // resource reads) to minutes whenever the queue is non-empty.
            clearTimeout(request.timeout);
            request.timeout = setTimeout(() => {
              if (pendingRequests.has(queueRequestId)) {
                logger.error(`Request ${queueRequestId} timed out while queued`);
                pendingRequests.delete(queueRequestId);
                request.reject(new Error('Request to Figma timed out while queued'));
              }
            }, request.timeoutMs);
          }
          return;
        }

        // Handle progress updates
        if (json.type === 'progress_update') {
          const progressData = json.message.data;
          const requestId = json.id || '';

          if (requestId && pendingRequests.has(requestId)) {
            const request = pendingRequests.get(requestId)!;

            // Update last activity timestamp
            request.lastActivity = Date.now();

            // Reset the timeout to prevent timeouts during long-running operations:
            // each progress update grants the caller's own inactivity budget again
            // (never more than the caller asked for in the first place).
            clearTimeout(request.timeout);
            request.timeout = setTimeout(() => {
              if (pendingRequests.has(requestId)) {
                logger.error(`Request ${requestId} timed out after extended period of inactivity`);
                pendingRequests.delete(requestId);
                request.reject(new Error('Request to Figma timed out'));
              }
            }, request.timeoutMs);

            // Log progress
            logger.info(`Progress update for ${progressData.commandType}: ${progressData.progress}% - ${progressData.message}`);

            // For completed updates, we could resolve the request early if desired
            if (progressData.status === 'completed' && progressData.progress === 100) {
              // Optionally resolve early with partial data
              // request.resolve(progressData.payload);
              // pendingRequests.delete(requestId);

              // Instead, just log the completion, wait for final result from Figma
              logger.info(`Operation ${progressData.commandType} completed, waiting for final result`);
            }
          }
          return;
        }

        // The relay never sends protocol pings to agents, but stay defensive.
        if (json.type === 'ping' || json.type === 'pong') {
          return;
        }

        // Handle regular responses (system / error / broadcast frames)
        const myResponse = json.message;

        // Plain informational strings ("Please join a channel…") need no routing.
        if (typeof myResponse === 'string') {
          logger.debug(() => `Relay says: ${myResponse}`);
          return;
        }

        logger.debug(() => `Received message: ${truncateForLog(myResponse)}`);

        // Skip command echoes (own messages broadcast back to sender)
        if (myResponse.command) {
          return;
        }

        // Handle response to a request (success or error)
        if (
          myResponse.id &&
          pendingRequests.has(myResponse.id)
        ) {
          const request = pendingRequests.get(myResponse.id)!;
          clearTimeout(request.timeout);

          // Check for error at root level or nested inside result
          const error = myResponse.error ?? (myResponse.result && myResponse.result.error);

          if (error) {
            logger.error(`Error from Figma: ${error}`);
            request.reject(new Error(String(error)));
          } else {
            request.resolve(myResponse.result ?? myResponse);
          }

          pendingRequests.delete(myResponse.id);
        } else {
          // Handle broadcast messages or events (truncated: orphaned responses
          // can carry full image payloads)
          logger.info(() => `Received broadcast message: ${truncateForLog(myResponse)}`);
        }
      } catch (error) {
        logger.error(`Error parsing message: ${error instanceof Error ? error.message : String(error)}`);
      }
    });

    ws.on('error', (error) => {
      logger.error(`Socket error: ${error}`);
      // Don't attempt to reconnect here, let the close handler do it
    });

    ws.on('close', (code, reason) => {
      clearTimeout(connectionTimeout);
      logger.info(`Disconnected from Figma socket server with code ${code} and reason: ${reason || 'No reason provided'}`);
      ws = null;

      // Reject all pending requests
      for (const [id, request] of pendingRequests.entries()) {
        clearTimeout(request.timeout);
        request.reject(new Error(`Connection closed with code ${code}: ${reason || 'No reason provided'}`));
        pendingRequests.delete(id);
      }

      // Attempt to reconnect with exponential backoff + jitter
      reconnectAttempts++;
      const base = Math.min(MAX_BACKOFF_MS, reconnectInterval * Math.pow(1.5, reconnectAttempts - 1));
      const backoff = Math.min(MAX_BACKOFF_MS, Math.round(base * (1 + 0.25 * Math.random())));
      logger.info(`Attempting to reconnect in ${backoff / 1000} seconds (attempt ${reconnectAttempts})...`);
      setTimeout(() => connectToFigma(port), backoff);
    });
    
  } catch (error) {
    logger.error(`Failed to create WebSocket connection: ${error instanceof Error ? error.message : String(error)}`);
    // Attempt to reconnect after a delay
    setTimeout(() => connectToFigma(port), reconnectInterval);
  }
}

/**
 * Auto-join a channel without the strict plugin-verification ping.
 *
 * Used on (re)connect for zero-config routing: the agent just needs to be a
 * member of the channel on the relay. Unlike joinChannel(), this does NOT fail
 * when no plugin is present yet — the friendly "open the plugin" error is raised
 * later, by the relay, only when an actual command is issued.
 */
function autoJoinChannel(channelName: string): void {
  sendCommandToFigma("join", { channel: channelName })
    .then(() => {
      currentChannel = channelName;
      if (channelName === AUTO_CHANNEL) {
        logger.info("Zero-config routing active: Figma tools will target the single connected plugin");
      } else {
        logger.info(`Re-joined channel after reconnect: ${channelName}`);
      }
    })
    .catch((err) => {
      logger.warn(`Auto-join of channel "${channelName}" failed: ${err instanceof Error ? err.message : String(err)}`);
    });
}

/**
 * Join a specific channel in Figma.
 * @param channelName - Name of the channel to join
 * @returns Promise that resolves when successfully joined the channel
 */
export async function joinChannel(channelName: string): Promise<void> {
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    throw new Error("Not connected to Figma");
  }

  try {
    await sendCommandToFigma("join", { channel: channelName });
    currentChannel = channelName;

    try {
      await sendCommandToFigma("ping", {}, 12000);
      logger.info(`Joined channel: ${channelName}`);
    } catch (verificationError) {
      currentChannel = null;
      const errorMsg = verificationError instanceof Error
        ? verificationError.message
        : String(verificationError);
      logger.error(`Failed to verify channel ${channelName}: ${errorMsg}`);
      throw new Error(`Failed to verify connection to channel "${channelName}". The Figma plugin may not be connected to this channel.`);
    }
  } catch (error) {
    logger.error(`Failed to join channel: ${error instanceof Error ? error.message : String(error)}`);
    throw error;
  }
}

/**
 * Get the current channel the connection is joined to.
 * @returns The current channel name or null if not connected to any channel
 */
export function getCurrentChannel(): string | null {
  return currentChannel;
}

/**
 * Wait for the WebSocket connection (and channel join) to be ready.
 * Kicks off a connection attempt if none is in flight, then polls until the
 * socket is open and a channel is joined, or the wait times out.
 */
function waitForConnection(timeoutMs: number = CONNECTION_WAIT_MS): Promise<void> {
  if (ws && ws.readyState === WebSocket.OPEN && currentChannel) {
    return Promise.resolve();
  }

  connectToFigma();

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const poll = setInterval(() => {
      if (ws && ws.readyState === WebSocket.OPEN && currentChannel) {
        clearInterval(poll);
        resolve();
      } else if (Date.now() - start > timeoutMs) {
        clearInterval(poll);
        reject(new Error(
          "Could not connect to the Figma socket server. " +
          "Make sure the socket server is running and the Claude Talk to Figma plugin is open and connected."
        ));
      }
    }, 100);
  });
}

/**
 * Send a command to Figma via WebSocket.
 * If the connection is down (e.g., mid-reconnect), the command waits briefly
 * for the connection to come back instead of failing immediately.
 * @param command - The command to send
 * @param params - Additional parameters for the command
 * @param timeoutMs - Timeout in milliseconds before failing
 * @returns A promise that resolves with the Figma response
 */
export async function sendCommandToFigma(
  command: FigmaCommand,
  params: unknown = {},
  timeoutMs: number = 300000
): Promise<unknown> {
  if (command === "join") {
    // Joins are sent during connection setup, before any channel exists.
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectToFigma();
      throw new Error("Not connected to Figma. Attempting to connect...");
    }
  } else {
    // Hold the command until the connection + auto-join are ready (or time out).
    await waitForConnection();
  }

  return new Promise((resolve, reject) => {
    const id = uuidv4();
    const request = {
      id,
      type: command === "join" ? "join" : "message",
      ...(command === "join"
        ? { channel: (params as any).channel, sessionId: SESSION_ID, role: "agent" }
        : { channel: currentChannel }),
      message: {
        id,
        command,
        params: {
          ...(params as any),
          commandId: id, // Include the command ID in params
        },
      },
    };

    // Set timeout for request
    const timeout = setTimeout(() => {
      if (pendingRequests.has(id)) {
        pendingRequests.delete(id);
        logger.error(`Request ${id} to Figma timed out after ${timeoutMs / 1000} seconds`);
        reject(new Error('Request to Figma timed out'));
      }
    }, timeoutMs);

    // Store the promise callbacks to resolve/reject later
    pendingRequests.set(id, {
      resolve,
      reject,
      timeout,
      timeoutMs,
      lastActivity: Date.now()
    });

    // Send the request (re-check the socket: it may have dropped while waiting)
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      clearTimeout(timeout);
      pendingRequests.delete(id);
      reject(new Error("Connection to Figma was lost before the command could be sent"));
      return;
    }
    logger.info(`Sending command to Figma: ${command}`);
    logger.debug(() => `Request details: ${truncateForLog(request)}`);
    ws.send(JSON.stringify(request));
  });
}