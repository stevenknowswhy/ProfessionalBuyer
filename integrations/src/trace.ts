import type { EmitTrace } from "@buyer/contract";

type TracedSponsor = "kernel" | "agentmail" | "fly" | "laya" | "neon";

/**
 * Runs one external call and reports it. Emits exactly one event when the call settles, with its duration.
 * `emit` failures never break the call they describe.
 */
export async function traced<T>(
  emit: EmitTrace,
  sponsor: TracedSponsor,
  label: string,
  fn: () => Promise<T>,
  detail?: (result: T) => Record<string, unknown>,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    safeEmit(emit, {
      sponsor,
      label,
      status: "ok",
      durationMs: Date.now() - started,
      provenance: "live",
      ...(detail ? { detail: detail(result) } : {}),
    });
    return result;
  } catch (err) {
    safeEmit(emit, {
      sponsor,
      label,
      status: "error",
      durationMs: Date.now() - started,
      provenance: "live",
      detail: { error: errorMessage(err) },
    });
    throw err;
  }
}

/** A fallback path ran instead of the real service. Always labeled `usingFallback` and never `live`. */
export function emitFallback(
  emit: EmitTrace,
  sponsor: TracedSponsor,
  label: string,
  reason: string,
  detail: Record<string, unknown> = {},
): void {
  safeEmit(emit, {
    sponsor,
    label: `${label} (fallback)`,
    status: "skipped",
    durationMs: 0,
    provenance: "sample",
    detail: { usingFallback: true, reason, ...detail },
  });
}

export function safeEmit(emit: EmitTrace, event: Parameters<EmitTrace>[0]): void {
  try {
    emit(event);
  } catch {
    // Tracing is best-effort.
  }
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** Small stable hash for deterministic fallback IDs. Not cryptographic. */
export function shortHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
