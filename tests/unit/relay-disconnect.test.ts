/**
 * Regression tests against the REAL relay (src/socket.ts via startRelay), not a
 * mirror. Covers:
 *
 *  1. C1 — plugin disconnect mid-command in ZERO-CONFIG mode: the agent sits in
 *     AUTO_CHANNEL ("__auto__") so the plugin is the only member of its channel.
 *     The close handler used to delete the (now empty) channel queue BEFORE
 *     cleanupClient() could flush it, leaving the agent hanging for the 2-min
 *     command timeout. After the fix, both the in-flight and the queued command
 *     must be rejected immediately.
 *
 *  2. A1 — origin allowlist: browser origins outside the allowlist are rejected
 *     (CSWSH protection), while non-browser clients (no Origin), the sandboxed
 *     plugin iframe ("null"), and figma.com keep working.
 */
import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { startRelay, RelayHandle } from "../../src/socket";

let relay: RelayHandle;

beforeAll(() => {
  relay = startRelay({ port: 0 }); // ephemeral port
});

afterAll(() => {
  relay.stop();
});

function connect(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`ws://localhost:${relay.port}`);
    ws.onopen = () => resolve(ws);
    ws.onerror = (e) => reject(e);
    setTimeout(() => reject(new Error("Connection timeout")), 5000);
  });
}

/** Resolve with the first parsed message matching `predicate`. */
function waitForMessage(
  ws: WebSocket,
  predicate: (msg: any) => boolean,
  timeoutMs = 3000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("Timeout waiting for message")),
      timeoutMs
    );
    const handler = (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string);
        if (predicate(msg)) {
          clearTimeout(timeout);
          ws.removeEventListener("message", handler);
          resolve(msg);
        }
      } catch {
        // ignore unparseable frames
      }
    };
    ws.addEventListener("message", handler);
  });
}

async function joinAsAgent(ws: WebSocket, sessionId: string): Promise<void> {
  const confirmed = waitForMessage(
    ws,
    (m) => m.type === "system" && m.message && typeof m.message === "object" && m.message.result
  );
  ws.send(
    JSON.stringify({
      id: `join-${sessionId}`,
      type: "join",
      channel: "__auto__",
      sessionId,
      role: "agent",
    })
  );
  await confirmed;
}

async function joinAsPlugin(ws: WebSocket, channel: string): Promise<void> {
  const confirmed = waitForMessage(
    ws,
    (m) => m.type === "system" && m.message && typeof m.message === "object" && m.message.result
  );
  ws.send(JSON.stringify({ type: "join", channel, role: "plugin" }));
  await confirmed;
}

function sendCommand(ws: WebSocket, id: string, command = "get_selection"): void {
  ws.send(
    JSON.stringify({
      id,
      type: "message",
      channel: "__auto__",
      message: { id, command, params: { commandId: id } },
    })
  );
}

describe("zero-config plugin disconnect (C1 regression)", () => {
  it("rejects the in-flight AND queued commands immediately when the plugin disconnects", async () => {
    const plugin = await connect();
    await joinAsPlugin(plugin, "regress-chan-1");

    const agent = await connect();
    await joinAsAgent(agent, "session-c1");

    // First command goes in-flight (the fake plugin receives it and "hangs"),
    // second command queues behind it.
    const pluginGotCommand = waitForMessage(
      plugin,
      (m) => m.type === "broadcast" && m.message?.command === "get_selection"
    );
    sendCommand(agent, "cmd-inflight");
    await pluginGotCommand;
    sendCommand(agent, "cmd-queued");
    // Give the relay a beat to enqueue the second command behind the in-flight
    // one (no queue_position frame is emitted until the next dequeue).
    await new Promise((r) => setTimeout(r, 150));

    // Plugin dies mid-command. Both commands must fail promptly — NOT after the
    // 2-minute command timeout (pre-fix behavior).
    const inflightError = waitForMessage(
      agent,
      (m) => m.message?.id === "cmd-inflight" && /disconnected/i.test(m.message?.error ?? "")
    );
    const queuedError = waitForMessage(
      agent,
      (m) => m.message?.id === "cmd-queued" && /disconnected/i.test(m.message?.error ?? "")
    );
    plugin.close();

    await inflightError;
    await queuedError;

    agent.close();
  });

  it("reports a friendly error when no plugin is connected at all", async () => {
    const agent = await connect();
    await joinAsAgent(agent, "session-noplugin");

    const rejection = waitForMessage(
      agent,
      (m) => m.message?.id === "cmd-none" && /No Figma plugin is connected/.test(m.message?.error ?? "")
    );
    sendCommand(agent, "cmd-none");
    await rejection;

    agent.close();
  });
});

describe("origin allowlist (A1 / CSWSH protection)", () => {
  it("serves /status to non-browser clients (no Origin header)", async () => {
    const res = await fetch(`http://localhost:${relay.port}/status`);
    expect(res.status).toBe(200);
  });

  it("allows the sandboxed plugin iframe origin \"null\" and figma.com", async () => {
    const nullOrigin = await fetch(`http://localhost:${relay.port}/status`, {
      headers: { origin: "null" },
    });
    expect(nullOrigin.status).toBe(200);

    const figma = await fetch(`http://localhost:${relay.port}/status`, {
      headers: { origin: "https://www.figma.com" },
    });
    expect(figma.status).toBe(200);
    expect(figma.headers.get("access-control-allow-origin")).toBe("https://www.figma.com");
  });

  it("rejects requests from arbitrary web origins with 403", async () => {
    const res = await fetch(`http://localhost:${relay.port}/status`, {
      headers: { origin: "https://evil.example" },
    });
    expect(res.status).toBe(403);
  });
});
