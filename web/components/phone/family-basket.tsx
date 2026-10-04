"use client";

import { formatUsd } from "@buyer/contract";
import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { FAMILY_ITEMS, FAMILY_STORES, type FamilyItem } from "@/lib/family-items";
import { LANES, MATCH_FLOOR, type ComparedOffer } from "@/lib/receipt";
import { cn } from "@/lib/utils";

/**
 * Bodoni is loaded under the family name "display".
 * A text optical size keeps the decimal point next to the digits.
 */
const priceStyle = {
  fontFamily: "display, Georgia, serif",
  fontWeight: 500,
  fontOpticalSizing: "none",
  fontVariationSettings: '"opsz" 18',
} as const;

type CompareResponse = {
  offers?: ComparedOffer[];
  jev?: "live" | "unavailable";
  provenance?: "sample" | "live" | "mixed";
  error?: string;
};

type BasketResult = {
  status: "loading" | "ready" | "error";
  offers: ComparedOffer[];
  jev: "live" | "unavailable";
  provenance: "sample" | "live" | "mixed";
  error?: string;
};

export function FamilyBasket() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [byId, setById] = useState<Record<string, BasketResult>>({});

  useEffect(() => {
    if (!openId) return;
    const item = FAMILY_ITEMS.find((row) => row.id === openId);
    if (!item) return;

    let cancelled = false;
    const controller = new AbortController();

    setById((current) => {
      const existing = current[item.id];
      if (existing?.status === "ready" || existing?.status === "loading") return current;
      return {
        ...current,
        [item.id]: { status: "loading", offers: [], jev: "unavailable", provenance: "sample" },
      };
    });

    fetch("/api/receipt/compare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: item.title,
        stores: FAMILY_STORES.map((store) => ({ id: store.id, name: store.name, domain: store.domain })),
      }),
      signal: controller.signal,
    })
      .then(async (res) => {
        const json = (await res.json()) as CompareResponse;
        if (!res.ok) throw new Error(json.error ?? "The store search did not finish.");
        if (cancelled) return;
        setById((current) => ({
          ...current,
          [item.id]: {
            status: "ready",
            offers: json.offers ?? [],
            jev: json.jev ?? "unavailable",
            provenance: json.provenance ?? "sample",
          },
        }));
      })
      .catch((err: unknown) => {
        if (cancelled || controller.signal.aborted) return;
        setById((current) => ({
          ...current,
          [item.id]: {
            status: "error",
            offers: [],
            jev: "unavailable",
            provenance: "sample",
            error: err instanceof Error ? err.message : "The store search did not finish.",
          },
        }));
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [openId, attempt]);

  return (
    <section aria-labelledby="family-basket-title" id="family-basket" className="flex min-w-0 flex-col gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="family-basket-title" className="text-[1.35rem] font-semibold leading-tight text-ink">
          A family of four, this week
        </h2>
        <p className="max-w-[36ch] text-small text-ink-soft">
          Open a row to compare local, online, and overseas listings. This does not place an order. Amazon prices observed
          on 4 Oct 2026 are not a guarantee.
        </p>
      </div>
      <ul className="flex min-w-0 flex-col">
        {FAMILY_ITEMS.map((item) => (
          <FamilyRow
            key={item.id}
            item={item}
            open={openId === item.id}
            result={byId[item.id]}
            onToggle={() => setOpenId((current) => (current === item.id ? null : item.id))}
            onRetry={() => setAttempt((current) => current + 1)}
          />
        ))}
      </ul>
    </section>
  );
}

function FamilyRow({
  item,
  open,
  result,
  onToggle,
  onRetry,
}: {
  item: FamilyItem;
  open: boolean;
  result?: BasketResult;
  onToggle: () => void;
  onRetry: () => void;
}) {
  const panelId = `family-offers-${item.id}`;
  return (
    <li className="min-w-0 border-b border-rule/70 last:border-b-0">
      <div className="flex min-w-0 items-stretch gap-2">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={panelId}
          onClick={onToggle}
          className="pressable flex min-h-14 min-w-0 flex-1 items-start gap-2 py-3 text-left"
        >
          <ChevronDown
            aria-hidden
            className={cn("mt-0.5 size-5 shrink-0 text-ink-soft transition-transform duration-200", open && "rotate-180")}
          />
          <span className="min-w-0 flex-1">
            <span className="block break-words text-body font-semibold text-ink">{item.title}</span>
            <span className="mt-1 block">
              {item.deliveredCents != null ? (
                <span className="money text-[1.35rem] leading-none text-ink" style={priceStyle}>
                  {formatUsd(item.deliveredCents)}
                </span>
              ) : (
                <span className="text-small text-ink-soft">The price was not listed</span>
              )}
            </span>
          </span>
        </button>
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="pressable inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center self-center px-2 text-small font-semibold text-ink underline decoration-rule underline-offset-4"
        >
          Amazon
        </a>
      </div>
      {open && (
        <div id={panelId} className="enter min-w-0 pb-3">
          <OfferPanel item={item} result={result} onRetry={onRetry} />
        </div>
      )}
    </li>
  );
}

