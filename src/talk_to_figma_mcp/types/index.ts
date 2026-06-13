// Define TypeScript interfaces for Figma responses
export interface FigmaResponse {
  id: string;
  result?: any;
  error?: string;
}

// Define interface for command progress updates
export interface CommandProgressUpdate {
  type: 'command_progress';
  commandId: string;
  commandType: string;
  status: 'started' | 'in_progress' | 'completed' | 'error';
  progress: number;
  totalItems: number;
  processedItems: number;
  currentChunk?: number;
  totalChunks?: number;
  chunkSize?: number;
  message: string;
  payload?: any;
  timestamp: number;
}

// Define TypeScript interfaces for tracking WebSocket requests
export interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
  timeout: ReturnType<typeof setTimeout>;
  /** Caller-requested timeout budget; reused when re-arming on queue/progress activity. */
  timeoutMs: number;
  lastActivity: number;
}

// ── Relay envelope (discriminated on `type`) ────────────────────────────────

/** Inner payload of system/broadcast frames: a response, a command echo, or nothing routable. */
export interface RelayPayload {
  id?: string;
  command?: string;
  result?: any;
  error?: string;
}

export interface QueuePositionMessage {
  type: "queue_position";
  id?: string;
  position?: number;
  queueSize?: number;
  message?: { data?: { status?: string; progress?: number; message?: string } };
}

export interface ProgressUpdateMessage {
  type: "progress_update";
  id?: string;
  channel?: string;
  message: { id?: string; type?: string; data: CommandProgressUpdate };
}

export interface SystemMessage {
  type: "system";
  message: string | RelayPayload;
  channel?: string;
}

export interface ErrorMessage {
  type: "error";
  message: string;
}

export interface BroadcastMessage {
  type: "broadcast";
  message: RelayPayload;
  sender?: string;
  channel?: string;
}

export interface PingMessage {
  type: "ping";
}

export interface PongMessage {
  type: "pong";
}

/** Every frame the relay can deliver to an MCP agent. */
export type RelayMessage =
  | QueuePositionMessage
  | ProgressUpdateMessage
  | SystemMessage
  | ErrorMessage
  | BroadcastMessage
  | PingMessage
  | PongMessage;

// Command names live in the shared registry (single source of truth for the
// MCP server, the relay, and the relay tests).
export type { FigmaCommand } from "../../shared/commands";
