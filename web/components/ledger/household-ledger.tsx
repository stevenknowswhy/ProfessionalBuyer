import type { Household, ItemSavings, SavingsRun } from "@buyer/contract";
import { EmptyState } from "@/components/data-state";
import { Tag } from "@/components/provenance";
import { formatDate, formatUsd, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

export function HouseholdLedger({
  household,
  savings,
  className,
}: {
  household: Household;
  savings?: SavingsRun | null;
  className?: string;
}) {
  const byItem = new Map<string, ItemSavings>(savings?.items.map((s) => [s.itemId, s]) ?? []);

  if (household.items.length === 0) {
    return (
      <EmptyState
        className={className}
        title="No purchases yet"
        body="Forward a receipt to the buyer's inbox or load the demo household. Items you buy again and again appear here."
      />
    );
  }

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <ol className="flex flex-col">
        {household.items.map((item, i) => {
          const purchases = household.purchases
            .filter((p) => p.itemId === item.id)
            .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
          const last = purchases[0];
          const s = byItem.get(item.id);
          const short = s && !s.history.enough;

          return (
            <li
              key={item.id}
              className="enter group grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 border-b border-rule/70 py-3.5 last:border-b-0"
              style={{ "--i": i } as React.CSSProperties}
            >
              <p className="text-body font-semibold text-ink">
                {s ? (
                  <a
                    href={`#offers-${item.id}`}
                    className="underline-offset-4 hover:underline"
                    onClick={(event) => {
                      const target = document.getElementById(`offers-${item.id}`);
                      if (!target) return;
                      event.preventDefault();
                      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                      target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
                    }}
                  >
                    {item.name}
                  </a>
                ) : (
                  item.name
                )}
              </p>
              <p className="money text-right text-body text-ink">{last ? formatUsd(last.lineTotalCents) : ""}</p>
              <p className="text-small text-ink-soft">
                {plural(purchases.length, "buy")}
                {last ? `, last on ${formatDate(last.date)} at ${last.retailer}` : ""}
              </p>
              <p className="text-right text-small text-ink-faint">last paid</p>
              {item.brand && item.brandStrictness === "exact" && (
                <p className="col-span-2 text-small text-ink-soft">{item.brand} only</p>
              )}
              {s && (
                <p className={cn("col-span-2 pt-0.5 text-small", short ? "text-ink-soft" : "text-margin")}>
                  {short || s.yearlySavingsCents === null ? (
                    <>
                      <span className="font-semibold">Not enough history.</span>{" "}
                      {s.history.enough ? "" : s.history.reason}
                    </>
                  ) : (
                    <>
                      <span className="money font-semibold">{formatUsd(s.yearlySavingsCents)}</span> a year to save,
                      bought {plural(s.history.purchaseCount, "time")} in {Math.round(s.history.spanDays)} days
                    </>
                  )}
                </p>
              )}
            </li>
          );
        })}
      </ol>

      <section aria-labelledby="ledger-receipts" className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between">
          <h3 id="ledger-receipts" className="text-small font-semibold text-ink">
            Recent receipts
          </h3>
          <span className="text-small text-ink-faint">{plural(household.receipts.length, "receipt")}</span>
        </div>
        <ul className="flex flex-col gap-1">
          {[...household.receipts]
            .sort((a, b) => Date.parse(b.receivedAt) - Date.parse(a.receivedAt))
            .slice(0, 4)
            .map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 rounded-chip py-1.5 text-small">
                <span className="truncate text-ink">
                  {r.retailer}
                  <span className="text-ink-faint">, {formatDate(r.receivedAt)}</span>
                </span>
                <span className="flex items-center gap-2">
                  {r.triage.via === "laya" && <Tag label="Laya" className="h-5 px-2" title={`Triaged by Laya, confidence ${r.triage.confidence}`} />}
                  <span className="money text-ink">{formatUsd(r.totalCents)}</span>
                </span>
              </li>
            ))}
        </ul>
      </section>
    </div>
  );
}