function OfferPanel({ item, result, onRetry }: { item: FamilyItem; result?: BasketResult; onRetry: () => void }) {
  if (!result || result.status === "loading") {
    return (
      <div aria-hidden className="flex flex-col gap-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (result.status === "error") {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <p role="alert" className="rounded-card bg-carmine-wash px-3 py-3 text-small text-carmine">
          {result.error}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="pressable inline-flex min-h-11 items-center self-start text-small font-semibold text-ink underline decoration-rule underline-offset-4"
        >
          Try the search again
        </button>
      </div>
    );
  }

  const groups = LANES.map((lane) => ({
    lane,
    offers: result.offers.filter((offer) => offer.lane === lane.id),
  }));

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <p className="text-small text-ink-soft">
        {result.jev === "live" ? "Match is Jev." : "Jev did not score."} {provenanceSentence(result.provenance)}
      </p>
      {groups.map(({ lane, offers }) => (
        <div key={lane.id} className="surface min-w-0 overflow-hidden">
          <div className="px-3 py-3">
            <h3 className="text-small font-semibold text-ink">{lane.label}</h3>
            <p className="text-micro text-ink-faint">{lane.hint}</p>
          </div>
          {offers.length === 0 ? (
            <p className="border-t border-rule/70 px-3 py-3 text-small text-ink-soft">No listing in this group.</p>
          ) : (
            <ul>
              {offers.map((offer, index) => (
                <OfferRow key={`${offer.storeId}-${offer.lane}-${index}`} item={item} offer={offer} />
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

function OfferRow({ item, offer }: { item: FamilyItem; offer: ComparedOffer }) {
  const same = offer.match != null && offer.match >= MATCH_FLOOR;
  const save =
    same && item.deliveredCents != null && offer.deliveredCents != null ? item.deliveredCents - offer.deliveredCents : 0;
  return (
    <li className="min-w-0 border-t border-rule/70 px-3 py-3">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="break-words text-body font-semibold text-ink">{offer.storeName}</p>
          <p className="break-words text-small text-ink-soft">{offer.title}</p>
        </div>
        <p className="shrink-0 text-right text-small font-semibold tabular-nums text-ink">
          {offer.match == null ? "Not scored" : `${Math.round(offer.match * 100)}%`}
          {offer.match != null && offer.match < MATCH_FLOOR && (
            <span className="block font-normal text-ink-soft">Different item</span>
          )}
        </p>
      </div>
      <div className="mt-2 flex min-w-0 items-end justify-between gap-3">
        <div className="min-w-0">
          {offer.deliveredCents != null ? (
            <p className="money text-[1.25rem] leading-none text-ink" style={priceStyle}>
              {formatUsd(offer.deliveredCents)}
            </p>
          ) : (
            <p className="text-small text-ink-soft">Price not listed</p>
          )}
          {save > 0 && <p className="money mt-1 text-small font-semibold text-margin">Save {formatUsd(save)}</p>}
          <p className="mt-1 text-micro font-semibold text-ink-soft">{offer.provenance === "live" ? "Live" : "Sample"}</p>
          {offer.shippingCents > 0 && <p className="text-micro text-ink-faint">{formatUsd(offer.shippingCents)} shipping</p>}
          {offer.dutyCents > 0 && <p className="text-micro text-ink-faint">{formatUsd(offer.dutyCents)} duty est.</p>}
          {offer.lane === "overseas" && offer.dutyCents === 0 && (
            <p className="text-micro text-ink-faint">Duty not included</p>
          )}
        </div>
        {offer.url ? (
          <a
            href={offer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="pressable inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center text-small font-semibold text-ink underline decoration-rule underline-offset-4"
          >
            Open
          </a>
        ) : null}
      </div>
    </li>
  );
}

function provenanceSentence(provenance: BasketResult["provenance"]): string {
  if (provenance === "live") return "Live prices.";
  if (provenance === "mixed") return "Some prices are sample data.";
  return "Sample prices.";
}
