import { fetchOfferPrice } from "./fetch-price";
import type { Store, WatchRow } from "./store";

/** One pass over active watches: one observation and one `fly` event per watch. Returns observations written. */
export async function runCycle(s: Store, runsOn: WatchRow["runsOn"], fetchPrice = fetchOfferPrice): Promise<number> {
  const watches = await s.activeWatches();
  let written = 0;
  for (const w of watches) {
    const check = await fetchPrice(w.offerUrl);
    try {
      const obsId = await s.insertObservation({ watchId: w.id, priceCents: check.priceCents, inStock: check.inStock });
      await s.insertEvent({
        label: `price check ${hostOf(w.offerUrl)}`,
        status: check.error ? "error" : "ok",
        durationMs: check.durationMs,
        provenance: "live",
        detail: {
          watchId: w.id,
          itemId: w.itemId,
          observationId: obsId,
          url: w.offerUrl,
          priceCents: check.priceCents,
          inStock: check.inStock,
          priceSource: check.source,
          httpStatus: check.httpStatus,
          error: check.error,
          runsOn,
        },
      });
      written++;
    } catch (err) {
      console.error(`[worker] write failed for watch ${w.id}: ${err instanceof Error ? err.message : err}`);
    }
  }
  return written;
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}
