/**
 * Function signatures between the backend-core agent (agent/) and the integrations agent (integrations/, worker/).
 * Core codes against these types with stubs from day one; integrations implements them in @buyer/integrations.
 * Types only: nothing here runs, so the package root stays safe for web/ to import.
 */
import type { TraceEvent } from "./index";

/** Every integration reports each external call through this callback. Core persists it to `events`. */
export type EmitTrace = (event: Omit<TraceEvent, "id" | "at">) => void;

export interface VerifiedOffer {
  url: string;
  title: string;
  priceCents: number | null;
  inStock: boolean;
  kernelSessionId: string;
  replayUrl: string | null;
}

export interface CheckoutRequest {
  url: string;
  mode: "review" | "place";
  /** Must match the approved amount; implementations abort if the page total differs. */
  expectedTotalCents: number;
  /** Called as soon as the browser exists, so the UI can mount the live view early. */
  onLiveView: (session: { kernelSessionId: string; liveViewUrl: string }) => void;
}

export interface CheckoutResult {
  ok: boolean;
  stoppedAt: "review-page" | "placed";
  pageTotalCents: number | null;
  orderRef: string | null;
  replayUrl: string | null;
  failureReason: string | null;
}

export interface Kernel {
  verifyOffer(url: string, emit: EmitTrace): Promise<VerifiedOffer>;
  checkout(req: CheckoutRequest, emit: EmitTrace): Promise<CheckoutResult>;
}

export interface InboundEmail {
  messageId: string;
  from: string;
  subject: string;
  receivedAt: string;
  /** AgentMail extractedText, including text pulled from attachments. */
  text: string;
}

export interface Mail {
  inboxAddress(): string;
  /** Starts the WebSocket listener (falls back to polling). Returns a stop function. */
  onInbound(handler: (email: InboundEmail) => Promise<void>, emit: EmitTrace): Promise<() => void>;
  send(msg: { to: string; subject: string; text: string; html?: string }, emit: EmitTrace): Promise<{ messageId: string }>;
}

export interface Triage {
  /** Laya sidecar when healthy, LLM fallback otherwise. `via` says which ran. */
  isReceipt(text: string, emit: EmitTrace): Promise<{ isReceipt: boolean; confidence: number; via: "laya" | "llm" }>;
}

export interface IntegrationHealth {
  sponsor: "kernel" | "agentmail" | "fly" | "laya";
  status: "green" | "red" | "degraded";
  note: string;
  usingFallback: boolean;
}

export interface Integrations {
  kernel: Kernel;
  mail: Mail;
  triage: Triage;
  health(): Promise<IntegrationHealth[]>;
}
