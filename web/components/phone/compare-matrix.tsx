"use client";

import { formatUsd, type Household } from "@buyer/contract";
import { useEffect, useMemo, useState } from "react";
import { YearlySavingsNumber } from "@/components/savings/yearly-number";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FREQUENCIES,
  LANES,
  MATCH_FLOOR,
  bestItemMatch,
  bestPriced,
  historyForItem,
  saveThisBuyCents,
  yearSavings,
  type ComparedOffer,
  type Lane,
  type ReceiptLine,
} from "@/lib/receipt";
import { chosenStores, type StoreSelection } from "@/lib/stores";
import { cn } from "@/lib/utils";

type CompareResponse = {
  itemId: string | null;
  offers: ComparedOffer[];
  jev: "live" | "unavailable";
  provenance: "sample" | "live" | "mixed";
  error?: string;
};

export function CompareMatrix({
  line,
  retailer,
  source,
  household,
  stores,
  onRetake,
}: {
  line: ReceiptLine | null;
  retailer: string;
  source: "vision" | "sample";
  household?: Household;
  stores: StoreSelection;
  onRetake: () => void;
}) {
  const [offers, setOffers] = useState<ComparedOffer[] | null>(null);
  const [jev, setJev] = useState<"live" | "unavailable">("unavailable");
  const [priceSource, setPriceSource] = useState<CompareResponse["provenance"]>("sample");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [frequencyId, setFrequencyId] = useState<(typeof FREQUENCIES)[number]["id"]>("month");

  const chosen = chosenStores(stores);
  const matched = useMemo(
    () => (line && household ? bestItemMatch(line.name, household.items) : null),
    [line, household],
  );
  const history = historyForItem(household, matched?.id ?? null);
  const frequency = FREQUENCIES.find((item) => item.id === frequencyId) ?? FREQUENCIES[2];
  const perYear = history?.enough ? history.buysPerYear : frequency.perYear;

  useEffect(() => {
    if (!line) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    setOffers(null);
    const payload = {
      name: line.name,
      stores: chosen.map((store) => ({
        id: store.id,
        name: store.name,
        domain: store.url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0],
      })),
    };
    fetch("/api/receipt/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = (await res.json()) as CompareResponse;
        if (!res.ok) throw new Error(json.error ?? "The store search did not finish.");
        setOffers(json.offers);
        setJev(json.jev);
        setPriceSource(json.provenance);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setError(err instanceof Error ? err.message : "The store search did not finish.");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [line, stores]);

  if (!line) {
    return (
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <h2 className="type-heading text-[1.75rem] text-ink">Nothing to compare yet</h2>
        <p className="max-w-[34ch] text-body text-ink-soft">
          Photograph a receipt, then tap the line you want priced across your stores.
        </p>
        <button
          type="button"
          onClick={onRetake}
          className="pressable mt-auto min-h-14 w-full rounded-panel bg-ink px-4 text-body font-semibold text-paper-raised"
        >
          Photograph a receipt
        </button>
      </div>
    );
  }

  const priced = !loading && offers != null;
  const best = priced ? bestPriced(offers) : null;
  const saveOnce = saveThisBuyCents(line.lineTotalCents, best);
  const yearly = yearSavings(saveOnce, perYear);
  const rows = rowStores(chosen, offers ?? []);

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex min-w-0 flex-col gap-1">
        <p className="break-words text-small text-ink-soft">{retailer ? `Bought at ${retailer}` : "From the receipt"}</p>
        <h2 className="type-heading break-words text-[1.75rem] text-ink">{line.name}</h2>
        {source === "sample" && <p className="text-micro font-semibold text-ink-soft">Sample data</p>}
      </div>

      <section aria-label="Savings" className="flex min-w-0 flex-col gap-4">
        <div className="min-w-0">
          <p className="text-small text-ink-soft">Save this year</p>
          {loading ? (
            <Skeleton className="mt-2 h-16 w-44 max-w-full" />
          ) : priced ? (
            <div className="year-slot mt-1">
              <YearlySavingsNumber cents={yearly} className="year-figure" />
            </div>
          ) : (
            <p className="mt-2 text-small text-ink-soft">The yearly figure appears when the search finishes.</p>
          )}
          <p className="mt-2 max-w-[40ch] text-small text-ink-soft">
            {history?.enough
              ? `About ${history.buysPerYear.toLocaleString("en-US", { maximumFractionDigits: 1 })} buys a year, from ${history.purchaseCount} purchases over ${Math.round(history.spanDays)} days.`
              : `Estimate. ${frequency.label.toLowerCase()}, so about ${frequency.perYear} buys a year.`}
          </p>
        </div>
        <dl className="surface min-w-0 overflow-hidden">
          <LedgerRow label="You paid" value={formatUsd(line.lineTotalCents)} />
          <LedgerRow
            label="Save this buy"
            value={priced ? formatUsd(saveOnce) : "—"}
            tone={priced && saveOnce > 0 ? "margin" : undefined}
          />
          <LedgerRow label="Buys a year" value={perYear.toLocaleString("en-US", { maximumFractionDigits: 1 })} />
        </dl>
        {!history?.enough && (
          <div className="flex min-w-0 flex-col gap-2">
            <p className="text-small font-semibold text-ink">How often do you buy this?</p>
            <div className="flex flex-wrap gap-2">
              {FREQUENCIES.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={item.id === frequencyId}
                  onClick={() => setFrequencyId(item.id)}
                  className={cn(
                    "pressable min-h-11 rounded-full px-3.5 text-small font-semibold",
                    item.id === frequencyId ? "bg-ink text-paper-raised" : "bg-paper-sunk text-ink",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {error && (
        <p role="alert" className="rounded-card bg-carmine-wash px-3 py-3 text-small text-carmine">
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex min-w-0 flex-col gap-3">
          <p className="text-small text-ink-soft">Searching {chosen.length} stores and scoring each match.</p>
          <MatrixSkeleton />
        </div>
      ) : (
        <section aria-labelledby="matrix-title" className="flex min-w-0 flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 id="matrix-title" className="text-small font-semibold text-ink">
              Same item, your stores
            </h3>
            <p className="text-small text-ink-soft">
              {jev === "live" ? "Match is Jev." : "Jev did not score."}{" "}
              {priceSource === "sample" ? "Sample prices." : priceSource === "mixed" ? "Some prices are sample data." : "Live prices."}
            </p>
          </div>
          <ul className="flex min-w-0 flex-col gap-3">
            {rows.map((row) => (
              <li key={row.id} className="surface min-w-0 overflow-hidden">
                <div className="flex min-w-0 items-start justify-between gap-3 px-3 py-3">
                  <h4 className="min-w-0 break-words text-body font-semibold text-ink">{row.name}</h4>
                  <MatchMark match={row.match} />
                </div>
                {LANES.map((lane) => (
                  <LaneRow key={lane.id} lane={lane} offer={row.byLane[lane.id]} best={best} />
                ))}
              </li>
            ))}
          </ul>
          <p className="text-small text-ink-soft">
            Save this buy is what you paid minus the lowest delivered price Jev still calls the same item. Overseas cells
            without a duty figure do not include duty.
          </p>
        </section>
      )}
    </div>
  );
}

function LedgerRow({ label, value, tone }: { label: string; value: string; tone?: "margin" }) {
  return (
    <div className="flex min-h-11 items-baseline justify-between gap-3 border-t border-rule/70 px-3 py-3 first:border-t-0">
      <dt className="text-small text-ink-soft">{label}</dt>
      <dd className={cn("money shrink-0 text-body font-semibold", tone === "margin" ? "text-margin" : "text-ink")}>{value}</dd>
    </div>
  );
}

function MatchMark({ match }: { match: number | null }) {
  if (match == null) return <span className="shrink-0 text-right text-small text-ink-faint">Not scored</span>;
  const same = match >= MATCH_FLOOR;
  return (
    <span className={cn("shrink-0 text-right text-small font-semibold tabular-nums", same ? "text-margin" : "text-ink-soft")}>
      {Math.round(match * 100)}%
      <span className="block font-normal text-micro">{same ? "Same item" : "Different"}</span>
    </span>
  );
}

function LaneRow({
  lane,
  offer,
  best,
}: {
  lane: (typeof LANES)[number];
  offer?: ComparedOffer;
  best: ComparedOffer | null;
}) {
  const isBest = offer != null && best != null && offer.storeId === best.storeId && offer.lane === best.lane;
  return (
    <div className={cn("flex items-start justify-between gap-3 border-t border-rule/70 px-3 py-3", isBest && "bg-margin-wash")}>
      <div className="min-w-0">
        <p className="text-small font-semibold text-ink">{lane.label}</p>
        <p className="text-micro text-ink-faint">{lane.hint}</p>
      </div>
      <div className="min-w-0 max-w-[58%] text-right">
        <Cell offer={offer} best={best} />
      </div>
    </div>
  );
}

function MatrixSkeleton() {
  return (
    <ul aria-hidden className="flex flex-col gap-3">
      {[0, 1].map((item) => (
        <li key={item} className="surface p-3">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="mt-3 h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-full" />
        </li>
      ))}
    </ul>
  );
}

function Cell({ offer, best }: { offer?: ComparedOffer; best: ComparedOffer | null }) {
  if (!offer) return <span className="text-small text-ink-faint">—</span>;
  const isBest = best != null && offer.storeId === best.storeId && offer.lane === best.lane;
  const price =
    offer.deliveredCents != null ? (
      <span className={cn("money text-body font-semibold", isBest ? "text-margin" : "text-ink")}>{formatUsd(offer.deliveredCents)}</span>
    ) : (
      <span className="text-small text-ink-soft">No price</span>
    );
  const notes = (
    <>
      {offer.shippingCents + offer.dutyCents > 0 && (
        <span className="block break-words text-micro text-ink-faint">
          {offer.shippingCents > 0 ? `${formatUsd(offer.shippingCents)} shipping` : ""}
          {offer.shippingCents > 0 && offer.dutyCents > 0 ? ", " : ""}
          {offer.dutyCents > 0 ? `${formatUsd(offer.dutyCents)} duty est.` : ""}
        </span>
      )}
      {offer.lane === "overseas" && offer.dutyCents === 0 && <span className="block text-micro text-ink-faint">Duty not included</span>}
    </>
  );
  if (!offer.url) {
    return (
      <div className="flex flex-col items-end gap-0.5">
        {price}
        {notes}
      </div>
    );
  }
  return (
    <a
      href={offer.url}
      target="_blank"
      rel="noopener noreferrer"
      className="pressable inline-flex min-h-11 max-w-full flex-col items-end justify-center text-right"
    >
      {price}
      {notes}
      <span className="text-micro font-semibold text-ink underline decoration-rule underline-offset-4">Open</span>
    </a>
  );
}

function rowStores(
  chosen: { id: string; name: string }[],
  offers: ComparedOffer[],
): { id: string; name: string; byLane: Partial<Record<Lane, ComparedOffer>>; match: number | null }[] {
  return chosen.map((store) => {
    const mine = offers.filter((offer) => offer.storeId === store.id);
    const byLane: Partial<Record<Lane, ComparedOffer>> = {};
    for (const offer of mine) {
      const current = byLane[offer.lane];
      if (!current || (offer.deliveredCents ?? Infinity) < (current.deliveredCents ?? Infinity)) byLane[offer.lane] = offer;
    }
    const scored = mine.map((offer) => offer.match).filter((match): match is number => match != null);
    const match = scored.length ? Math.max(...scored) : null;
    return { id: store.id, name: store.name, byLane, match };
  });
}
