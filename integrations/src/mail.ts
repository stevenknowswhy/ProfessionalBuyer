import type { EmitTrace, InboundEmail, Mail } from "@buyer/contract";
import { AgentMailClient } from "agentmail";
import { env } from "./env";
import { emitFallback, errorMessage, safeEmit, shortHash, traced } from "./trace";

export const FALLBACK_INBOX = "not-configured@agentmail.invalid";
/** The agent's mailbox. People forward receipts here. */
export const AGENT_INBOX = "signal-os-concierge@agentmail.to";
const POLL_MS = 5_000;

export function createMail(): Mail {
  return {
    inboxAddress: () => {
      const id = env.agentmailInboxId();
      if (!id) return FALLBACK_INBOX;
      return id.includes("@") ? id : AGENT_INBOX;
    },
    onInbound: (handler, emit) => (mailConfigured() ? realOnInbound(handler, emit) : fallbackOnInbound(emit)),
    send: (msg, emit) => (mailConfigured() ? realSend(msg, emit) : fallbackSend(msg, emit)),
  };
}

const mailConfigured = () => Boolean(env.agentmailApiKey() && env.agentmailInboxId());

let client: AgentMailClient | undefined;
const mailClient = () => (client ??= new AgentMailClient({ apiKey: env.agentmailApiKey() }));

export function fallbackOnInbound(emit: EmitTrace): Promise<() => void> {
  emitFallback(emit, "agentmail", "inbox listener", "AGENTMAIL_API_KEY or AGENTMAIL_INBOX_ID not set: no inbound mail");
  return Promise.resolve(() => {});
}

export function fallbackSend(
  msg: { to: string; subject: string; text: string },
  emit: EmitTrace,
): Promise<{ messageId: string; usingFallback: true }> {
  const messageId = `fallback-${shortHash(`${msg.to}|${msg.subject}|${msg.text}`)}`;
  console.log(`[agentmail fallback: NOT SENT] to=${msg.to} subject=${JSON.stringify(msg.subject)} (${msg.text.length} chars)`);
  emitFallback(emit, "agentmail", "send email", "AGENTMAIL_API_KEY or AGENTMAIL_INBOX_ID not set: logged, not sent", {
    to: msg.to,
    subject: msg.subject,
    messageId,
  });
  return Promise.resolve({ messageId, usingFallback: true });
}

async function realSend(
  msg: { to: string; subject: string; text: string; html?: string },
  emit: EmitTrace,
): Promise<{ messageId: string }> {
  const inboxId = env.agentmailInboxId()!;
  const res = await traced(
    emit,
    "agentmail",
    "send email",
    () => mailClient().inboxes.messages.send(inboxId, { to: [msg.to], subject: msg.subject, text: msg.text, html: msg.html }),
    (r) => ({ to: msg.to, subject: msg.subject, messageId: r.messageId }),
  );
  return { messageId: res.messageId };
}

type AgentMailMessage = {
  messageId: string;
  from: string;
  subject?: string;
  timestamp: Date | string;
  extractedText?: string;
  text?: string;
  preview?: string;
};

export function toInboundEmail(m: AgentMailMessage): InboundEmail {
  return {
    messageId: m.messageId,
    from: m.from,
    subject: m.subject ?? "",
    receivedAt: new Date(m.timestamp).toISOString(),
    text: m.extractedText ?? m.text ?? m.preview ?? "",
  };
}

/** WebSocket first; on failure, poll `messages.list` every 5 s. Each message is handed to `handler` once. */
async function realOnInbound(handler: (email: InboundEmail) => Promise<void>, emit: EmitTrace): Promise<() => void> {
  const inboxId = env.agentmailInboxId()!;
  const seen = new Set<string>();
  const deliver = async (m: AgentMailMessage) => {
    if (seen.has(m.messageId)) return;
    seen.add(m.messageId);
    const email = toInboundEmail(m);
    safeEmit(emit, {
      sponsor: "agentmail",
      label: "email received",
      status: "ok",
      durationMs: null,
      provenance: "live",
      detail: { messageId: email.messageId, from: email.from, subject: email.subject },
    });
    try {
      await handler(email);
    } catch (err) {
      safeEmit(emit, {
        sponsor: "agentmail",
        label: "inbound handler failed",
        status: "error",
        durationMs: null,
        provenance: "live",
        detail: { messageId: email.messageId, error: errorMessage(err) },
      });
    }
  };

  try {
    const socket = await traced(emit, "agentmail", "websocket connect", () => mailClient().websockets.connect());
    socket.on("message", (e) => {
      if (e.type === "event" && "eventType" in e && e.eventType === "message.received" && "message" in e) {
        void deliver(e.message as AgentMailMessage);
      }
    });
    socket.sendSubscribe({ type: "subscribe", inboxIds: [inboxId], eventTypes: ["message.received"] });
    return () => socket.close();
  } catch (err) {
    emitFallback(emit, "agentmail", "inbox listener", `WebSocket failed, polling every 5 s: ${errorMessage(err)}`);
  }

  let stopped = false;
  let since = new Date();
  const tick = async () => {
    if (stopped) return;
    try {
      const list = await traced(emit, "agentmail", "poll inbox", () =>
        mailClient().inboxes.messages.list(inboxId, { after: since, ascending: true, limit: 20 }),
      (r) => ({ count: r.count }));
      for (const item of list.messages) {
        if (seen.has(item.messageId)) continue;
        const full = await traced(emit, "agentmail", "fetch message", () => mailClient().inboxes.messages.get(inboxId, item.messageId));
        await deliver(full);
        const ts = new Date(item.timestamp);
        if (ts > since) since = ts;
      }
    } catch {
      // Already traced; try again next tick.
    }
    if (!stopped) timer = setTimeout(tick, POLL_MS);
  };
  let timer: ReturnType<typeof setTimeout> = setTimeout(tick, 0);
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
