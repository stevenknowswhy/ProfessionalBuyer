import type { EmitTrace, InboundEmail } from "@buyer/contract";
import { env } from "./env";
import { createTriage } from "./triage";

/** Paths core might publish for `ingestReceipt`. Tried in order when `INGEST_URL` is unset. */
export const INGEST_CANDIDATE_PATHS = ["/api/ingest", "/api/receipts/ingest"] as const;

export interface IngestReceiptInput {
  text: string;
  source: string;
  messageId?: string;
  from?: string;
  subject?: string;
  receivedAt?: string;
}

export interface IngestReceiptResult {
  accepted: boolean;
  via: "http" | "local";
  path?: string;
  isReceipt?: boolean;
  confidence?: number;
  note: string;
}

const triage = createTriage();

/**
 * Local ingest core can import when its HTTP route is not up yet.
 * Triages the text and returns whether it should be parsed. Does not write to Neon.
 */
export async function ingestReceipt(input: IngestReceiptInput, emit: EmitTrace = () => {}): Promise<IngestReceiptResult> {
  const result = await triage.isReceipt(input.text, emit);
  return {
    accepted: result.isReceipt,
    via: "local",
    isReceipt: result.isReceipt,
    confidence: result.confidence,
    note: result.isReceipt
      ? `local ingestReceipt: receipt (${result.method ?? result.via})`
      : `local ingestReceipt: not a receipt (${result.method ?? result.via})`,
  };
}

export function inboundToIngest(email: InboundEmail): IngestReceiptInput {
  const text = [`Subject: ${email.subject}`, `From: ${email.from}`, email.text].filter(Boolean).join("\n");
  return {
    text,
    source: "agentmail",
    messageId: email.messageId,
    from: email.from,
    subject: email.subject,
    receivedAt: email.receivedAt,
  };
}

/**
 * POST the message to core's ingest route when that route answers.
 * A 404/405 means "not this path". Any other HTTP status means the route exists.
 * Connection failures fall through to {@link ingestReceipt}.
 */
export async function deliverToCore(input: IngestReceiptInput, emit: EmitTrace = () => {}): Promise<IngestReceiptResult> {
  const explicit = env.ingestUrl();
  const targets = explicit
    ? [explicit]
    : INGEST_CANDIDATE_PATHS.map((path) => new URL(path, `${env.coreBaseUrl()}/`).toString());

  let unreachable = false;
  for (const url of targets) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify(input),
        signal: AbortSignal.timeout(1_500),
      });
    } catch {
      unreachable = true;
      break;
    }
    if (res.status === 404 || res.status === 405 || res.status === 501) continue;
    const path = safePath(url);
    if (res.ok) {
      return { accepted: true, via: "http", path, note: `posted to core ingest ${path}` };
    }
    return { accepted: false, via: "http", path, note: `core ingest ${path} returned HTTP ${res.status}` };
  }

  const local = await ingestReceipt(input, emit);
  const why = unreachable ? "core ingest HTTP not reachable" : "core ingest route not found";
  return { ...local, note: `${local.note} (${why})` };
}

function safePath(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}
