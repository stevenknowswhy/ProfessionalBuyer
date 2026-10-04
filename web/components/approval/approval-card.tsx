"use client";

import type { Approval } from "@buyer/contract";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { ProvenanceBadge } from "@/components/provenance";
import { Button } from "@/components/ui/button";
import type { DataSource } from "@/lib/api";
import { formatUsd } from "@/lib/format";
import { cn } from "@/lib/utils";

const STATUS_LINE: Record<Approval["status"], string> = {
  pending: "Needs your approval",
  approved: "Approved, starting checkout",
  executing: "Checking out",
  completed: "Done",
  declined: "Declined",
  blocked: "Blocked",
  failed: "Checkout failed",
};

function outcome(a: Approval): string {
  switch (a.status) {
    case "pending":
      return a.mode === "review"
        ? "Approving opens the checkout and stops at the order review page. Nothing is bought."
        : "Approving places the order with the card stored in your vault.";
    case "approved":
      return "Your approval is recorded. The browser is starting.";
    case "executing":
      return a.mode === "review" ? "Filling the cart. It will stop before placing the order." : "Filling the cart and placing the order.";
    case "completed":
      return a.checkout?.stoppedAt === "placed"
        ? `Order placed${a.checkout.orderRef ? `, reference ${a.checkout.orderRef}` : ""}.`
        : "Stopped at the order review page. Nothing was bought.";
    case "declined":
      return "You declined this purchase. Nothing was bought.";
    case "blocked":
      return a.blockedReason ?? "The server refused this purchase.";
    case "failed":
      return a.blockedReason ?? "The checkout did not finish. Nothing was bought.";
  }
}

export function ApprovalCard({
  approval,
  onApprove,
  onDecline,
  source,
  className,
}: {
  approval: Approval;
  onApprove?: (id: string) => Promise<unknown>;
  onDecline?: (id: string) => Promise<unknown>;
  source?: DataSource;
  className?: string;
}) {
  const [busy, setBusy] = useState<"approve" | "decline" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const a = approval;
  const capShare = Math.min(1, a.capCents > 0 ? a.amountCents / a.capCents : 1);
  const tone =
    a.status === "blocked" || a.status === "failed"
      ? "carmine"
      : a.status === "completed"
        ? "margin"
        : a.status === "pending"
          ? "flag"
          : "ink";

  const act = async (kind: "approve" | "decline") => {
    const fn = kind === "approve" ? onApprove : onDecline;
    if (!fn) return;
    setBusy(kind);
    setError(null);
    try {
      await fn(a.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <article
      aria-live="polite"
      className={cn("surface-lift flex flex-col gap-4 p-4", tone === "carmine" && "shadow-[0_0_0_1px_var(--carmine),var(--shadow-lift)]", className)}
    >
      <header className="flex items-center justify-between gap-3">
        <p
          className={cn(
            "text-small font-semibold",
            tone === "flag" && "highlight-flag text-ink",
            tone === "carmine" && "text-carmine",
            tone === "margin" && "text-margin",
            tone === "ink" && "text-ink-soft",
          )}
        >
          {STATUS_LINE[a.status]}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-micro font-semibold text-ink-soft">{a.mode === "review" ? "Review mode" : "Place mode"}</span>
          <ProvenanceBadge source={source} />
        </div>
      </header>

      <div className="flex items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <span className="text-small text-ink-soft">Buy from</span>
          <span className="type-heading truncate text-ink">{a.merchant}</span>
        </div>
        <span className="type-number text-[2.5rem] text-ink">{formatUsd(a.amountCents)}</span>
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="h-1.5 overflow-hidden rounded-full bg-paper-sunk" aria-hidden>
          <div
            className={cn("h-full rounded-full", a.amountCents > a.capCents ? "bg-carmine" : "bg-ink")}
            style={{ width: `${capShare * 100}%` }}
          />
        </div>
        <p className="money text-small text-ink-soft">
          {a.amountCents > a.capCents ? "Over" : "Within"} your {formatUsd(a.capCents)} spending cap
        </p>
      </div>

      {a.status === "executing" && (
        <div className="h-0.5 overflow-hidden rounded-full bg-paper-sunk" role="progressbar" aria-label="Checking out">
          <div className="indeterminate h-full w-1/3 rounded-full bg-ink" />
        </div>
      )}

      <p className={cn("text-small", tone === "carmine" ? "text-carmine" : "text-ink")}>{outcome(a)}</p>

      <p className="type-formula truncate text-ink-faint" title={a.offerHash}>
        offer {a.offerHash}
      </p>

      {(a.checkout?.liveViewUrl || a.checkout?.replayUrl) && (
        <div className="flex flex-wrap gap-3 text-small">
          {a.checkout?.liveViewUrl && (
            <a className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-ink underline-offset-4 hover:underline" href={a.checkout.liveViewUrl} target="_blank" rel="noreferrer">
              Open live view <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
          {a.checkout?.replayUrl && (
            <a className="inline-flex min-h-10 items-center gap-1.5 font-semibold text-ink underline-offset-4 hover:underline" href={a.checkout.replayUrl} target="_blank" rel="noreferrer">
              Watch the replay <ExternalLink aria-hidden className="size-3.5" />
            </a>
          )}
        </div>
      )}

      {a.status === "pending" && (onApprove || onDecline) && (
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <Button onClick={() => act("approve")} disabled={busy !== null}>
            {busy === "approve" ? "Approving" : `Approve ${formatUsd(a.amountCents)}`}
          </Button>
          <Button variant="outline" onClick={() => act("decline")} disabled={busy !== null}>
            {busy === "decline" ? "Declining" : "Decline"}
          </Button>
        </div>
      )}

      {error && (
        <p role="alert" className="text-small text-carmine">
          {error}
        </p>
      )}
    </article>
  );
}
