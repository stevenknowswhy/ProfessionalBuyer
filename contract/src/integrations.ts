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
  /** True when Kernel was not used (no key or call failed); the price was not verified. */
  usingFallback?: boolean;
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
  /** True when Kernel was not configured and no browser was started. */
  usingFallback?: boolean;
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
  /** `usingFallback: true` means nothing was sent (AgentMail not configured); the message was only logged. */
  send(
    msg: { to: string; subject: string; text: string; html?: string },
    emit: EmitTrace,
  ): Promise<{ messageId: string; usingFallback?: boolean }>;
}

export interface Triage {
  /** Jev on OpenRouter when configured, then an LLM, then a keyword heuristic. `via` says which ran. */
  isReceipt(
    text: string,
    emit: EmitTrace,
  ): Promise<{
    isReceipt: boolean;
    confidence: number;
    via: "jev" | "laya" | "llm";
    /** What actually ran. "heuristic" (keyword rules, no model) is a labeled last resort when neither Jev nor an LLM is available. */
    method?: "jev" | "laya" | "llm" | "heuristic";
    usingFallback?: boolean;
  }>;
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
