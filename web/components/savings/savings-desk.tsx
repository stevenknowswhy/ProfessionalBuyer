import type { Household, SavingsRun } from "@buyer/contract";
import { OfferTable } from "@/components/offers/offer-table";
import { SavingsSummary } from "@/components/savings/savings-summary";
import type { DataSource } from "@/lib/api";
import { chosenStores, retailerCoverage, type StoreSelection } from "@/lib/stores";

/** Yearly savings and the offer tables, the center of /app. */
export function SavingsDesk({
  household,
  savings,
  source,
  stores,
  onEditStores,
}: {
  household?: Household;
  savings: SavingsRun;
  source: DataSource;
  stores?: StoreSelection;
  onEditStores?: () => void;
}) {
  const items = new Map(household?.items.map((item) => [item.id, item]) ?? []);
  const rows = [...savings.items].sort((a, b) => (b.yearlySavingsCents ?? -1) - (a.yearlySavingsCents ?? -1));
  const names = stores ? chosenStores(stores).map((store) => store.name) : [];
  const searching =
    names.length === 0
      ? "Not searching any stores"
      : names.length === 1
        ? `Searching ${names[0]}`
        : names.length <= 8
          ? `Searching ${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`
          : `Searching ${names.slice(0, 6).join(", ")}, and ${(names.length - 6).toLocaleString("en-US")} more`;

  return (
    <div className="@container flex flex-col gap-8">
      <SavingsSummary run={savings} source={source} prominent />
      {stores && onEditStores && (
        <p className="text-small text-ink-soft">
          {searching}.{" "}
          <button type="button" onClick={onEditStores} className="font-semibold text-ink underline-offset-4 hover:underline">
            Edit stores
          </button>
        </p>
      )}
      <div className="flex flex-col gap-5">
        {rows.map((row) => (
          <OfferTable
            key={row.itemId}
            savings={row}
            item={items.get(row.itemId)}
            source={source}
            outsideStore={stores ? (retailer) => retailerCoverage(retailer, stores.selectedIds) === "out" : undefined}
          />
        ))}
      </div>
    </div>
  );
}
