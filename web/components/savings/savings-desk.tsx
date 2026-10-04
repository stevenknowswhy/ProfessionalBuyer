import type { Household, SavingsRun } from "@buyer/contract";
import { OfferTable } from "@/components/offers/offer-table";
import { SavingsSummary } from "@/components/savings/savings-summary";
import type { DataSource } from "@/lib/api";

/** Yearly savings and the offer tables, the center of /app. */
export function SavingsDesk({
  household,
  savings,
  source,
}: {
  household?: Household;
  savings: SavingsRun;
  source: DataSource;
}) {
  const items = new Map(household?.items.map((item) => [item.id, item]) ?? []);
  const rows = [...savings.items].sort((a, b) => (b.yearlySavingsCents ?? -1) - (a.yearlySavingsCents ?? -1));

  return (
    <div className="@container flex flex-col gap-8">
      <SavingsSummary run={savings} source={source} prominent />
      <div className="flex flex-col gap-5">
        {rows.map((row) => (
          <OfferTable key={row.itemId} savings={row} item={items.get(row.itemId)} source={source} />
        ))}
      </div>
    </div>
  );
}
