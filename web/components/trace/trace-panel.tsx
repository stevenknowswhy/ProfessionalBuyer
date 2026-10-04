"use client";

import type { TraceEvent } from "@buyer/contract";
import { Check, Minus, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { EmptyState } from "@/components/data-state";
import { provenanceLabel } from "@/components/provenance";
import type { DataSource } from "@/lib/api";
import { SPONSOR_NAMES, formatDuration } from "@/lib/format";
import type { TraceStreamStatus } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const POLICY_STYLE: Record<NonNullable<TraceEvent["policy"]>, string> = {
  allow: "text-margin shadow-[inset_0_0_0_1px_currentColor]",
  ask: "bg-flag text-flag-ink",
  block: "bg-carmine text-paper-raised",
};

function StatusMark({ status }: { status: TraceEvent["status"] }) {
  const label = { running: "Running", ok: "Done", error: "Failed", skipped: "Skipped" }[status];
  return (
    <span className="grid size-4 place-items-center" title={label}>
      <span className="sr-only">{label}</span>
      {status === "running" && <span aria-hidden className="size-2 animate-pulse rounded-full bg-ink" />}
      {status === "ok" && <Check aria-hidden className="size-3.5 text-margin" strokeWidth={2.5} />}
      {status === "error" && <X aria-hidden className="size-3.5 text-carmine" strokeWidth={2.5} />}
      {status === "skipped" && <Minus aria-hidden className="size-3.5 text-ink-faint" strokeWidth={2.5} />}
    </span>
  );
}

export function TraceRow({ event, source }: { event: TraceEvent; source?: DataSource }) {
  const tag = provenanceLabel(event.provenance, source);
  return (
    <li className="enter grid grid-cols-[5.5rem_1fr_auto] items-start gap-x-3 py-2">
      <span className="inline-flex h-6 items-center justify-center rounded-chip bg-paper-sunk px-2 text-micro font-semibold text-ink shadow-[inset_0_0_0_1px_var(--rule)]">
        {SPONSOR_NAMES[event.sponsor]}
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 pt-0.5">
        <span className="text-small text-ink">{event.label}</span>
        {(event.policy || tag) && (
          <span className="flex flex-wrap items-center gap-1.5">
            {event.policy && (
              <span className={cn("rounded-full px-1.5 text-micro font-semibold", POLICY_STYLE[event.policy])}>
                Policy: {event.policy}
              </span>
            )}
            {tag && <span className="text-micro text-ink-faint">{tag}</span>}
          </span>
        )}
      </span>
      <span className="flex items-center gap-2 pt-0.5">
        <span className="money text-micro text-ink-faint">{formatDuration(event.durationMs)}</span>
        <StatusMark status={event.status} />
      </span>
    </li>
  );
}

const STATUS_TEXT: Record<TraceStreamStatus, string> = {
  connecting: "Connecting",
  open: "Listening",
  reconnecting: "Reconnecting",
  error: "Disconnected",
};

export function TracePanel({
  events,
  status,
  source,
  className,
}: {
  events: TraceEvent[];
  status: TraceStreamStatus;
  source?: DataSource;
  className?: string;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const stick = useRef(true);

  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [events.length]);

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      <p className="flex items-center gap-2 pb-2 text-micro text-ink-soft" aria-live="polite">
        <span
          aria-hidden
          className={cn(
            "size-1.5 rounded-full",
            status === "open" ? "bg-margin" : status === "error" ? "bg-carmine" : "bg-ink-faint",
          )}
        />
        {STATUS_TEXT[status]}
        {source === "fixture" ? ", simulated from sample data" : ""}
      </p>
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
        }}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {events.length === 0 ? (
          <EmptyState title="Quiet for now" body="Every step the buyer takes, and which service ran it, shows up here as it happens." />
        ) : (
          <ol className="flex flex-col divide-y divide-rule/60">
            {events.map((event) => (
              <TraceRow key={event.id} event={event} source={source} />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
