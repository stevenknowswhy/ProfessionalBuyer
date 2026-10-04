import type { Item, ItemSavings } from "@buyer/contract";
import { BadgeCheck } from "lucide-react";
import { ProvenanceBadge } from "@/components/provenance";
import type { DataSource } from "@/lib/api";
import { CHANNEL_NAMES, formatUnitCents, formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

export function OfferTable({
  savings,
  item,
  source,
  className,
}: {
  savings: ItemSavings;
  item?: Item;
  source?: DataSource;
  className?: string;
}) {
  const unit = item?.unit ?? "unit";
  const ranked = savings.offers.filter((o) => !o.excludedReason);
  const excluded = savings.offers.filter((o) => o.excludedReason);
  const provenance = savings.offers.find((o) => o.provenance !== "live")?.provenance ?? savings.offers[0]?.provenance;

  return (
    <article className={cn("surface flex flex-col overflow-hidden", className)}>
      <header className="flex items-start justify-between gap-4 p-5 pb-4">
        <div className="flex flex-col gap-1">
          <h3 className="type-heading text-[1.25rem] text-ink">{item?.name ?? savings.itemId}</h3>
          <p className="text-small text-ink-soft">
            You pay <span className="money text-ink">{formatUnitCents(savings.currentUnitCostCents)}</span> per {unit}{" "}
            today.{" "}
            {savings.savingPerBuyCents > 0 ? (
              <>
                The best offer saves <span className="money font-semibold text-margin">{formatUsd(savings.savingPerBuyCents)}</span> per buy.
              </>
            ) : (
              "You already pay the best price."
            )}
          </p>
        </div>
        <ProvenanceBadge provenance={provenance} source={source} />
      </header>

      <table className="w-full border-collapse text-small">
        <caption className="sr-only">Offers for {item?.name ?? savings.itemId}, delivered cost and cost per {unit}</caption>
        <thead>
          <tr className="bg-paper-sunk/70 text-left text-ink-soft">
            <th scope="col" className="py-2 pr-3 pl-5 font-semibold">Offer</th>
            <th scope="col" className="px-3 py-2 font-semibold">Channel</th>
            <th scope="col" className="px-3 py-2 text-right font-semibold">Delivered</th>
            <th scope="col" className="py-2 pr-5 pl-3 text-right font-semibold">Per {unit}</th>
          </tr>
        </thead>
        <tbody>
          {ranked.map((offer) => {
            const best = offer.id === savings.bestOfferId;
            return (
              <tr key={offer.id} className={cn("border-t border-rule/60 align-top", best && "bg-margin-wash/70")}>
                <td className="py-2.5 pr-3 pl-5">
                  <p className="flex items-center gap-2 font-semibold text-ink">
                    {offer.retailer}
                    {best && <span className="rounded-full bg-margin px-2 py-0.5 text-micro font-semibold text-paper-raised">Best</span>}
                    {offer.verifiedByKernel && (
                      <span className="inline-flex items-center gap-1 text-micro font-semibold text-margin">
                        <BadgeCheck aria-hidden className="size-3.5" /> Verified by Kernel
                      </span>
                    )}
                    {!offer.inStock && <span className="text-micro font-semibold text-carmine">Out of stock</span>}
                  </p>
                  <p className="text-ink-soft">{offer.title}</p>
                </td>
                <td className="px-3 py-2.5 text-ink-soft">{CHANNEL_NAMES[offer.channel]}</td>
                <td className="money px-3 py-2.5 text-right text-ink">
                  {formatUsd(offer.deliveredCents)}
                  {offer.shippingCents + offer.dutyEstimateCents > 0 && (
                    <span className="block text-micro text-ink-faint">
                      incl. {offer.shippingCents > 0 ? `${formatUsd(offer.shippingCents)} shipping` : ""}
                      {offer.shippingCents > 0 && offer.dutyEstimateCents > 0 ? ", " : ""}
                      {offer.dutyEstimateCents > 0 ? `${formatUsd(offer.dutyEstimateCents)} duty est.` : ""}
                    </span>
                  )}
                </td>
                <td className={cn("money py-2.5 pr-5 pl-3 text-right", best ? "font-semibold text-margin" : "text-ink")}>
                  {formatUnitCents(offer.unitCostCents)}
                </td>
              </tr>
            );
          })}
          {excluded.map((offer) => (
            <tr key={offer.id} className="border-t border-rule/60 align-top text-ink-faint">
              <td className="py-2.5 pr-3 pl-5">
                <p className="font-semibold line-through decoration-ink-faint/60">{offer.retailer}</p>
                <p>{offer.title}</p>
              </td>
              <td className="px-3 py-2.5">{CHANNEL_NAMES[offer.channel]}</td>
              <td colSpan={2} className="py-2.5 pr-5 pl-3 text-right text-ink-soft">
                Not ranked: {offer.excludedReason}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {savings.history.enough === false && (
        <p className="border-t border-rule/60 px-5 py-3 text-small text-ink-soft">
          <span className="font-semibold text-ink">Left out of the total.</span> {savings.history.reason}
        </p>
      )}
    </article>
  );
}
