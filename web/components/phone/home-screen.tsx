"use client";

import { MoneyFigure } from "@/components/money-figure";
import { MOCK_SAVINGS } from "@/lib/mock-savings";

export function HomeScreen({ cleared, onReceipt }: { cleared: boolean; onReceipt: () => void }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="type-heading text-[1.75rem] text-ink">Income Reclaimed</h1>
        <p className="max-w-[34ch] text-body text-ink-soft">
          {cleared
            ? "The sample ledger is cleared. Real savings will show here after the buyer works from your receipts."
            : "This is the sample ledger, so you can see the home screen before a receipt is in."}
        </p>
      </div>

      {cleared ? <EmptyLedger /> : <SampleLedger />}

      <button
        type="button"
        onClick={onReceipt}
        className="pressable min-h-12 w-full rounded-chip bg-ink px-4 text-body font-semibold text-paper-raised"
      >
        Photograph a receipt
      </button>
    </div>
  );
}

function SampleLedger() {
  return (
    <div className="flex min-w-0 flex-col">
      <p className="w-fit rounded-full bg-margin-wash px-2.5 py-1 text-small font-semibold text-margin">Mock</p>

      <section className="mt-5 flex min-w-0 flex-col gap-3">
        <h2 className="text-body font-semibold text-ink">This year</h2>
        <div className="year-slot">
          <MoneyFigure cents={MOCK_SAVINGS.yearCents} className="home-year text-margin" />
        </div>
        <p className="text-body text-ink">{MOCK_SAVINGS.yearItems} items</p>
      </section>

      <section className="mt-8 flex min-w-0 flex-col gap-1 border-t border-rule pt-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-body font-semibold text-ink">This month</h2>
          <MoneyFigure cents={MOCK_SAVINGS.monthCents} className="shrink-0 text-[1.75rem] text-margin" />
        </div>
        <p className="text-body text-ink">{MOCK_SAVINGS.monthItems} items</p>
      </section>

      <p className="mt-5 max-w-[36ch] text-body text-ink-soft">
        Mock data. Clear it in Settings when you want an empty ledger.
      </p>
    </div>
  );
}

function EmptyLedger() {
  return (
    <div className="flex min-w-0 flex-col">
      <section className="flex flex-col gap-1">
        <h2 className="text-body font-semibold text-ink">This year</h2>
        <p className="text-body text-ink">No savings recorded yet.</p>
      </section>
      <section className="mt-6 flex flex-col gap-1 border-t border-rule pt-4">
        <h2 className="text-body font-semibold text-ink">This month</h2>
        <p className="text-body text-ink">No savings recorded yet.</p>
      </section>
    </div>
  );
}
