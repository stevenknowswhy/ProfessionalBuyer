import type { Household, SavingsRun } from "@buyer/contract";
import { ArrowUp } from "lucide-react";
import { OfferTable } from "@/components/offers/offer-table";
import { SavingsSummary } from "@/components/savings/savings-summary";
import { Button } from "@/components/ui/button";
import type { DataSource } from "@/lib/api";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

function Turn({ who, children, i }: { who: "You" | "Buyer"; children: React.ReactNode; i: number }) {
  return (
    <li className="enter grid grid-cols-[4rem_minmax(0,1fr)] gap-x-4" style={{ "--i": i } as React.CSSProperties}>
      <span className={cn("pt-0.5 text-small font-semibold", who === "You" ? "text-ink-soft" : "text-ink")}>{who}</span>
      <div className="flex min-w-0 flex-col gap-3">{children}</div>
    </li>
  );
}

/**
 * Static transcript built from the sample savings run, standing in until the assistant-ui thread lands.
 * Every figure comes from the run; the prose only names counts and items.
 */
export function ConversationPreview({
  household,
  savings,
  source,
}: {
  household?: Household;
  savings: SavingsRun;
  source: DataSource;
}) {
  const items = new Map(household?.items.map((i) => [i.id, i]) ?? []);
  const top = [...savings.items]
    .filter((s) => s.yearlySavingsCents !== null)
    .sort((a, b) => (b.yearlySavingsCents ?? 0) - (a.yearlySavingsCents ?? 0))[0];
  const topItem = top ? items.get(top.itemId) : undefined;
  const { receiptCount, itemCount, includedItemCount } = savings.inputs;

  return (
    <ol className="flex flex-col gap-8">
      <Turn who="You" i={0}>
        <p className="text-body text-ink">Scan my receipts.</p>
      </Turn>
      <Turn who="Buyer" i={1}>
        <p className="max-w-[62ch] text-body text-ink">
          I read {plural(receiptCount, "receipt")} and found {plural(itemCount, "thing")} you buy again and again.{" "}
          {includedItemCount === itemCount
            ? "All of them have enough history to price."
            : `${includedItemCount} have enough history to price; the rest are listed but left out of the total.`}
        </p>
        <SavingsSummary run={savings} source={source} />
      </Turn>
      {top && (
        <>
          <Turn who="You" i={2}>
            <p className="text-body text-ink">Where does most of it come from?</p>
          </Turn>
          <Turn who="Buyer" i={3}>
            <p className="max-w-[62ch] text-body text-ink">
              {topItem?.name ?? top.itemId} is the biggest line. Here is every offer I found, with shipping and duty
              included, compared per {topItem?.unit ?? "unit"}.
            </p>
            <OfferTable savings={top} item={topItem} source={source} />
          </Turn>
        </>
      )}
    </ol>
  );
}

const SUGGESTIONS = ["Scan my receipts", "Buy the cheapest", "What are you watching?"];

export function ComposerPreview() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <Button key={s} variant="outline" size="sm" disabled className="rounded-full">
            {s}
          </Button>
        ))}
      </div>
      <div className="surface flex items-end gap-2 p-2 pl-4">
        <label htmlFor="composer-preview" className="sr-only">
          Message your buyer
        </label>
        <textarea
          id="composer-preview"
          rows={1}
          disabled
          placeholder="Ask your buyer to find, compare or buy something"
          className="min-h-10 flex-1 resize-none bg-transparent py-2 text-body text-ink placeholder:text-ink-faint focus:outline-none disabled:cursor-not-allowed"
        />
        <Button size="icon" disabled aria-label="Send">
          <ArrowUp aria-hidden />
        </Button>
      </div>
      <p className="text-micro text-ink-faint">Live chat connects in the next build. This conversation is a preview built from sample data.</p>
    </div>
  );
}
