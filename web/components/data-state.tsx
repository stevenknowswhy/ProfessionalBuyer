"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiRequestError } from "@/lib/api";
import { cn } from "@/lib/utils";

const HEADLINES: Record<ApiRequestError["kind"], string> = {
  network: "The buyer service is not reachable",
  http: "The buyer service returned an error",
  contract: "This response did not match the contract",
  "not-found": "Nothing here yet",
};

export function DataError({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  const known = error instanceof ApiRequestError ? error : null;
  const headline = known ? HEADLINES[known.kind] : "Something failed while loading this";
  const message = known?.message ?? (error instanceof Error ? error.message : String(error));
  const firstIssue = known?.issues?.[0];

  return (
    <div role="alert" className={cn("surface flex flex-col gap-3 border-l-2 border-carmine p-4", className)}>
      <div className="flex flex-col gap-1">
        <p className="text-body font-semibold text-ink">{headline}</p>
        <p className="text-small text-ink-soft">{message}</p>
      </div>
      {known && (
        <p className="type-formula text-ink-soft">
          {known.endpoint}
          {known.status ? `, status ${known.status}` : ""}
          {firstIssue ? `, ${firstIssue.path.join(".") || "root"}: ${firstIssue.message}` : ""}
        </p>
      )}
      {onRetry && (
        <div>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}

export function EmptyState({
  title,
  body,
  action,
  className,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-2 rounded-card border border-dashed border-rule p-5", className)}>
      <p className="type-heading text-[1.125rem] text-ink">{title}</p>
      <p className="max-w-[44ch] text-small text-ink-soft">{body}</p>
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

export function RowsSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-2", className)} aria-busy aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-chip bg-paper-sunk" />
      ))}
    </div>
  );
}
