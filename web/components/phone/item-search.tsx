"use client";

import { useState, type FormEvent } from "react";
import type { Household } from "@buyer/contract";
import { CompareMatrix } from "@/components/phone/compare-matrix";
import type { ReceiptLine } from "@/lib/receipt";
import type { StoreSelection } from "@/lib/stores";

export function ItemSearch({
  household,
  stores,
}: {
  household?: Household;
  stores: StoreSelection;
}) {
  const [draft, setDraft] = useState("");
  const [line, setLine] = useState<ReceiptLine | null>(null);

  function search(event: FormEvent) {
    event.preventDefault();
    const name = draft.trim();
    if (!name) return;
    setLine({ id: `search-${name}`, name, quantity: 1, unit: "unit", lineTotalCents: 0 });
  }

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <div className="flex flex-col gap-2">
        <h1 className="type-heading text-[1.75rem] text-ink">Search</h1>
        <p className="max-w-[34ch] text-body text-ink-soft">Look up an item across the stores in your list.</p>
      </div>
      <form onSubmit={search} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-small font-semibold text-ink">Item</span>
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="field w-full rounded-chip border border-rule bg-paper-raised px-3 text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
            enterKeyHint="search"
            autoComplete="off"
          />
        </label>
        <button
          type="submit"
          className="pressable min-h-12 w-full rounded-chip bg-ink px-4 text-small font-semibold text-paper-raised"
        >
          Search stores
        </button>
      </form>
      {line && (
        <CompareMatrix
          line={line}
          retailer=""
          source="vision"
          household={household}
          stores={stores}
          onRetake={() => setLine(null)}
          intent="search"
        />
      )}
    </div>
  );
}
