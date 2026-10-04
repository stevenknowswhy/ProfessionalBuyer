"use client";

import { formatUsd } from "@buyer/contract";
import { MOCK_SAVINGS } from "@/lib/mock-savings";

const figureStyle = {
  fontFamily: "display, Georgia, serif",
  fontWeight: 500,
  fontOpticalSizing: "none",
  fontVariationSettings: '"opsz" 48',
} as const;

export function HomeScreen({ cleared, onReceipt }: { cleared: boolean; onReceipt: () => void }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="type-heading text-[1.75rem] text-ink">Money kept</h1>
        <p className="max-w-[34ch] text-body text-ink-soft">
          {cleared
            ? "The sample ledger is cleared. Real savings will show here after the buyer works from your receipts."
            : "This is the sample ledger, so you can see the home screen before a receipt is in."}
        </p>
      </div>

      {cleared ? (
        <EmptyLedger />
      ) : (
        <div className="flex flex-col gap-3">
          <SavingsCard
            label="This year"
            cents={MOCK_SAVINGS.yearCents}
            items={MOCK_SAVINGS.yearItems}
            prominent
          />
          <SavingsCard label="This month" cents={MOCK_SAVINGS.monthCents} items={MOCK_SAVINGS.monthItems} />
          <p className="text-small text-ink-soft">Mock data. Clear it in Settings when you want an empty ledger.</p>
        </div>
      )}

      <button
        type="button"
        onClick={onReceipt}
        className="pressable min-h-12 w-full rounded-chip bg-ink px-4 text-small font-semibold text-paper-raised"
      >
        Photograph a receipt
      </button>
    </div>
  );
}

function SavingsCard({
  label,
  cents,
  items,
  prominent = false,
}: {
  label: string;
  cents: number;
  items: number;
  prominent?: boolean;
}) {
  return (
    <section className="surface flex min-w-0 flex-col gap-2 px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-small font-semibold text-ink">{label}</h2>
        <p className="rounded-full bg-margin-wash px-2 py-1 text-micro font-semibold text-margin">Mock</p>
      </div>
      <p
        className={prominent ? "money text-[3.25rem] leading-none text-margin" : "money text-[2.25rem] leading-none text-margin"}
        style={figureStyle}
      >
        {formatUsd(cents)}
      </p>
      <p className="text-body text-ink">
        {items} {items === 1 ? "item" : "items"}
      </p>
    </section>
  );
}

function EmptyLedger() {
  return (
    <section className="surface flex flex-col gap-2 px-4 py-5">
      <h2 className="text-small font-semibold text-ink">This year</h2>
      <p className="text-body text-ink">No savings recorded yet.</p>
      <h2 className="mt-2 text-small font-semibold text-ink">This month</h2>
      <p className="text-body text-ink">No savings recorded yet.</p>
    </section>
  );
}
