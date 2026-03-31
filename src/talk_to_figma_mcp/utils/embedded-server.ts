import { createServer, IncomingMessage, ServerResponse } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { logger } from "./logger.js";

// Channel management
const channels = new Map<string, Set<WebSocket>>();

// Client metadata via WeakMap (ws doesn't have a .data property like Bun)
interface ClientMeta {
  clientId: string;
}
const clientMeta = new WeakMap<WebSocket, ClientMeta>();

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
      logger.info(`[WS-Server] Removing stale session for channel ${channel} (document: "${session.documentName}")`);
      sessions.delete(channel);
    }
  });
}, 60_000);

// Stats tracking
const stats = {
  totalConnections: 0,
  activeConnections: 0,
  messagesSent: 0,
  messagesReceived: 0,
  errors: 0,
};

let httpServer: ReturnType<typeof createServer> | null = null;
let wss: WebSocketServer | null = null;

function safeSend(ws: WebSocket, data: string): boolean {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
      stats.messagesSent++;
      return true;
    }
  } catch (error) {
    stats.errors++;
  }
  return false;
}

function getClientId(ws: WebSocket): string {
  return clientMeta.get(ws)?.clientId ?? "unknown";
}

function handleConnection(ws: WebSocket) {
  stats.totalConnections++;
  stats.activeConnections++;

  const clientId = `client_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  clientMeta.set(ws, { clientId });

  logger.info(`[WS-Server] Client connected: ${clientId}`);

  safeSend(ws, JSON.stringify({
    type: "system",
    message: "Please join a channel to start communicating with Figma",
  }));

  ws.on("message", (raw) => {
    try {
      stats.messagesReceived++;
      const data = JSON.parse(raw.toString());
      const cid = getClientId(ws);

      // --- JOIN ---
      if (data.type === "join") {
        const channelName = data.channel;
        if (!channelName || typeof channelName !== "string") {
          safeSend(ws, JSON.stringify({ type: "error", message: "Channel name is required" }));
          return;
        }

        if (!channels.has(channelName)) {
          channels.set(channelName, new Set());
        }

        const channelClients = channels.get(channelName)!;
        channelClients.add(ws);
        logger.info(`[WS-Server] Client ${cid} joined channel: ${channelName}`);

        safeSend(ws, JSON.stringify({
          type: "system",
          message: `Joined channel: ${channelName}`,
          channel: channelName,
        }));

        safeSend(ws, JSON.stringify({
          type: "system",
          message: {
            id: data.id,
            result: "Connected to channel: " + channelName,
          },
          channel: channelName,
        }));

        // Notify other clients in channel
        channelClients.forEach((client) => {
          if (client !== ws) {
            safeSend(client, JSON.stringify({
              type: "system",
              message: "A new client has joined the channel",
              channel: channelName,
            }));
          }
        });

        return;
      }

      // --- REGISTER ---
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
            clientId: cid,
          });
          logger.info(`[WS-Server] Session registered for channel ${channelName}: "${metadata.documentName}" / "${metadata.pageName}"`);
        }
        return;
      }

      // --- HEARTBEAT ---
      if (data.type === "heartbeat") {
        const channelName = data.channel;
        if (channelName && sessions.has(channelName)) {
          sessions.get(channelName)!.lastHeartbeat = Date.now();
        }
        return;
      }

      // --- MESSAGE ---
      if (data.type === "message") {
        const channelName = data.channel;
        if (!channelName || typeof channelName !== "string") {
          safeSend(ws, JSON.stringify({ type: "error", message: "Channel name is required" }));
          return;
        }

        const channelClients = channels.get(channelName);
        if (!channelClients || !channelClients.has(ws)) {
          safeSend(ws, JSON.stringify({ type: "error", message: "You must join the channel first" }));
          return;
        }

        channelClients.forEach((client) => {
          safeSend(client, JSON.stringify({
            type: "broadcast",
            message: data.message,
            sender: client === ws ? "You" : "User",
            channel: channelName,
          }));
        });

        return;
      }

      // --- PROGRESS UPDATE ---
      if (data.type === "progress_update") {
        const channelName = data.channel;
        if (!channelName || typeof channelName !== "string") return;

        const channelClients = channels.get(channelName);
        if (!channelClients) return;

        channelClients.forEach((client) => {
          safeSend(client, JSON.stringify(data));
        });

        return;
      }
    } catch (err) {
      stats.errors++;
      logger.error(`[WS-Server] Error handling message: ${err instanceof Error ? err.message : String(err)}`);
      safeSend(ws, JSON.stringify({
        type: "error",
        message: "Error processing your message: " + (err instanceof Error ? err.message : String(err)),
      }));
    }
  });

  ws.on("close", (code, _reason) => {
    const cid = getClientId(ws);
    logger.info(`[WS-Server] Client disconnected: ${cid} (code ${code})`);
    stats.activeConnections--;

    // Remove from all channels, clean up sessions, and notify peers
    channels.forEach((clients, channelName) => {
      if (clients.delete(ws)) {
        // Remove session if this was the registering client
        const session = sessions.get(channelName);
        if (session && session.clientId === cid) {
          sessions.delete(channelName);
          logger.info(`[WS-Server] Removed session for channel ${channelName} (client disconnected)`);
        }
        clients.forEach((client) => {
          safeSend(client, JSON.stringify({
            type: "system",
            message: "A client has left the channel",
            channel: channelName,
          }));
        });
      }
    });
  });

  ws.on("error", (err) => {
    stats.errors++;
    logger.error(`[WS-Server] Socket error for ${getClientId(ws)}: ${err.message}`);
  });
}

function handleHttpRequest(_req: IncomingMessage, res: ServerResponse) {
  const url = new URL(_req.url ?? "/", `http://${_req.headers.host ?? "localhost"}`);

  // CORS preflight
  if (_req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    res.end();
    return;
  }

  // Sessions endpoint — list active Figma plugin sessions
  if (url.pathname === "/sessions") {
    const sessionList = Array.from(sessions.values()).map(s => ({
      channel: s.channel,
      documentName: s.documentName,
      pageName: s.pageName,
      registeredAt: s.registeredAt,
      lastHeartbeat: s.lastHeartbeat,
    }));
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(sessionList));
    return;
  }

  // Status endpoint
  if (url.pathname === "/status") {
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify({
      status: "running",
      embedded: true,
      uptime: process.uptime(),
      channels: channels.size,
      stats,
    }));
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/plain",
    "Access-Control-Allow-Origin": "*",
  });
  res.end("Claude to Figma WebSocket server running (embedded). Try connecting with a WebSocket client.");
}

