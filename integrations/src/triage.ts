import type { EmitTrace, Triage } from "@buyer/contract";
import { env } from "./env";
import { emitFallback, errorMessage, traced } from "./trace";

type TriageResult = Awaited<ReturnType<Triage["isReceipt"]>>;

/** Mirrors TRIAGE_QUESTIONS.is_receipt in laya-sidecar/questions.py. */
export const LAYA_RECEIPT_QUESTION = {
  is_receipt: { type: "noul", instructions: "Was something bought, ordered, or shipped according to this text?" },
} as const;
/** From laya-sidecar/questions.py: is_receipt >= 0.80 -> parse as receipt. */
export const LAYA_RECEIPT_THRESHOLD = 0.8;

export function createTriage(): Triage {
  return {
    async isReceipt(text, emit) {
      const layaUrl = env.layaUrl();
      if (layaUrl) {
        try {
          return await layaIsReceipt(layaUrl, text, emit);
        } catch (err) {
          emitFallback(emit, "laya", "receipt triage", `Laya sidecar unavailable: ${errorMessage(err)}`);
        }
      }
      const llm = env.llm();
      if (llm) {
        try {
          return await llmIsReceipt(llm, text, emit);
        } catch {
          // Traced inside; fall through to the heuristic.
        }
      }
      const reason = !layaUrl && !llm ? "LAYA_URL and LLM keys not set" : "Laya and LLM both failed";
      emitFallback(emit, "laya", "receipt triage (keyword heuristic)", reason);
      return heuristicIsReceipt(text);
    },
  };
}

async function layaIsReceipt(baseUrl: string, text: string, emit: EmitTrace): Promise<TriageResult> {
  const body = await traced(emit, "laya", "receipt triage", async () => {
    const res = await fetch(new URL("/predict", baseUrl), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ state: text.slice(0, 4000), questions: LAYA_RECEIPT_QUESTION }),
      signal: AbortSignal.timeout(3_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as { answers?: { is_receipt?: { noul?: number } } };
  }, (b) => ({ pTrue: b.answers?.is_receipt?.noul ?? null }));
  const p = body.answers?.is_receipt?.noul;
  if (typeof p !== "number") throw new Error("Laya response missing answers.is_receipt.noul");
  const isReceipt = p >= LAYA_RECEIPT_THRESHOLD;
  return { isReceipt, confidence: isReceipt ? p : 1 - p, via: "laya", method: "laya" };
}

async function llmIsReceipt(
  llm: NonNullable<ReturnType<typeof env.llm>>,
  text: string,
  emit: EmitTrace,
): Promise<TriageResult> {
  // The trace sponsor stays "laya": this is the Laya step's fallback. `detail.via` says an LLM ran.
  const parsed = await traced(emit, "laya", "receipt triage via LLM", async () => {
    const res = await fetch(`${llm.baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${llm.apiKey}` },
      body: JSON.stringify({
        model: llm.model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Decide whether the email is a purchase receipt, order confirmation or shipping notice. Reply as JSON: {"isReceipt": boolean, "confidence": number between 0 and 1}.',
          },
          { role: "user", content: text.slice(0, 6000) },
        ],
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const out = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as { isReceipt?: unknown; confidence?: unknown };
    if (typeof out.isReceipt !== "boolean") throw new Error("LLM reply missing isReceipt");
    return { isReceipt: out.isReceipt, confidence: clamp01(Number(out.confidence ?? 0.5)) };
  }, (r) => ({ via: "llm", source: llm.source, model: llm.model, isReceipt: r.isReceipt }));
  return { ...parsed, via: "llm", method: "llm", usingFallback: true };
}

const STRONG = [/order (confirmation|#|number)/i, /\breceipt\b/i, /\binvoice\b/i, /has shipped|shipment|out for delivery|delivered/i, /thank you for (your )?(order|purchase)/i];
const WEAK = [/\bsubtotal\b/i, /\btotal\b/i, /\bqty\b|quantity/i, /\$\s?\d+\.\d{2}/, /\btax\b/i];

/**
 * Keyword rules, no model. `via` stays in the contract's "llm" slot (the non-Laya path); `method: "heuristic"`
 * and `usingFallback` say what really ran.
 */
export function heuristicIsReceipt(text: string): TriageResult {
  const strong = STRONG.filter((r) => r.test(text)).length;
  const weak = WEAK.filter((r) => r.test(text)).length;
  const score = Math.min(1, strong * 0.3 + weak * 0.1);
  const isReceipt = strong >= 1 && score >= 0.4;
  return {
    isReceipt,
    confidence: Number((isReceipt ? score : 1 - score).toFixed(2)),
    via: "llm",
    method: "heuristic",
    usingFallback: true,
  };
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);
