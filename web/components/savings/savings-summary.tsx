import type { SavingsRun } from "@buyer/contract";
import { ProvenanceBadge } from "@/components/provenance";
import { Skeleton } from "@/components/ui/skeleton";
import type { DataSource } from "@/lib/api";
import { formatUsd, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

/** One-line provenance under the Number, built only from SavingsRun.inputs. */
export function savingsProvenance(run: SavingsRun): string {
  const { receiptCount, itemCount, channels } = run.inputs;
  return `${plural(receiptCount, "receipt")}, ${plural(itemCount, "item")}, ${plural(channels.length, "channel")}`;
}

export function SavingsSummary({
  run,
  source,
  className,
}: {
  run: SavingsRun;
  source?: DataSource;
  className?: string;
}) {
  const { includedItemCount, itemCount } = run.inputs;
  return (
    <article className={cn("surface relative flex flex-col gap-4 overflow-hidden p-5", className)}>
      <header className="flex items-start justify-between gap-3">
        <h3 className="text-small font-semibold text-ink-soft">Found in your receipts</h3>
        <ProvenanceBadge provenance={run.provenance} source={source} />
      </header>

      {run.status === "running" ? (
        <div className="flex flex-col gap-2" aria-busy aria-label="Pricing your items">
          <Skeleton className="h-16 w-64 rounded-chip bg-paper-sunk" />
          <p className="text-small text-ink-soft">Pricing your items across every channel.</p>
        </div>
      ) : run.status === "error" ? (
        <p className="text-body text-carmine">This run stopped before it finished. Run the scan again.</p>
      ) : (
        <div className="flex flex-col gap-1">
          <p className="flex items-baseline gap-3 text-margin">
            <span className="type-number text-[4.5rem]">{formatUsd(run.yearlySavingsCents)}</span>
            <span className="text-body font-semibold">a year</span>
          </p>
          <p className="text-body text-ink">From {savingsProvenance(run)}.</p>
        </div>
      )}

      <footer className="flex flex-wrap gap-x-4 gap-y-1 border-t border-rule/70 pt-3 text-small text-ink-soft">
        <span>
          {includedItemCount} of {itemCount} items priced
        </span>
        <span>Sales tax excluded</span>
        <span>Duty is an estimate</span>
      </footer>
    </article>
  );
}

export function SavingsSummarySkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("surface flex flex-col gap-4 p-5", className)} aria-busy aria-label="Loading savings">
      <Skeleton className="h-4 w-40 rounded-chip bg-paper-sunk" />
      <Skeleton className="h-16 w-72 rounded-chip bg-paper-sunk" />
      <Skeleton className="h-4 w-56 rounded-chip bg-paper-sunk" />
    </div>
  );
}