/**
 * Try to start the embedded WebSocket server on the given port.
 * Returns true if the server started, false if the port is already in use.
 */
export function startEmbeddedServer(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    if (httpServer) {
      // Already running in this process
      resolve(true);
      return;
    }

    const server = createServer(handleHttpRequest);
    const wsServer = new WebSocketServer({ server });

    wsServer.on("connection", handleConnection);

    server.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        logger.info(`[WS-Server] Port ${port} already in use — another instance is serving`);
        resolve(false);
      } else {
        logger.error(`[WS-Server] Server error: ${err.message}`);
        resolve(false);
      }
    });

    server.listen(port, () => {
      httpServer = server;
      wss = wsServer;
      logger.info(`[WS-Server] Embedded WebSocket server running on port ${port}`);
      resolve(true);
    });
  });
}

/**
 * Stop the embedded WebSocket server if this process started one.
 */
export function stopEmbeddedServer(): Promise<void> {
  return new Promise((resolve) => {
    if (wss) {
      wss.clients.forEach((client) => client.close());
      wss.close();
      wss = null;
    }
    if (httpServer) {
      httpServer.close(() => {
        httpServer = null;
        logger.info("[WS-Server] Embedded server stopped");
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Returns true if this process is hosting the embedded server.
 */
export function isServerRunning(): boolean {
  return httpServer !== null;
}
