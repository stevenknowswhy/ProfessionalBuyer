import type { EmitTrace, Triage } from "@buyer/contract";
import { env } from "./env";
import { emitFallback, errorMessage, traced } from "./trace";

type TriageResult = Awaited<ReturnType<Triage["isReceipt"]>>;

/** Same perception question the sidecar used. Jev answers it on OpenRouter. */
export const JEV_RECEIPT_QUESTION = {
  is_receipt: {
    type: "noul",
    instructions: "Was something bought, ordered, or shipped according to this text?",
    criteria: {
      true: "A purchase receipt, order confirmation, invoice, or shipping notice.",
      false: "Not a receipt: conversation, newsletter, or unrelated mail.",
    },
  },
} as const;
/** is_receipt >= 0.80 -> treat the message as a receipt. */
export const JEV_RECEIPT_THRESHOLD = 0.8;
export const JEV_MODEL = "typesafe/jev-1.13" as const;
export const JEV_DECISIONS_URL = "https://openrouter.ai/api/alpha/decisions";

/** Always the decision model. `typesafe/jev-router` picks a chat model and is not triage. */
export function jevRequestModel(): typeof JEV_MODEL {
  return JEV_MODEL;
}

export function createTriage(): Triage {
  return {
    async isReceipt(text, emit) {
      const key = env.openrouterApiKey();
      if (key) {
        try {
          return await jevIsReceipt(key, text, emit);
        } catch (err) {
          emitFallback(emit, "laya", "receipt triage", `Jev unavailable: ${errorMessage(err)}`);
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
      const reason = !key && !llm ? "OPENROUTER_API_KEY and LLM keys not set" : "Jev and LLM both failed";
      emitFallback(emit, "laya", "receipt triage (keyword heuristic)", reason);
      return heuristicIsReceipt(text);
    },
  };
}

async function jevIsReceipt(apiKey: string, text: string, emit: EmitTrace): Promise<TriageResult> {
  const model = jevRequestModel();
  const body = await traced(emit, "laya", "receipt triage via Jev", async () => {
    const res = await fetch(JEV_DECISIONS_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        state: text.slice(0, 8000),
        questions: JEV_RECEIPT_QUESTION,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as {
      model?: string;
      answers?: { is_receipt?: { noul?: number } };
    };
  }, (b) => ({ model, served: b.model ?? null, pTrue: b.answers?.is_receipt?.noul ?? null }));
  if (body.model?.includes("jev-router")) throw new Error("refusing typesafe/jev-router response");
  const p = body.answers?.is_receipt?.noul;
  if (typeof p !== "number") throw new Error("Jev response missing answers.is_receipt.noul");
  const isReceipt = p >= JEV_RECEIPT_THRESHOLD;
  return { isReceipt, confidence: Number((isReceipt ? p : 1 - p).toFixed(4)), via: "jev", method: "jev" };
}

async function llmIsReceipt(
  llm: NonNullable<ReturnType<typeof env.llm>>,
  text: string,
  emit: EmitTrace,
): Promise<TriageResult> {
  // The trace sponsor stays "laya": this is the triage step's fallback. `detail.via` says an LLM ran.
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
 * Keyword rules, no model. `via` stays in the contract's "llm" slot (the non-Jev path); `method: "heuristic"`
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
