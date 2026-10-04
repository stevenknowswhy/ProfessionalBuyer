import type { Health, Household } from "@buyer/contract";
import { ProvenanceBadge, Tag } from "@/components/provenance";
import type { DataSource } from "@/lib/api";

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="font-display text-[1.75rem] leading-none tracking-[-0.02em] text-ink [font-variation-settings:'opsz'_48]">
        Margin
      </span>
    </span>
  );
}

export function TopBar({
  household,
  health,
  source,
  storeCount,
  storesOpen,
  onStores,
}: {
  household?: Household;
  health?: Health;
  source: DataSource;
  storeCount?: number;
  storesOpen?: boolean;
  onStores?: () => void;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-6 border-b border-rule px-6">
      <div className="flex items-center gap-5">
        <Wordmark />
        <span className="hidden text-small text-ink-soft lg:inline">Your household&apos;s professional buyer</span>
      </div>
      <div className="flex items-center gap-2">
        {onStores && (
          <button
            type="button"
            onClick={onStores}
            aria-pressed={storesOpen}
            className="pressable inline-flex min-h-10 items-center gap-2 rounded-chip bg-ink px-3 text-small font-semibold text-paper-raised"
          >
            {storesOpen ? "Ledger" : "Stores"}
            {!storesOpen && typeof storeCount === "number" && (
              <span className="text-micro font-medium text-paper-raised/80">{storeCount}</span>
            )}
          </button>
        )}
        {household && <span className="hidden text-small font-semibold text-ink sm:inline">{household.name}</span>}
        {household?.isDemoHousehold && <Tag label="Demo household" />}
        <ProvenanceBadge source={source} />
        {health && (
          <span
            className="ml-2 inline-flex h-6 items-center rounded-full bg-ink px-2.5 text-micro font-semibold text-paper-raised"
            title={
              health.checkoutMode === "review"
                ? "Checkout stops at the order review page"
                : "Checkout places real orders after your approval"
            }
          >
            {health.checkoutMode === "review" ? "Review mode" : "Place mode"}
          </span>
        )}
      </div>
    </header>
  );
}
