import type { Provenance } from "@buyer/contract";
import type { DataSource } from "@/lib/api";
import { cn } from "@/lib/utils";

type Label = "Sample data" | "Replayed" | "Demo household" | "Fallback";

/** Contract labeling rules: anything that is not live carries a visible label. */
export function provenanceLabel(provenance?: Provenance, source?: DataSource): Label | null {
  if (source === "fixture" || provenance === "sample") return "Sample data";
  if (provenance === "replayed") return "Replayed";
  return null;
}

export function Tag({ label, className, title }: { label: Label | string; className?: string; title?: string }) {
  return (
    <span
      title={title}
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-micro font-semibold whitespace-nowrap",
        "bg-paper-sunk text-ink-soft shadow-[inset_0_0_0_1px_var(--rule)]",
        className,
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full border border-current" />
      {label}
    </span>
  );
}

export function ProvenanceBadge({
  provenance,
  source,
  className,
}: {
  provenance?: Provenance;
  source?: DataSource;
  className?: string;
}) {
  const label = provenanceLabel(provenance, source);
  if (!label) return null;
  return (
    <Tag
      label={label}
      className={className}
      title={label === "Sample data" ? "From the contract sample fixtures, not a live service" : "Recorded earlier and replayed"}
    />
  );
}
