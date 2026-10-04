"use client";

import { Camera, LayoutGrid, Store } from "lucide-react";
import { useState } from "react";
import { CaptureReceipt } from "@/components/phone/capture-receipt";
import { CompareMatrix } from "@/components/phone/compare-matrix";
import { Wordmark } from "@/components/shell/top-bar";
import { StoreBoard } from "@/components/stores/store-board";
import { useHousehold } from "@/lib/hooks";
import type { ReceiptLine } from "@/lib/receipt";
import { chosenStores } from "@/lib/stores";
import { useStoreSelection } from "@/lib/use-stores";
import { cn } from "@/lib/utils";

type Tab = "receipt" | "compare" | "stores";

export function BuyerApp() {
  const household = useHousehold();
  const stores = useStoreSelection();
  const [tab, setTab] = useState<Tab>("receipt");
  const [line, setLine] = useState<ReceiptLine | null>(null);
  const [retailer, setRetailer] = useState("");
  const [source, setSource] = useState<"vision" | "sample">("vision");
  const count = chosenStores(stores.selection).length;

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col bg-paper">
      <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-3 border-b border-rule bg-paper/95 px-4 backdrop-blur-sm">
        <Wordmark />
        <p className="text-small text-ink-soft">{count === 1 ? "1 store" : `${count} stores`}</p>
      </header>

      <main className="flex-1 px-4 pt-5 pb-[calc(5.75rem+env(safe-area-inset-bottom))]">
        {tab === "receipt" && (
          <CaptureReceipt
            household={household.data}
            onCompare={(next, nextSource, nextRetailer) => {
              setLine(next);
              setSource(nextSource);
              setRetailer(nextRetailer);
              setTab("compare");
            }}
          />
        )}
        {tab === "compare" && (
          <CompareMatrix
            line={line}
            retailer={retailer}
            source={source}
            household={household.data}
            stores={stores.selection}
            onRetake={() => setTab("receipt")}
          />
        )}
        {tab === "stores" && (
          <StoreBoard
            selection={stores.selection}
            onToggle={stores.toggle}
            onAddLink={stores.addLink}
            onRemoveCustom={stores.removeCustom}
          />
        )}
      </main>

      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-20 border-t border-rule bg-paper-raised pb-[env(safe-area-inset-bottom)]"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-3">
          <TabButton current={tab} id="receipt" label="Receipt" icon={<Camera aria-hidden className="size-5" />} onSelect={setTab} />
          <TabButton current={tab} id="compare" label="Compare" icon={<LayoutGrid aria-hidden className="size-5" />} onSelect={setTab} />
          <TabButton current={tab} id="stores" label="Stores" icon={<Store aria-hidden className="size-5" />} onSelect={setTab} />
        </div>
      </nav>
    </div>
  );
}

function TabButton({
  current,
  id,
  label,
  icon,
  onSelect,
}: {
  current: Tab;
  id: Tab;
  label: string;
  icon: React.ReactNode;
  onSelect: (tab: Tab) => void;
}) {
  const selected = current === id;
  return (
    <button
      type="button"
      aria-current={selected ? "page" : undefined}
      onClick={() => onSelect(id)}
      className={cn(
        "pressable flex min-h-14 flex-col items-center justify-center gap-1 text-micro font-semibold",
        selected ? "text-margin" : "text-ink-soft",
      )}
    >
      {icon}
      {label}
    </button>
  );
}
