"use client";

import { Camera, LayoutGrid, Store } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { CaptureReceipt } from "@/components/phone/capture-receipt";
import { CompareMatrix } from "@/components/phone/compare-matrix";
import { Onboarding } from "@/components/phone/onboarding";
import { SettingsScreen } from "@/components/phone/settings-screen";
import { Wordmark } from "@/components/shell/top-bar";
import { StoreBoard } from "@/components/stores/store-board";
import { useHousehold } from "@/lib/hooks";
import { useProfile } from "@/lib/use-profile";
import type { ReceiptLine } from "@/lib/receipt";
import { chosenStores } from "@/lib/stores";
import { useStoreSelection } from "@/lib/use-stores";
import { cn } from "@/lib/utils";

type Tab = "receipt" | "compare" | "stores";

export function BuyerApp() {
  const household = useHousehold();
  const profileState = useProfile();
  const stores = useStoreSelection();
  const [tab, setTab] = useState<Tab>("receipt");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [line, setLine] = useState<ReceiptLine | null>(null);
  const [retailer, setRetailer] = useState("");
  const [source, setSource] = useState<"vision" | "sample">("vision");
  const count = chosenStores(stores.selection).length;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab, settingsOpen]);

  if (!profileState.hydrated) {
    return <div className="min-h-dvh bg-paper" />;
  }

  if (!profileState.completed) {
    return <Onboarding initial={profileState.profile} onComplete={profileState.complete} />;
  }

  function selectTab(next: Tab) {
    setSettingsOpen(false);
    setTab(next);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-3xl flex-col bg-paper">
      <header className="phone-header sticky top-0 z-30 border-b border-rule bg-paper">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Wordmark />
          {settingsOpen ? (
            <button
              type="button"
              onClick={() => setSettingsOpen(false)}
              className="pressable min-h-11 shrink-0 rounded-chip px-3 text-small font-semibold text-ink"
            >
              Done
            </button>
          ) : (
            <div className="flex shrink-0 items-center gap-1">
              <p className="text-small text-ink-soft tabular-nums">{count === 1 ? "1 store" : `${count} stores`}</p>
              <button
                type="button"
                onClick={() => setSettingsOpen(true)}
                className="pressable min-h-11 rounded-chip px-3 text-small font-semibold text-ink"
              >
                Settings
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="phone-main flex w-full min-w-0 flex-1 flex-col px-4 pt-5">
        {settingsOpen ? (
          <SettingsScreen profile={profileState.profile} onSave={profileState.save} />
        ) : null}
        {!settingsOpen && tab === "receipt" && (
          <CaptureReceipt
            household={household.data}
            householdError={
              household.error instanceof Error
                ? household.error.message
                : household.error
                  ? "The sample household did not load."
                  : null
            }
            onCompare={(next, nextSource, nextRetailer) => {
              setLine(next);
              setSource(nextSource);
              setRetailer(nextRetailer);
              setTab("compare");
            }}
          />
        )}
        {!settingsOpen && tab === "compare" && (
          <CompareMatrix
            line={line}
            retailer={retailer}
            source={source}
            household={household.data}
            stores={stores.selection}
            onRetake={() => setTab("receipt")}
          />
        )}
        {!settingsOpen && tab === "stores" && (
          <StoreBoard
            selection={stores.selection}
            onToggle={stores.toggle}
            onAddLink={stores.addLink}
            onRemoveCustom={stores.removeCustom}
          />
        )}
      </main>

      <nav aria-label="Sections" className="phone-tabs fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper-raised">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-3">
          <TabButton current={settingsOpen ? null : tab} id="receipt" label="Receipt" icon={<Camera aria-hidden className="size-5" />} onSelect={selectTab} />
          <TabButton current={settingsOpen ? null : tab} id="compare" label="Compare" icon={<LayoutGrid aria-hidden className="size-5" />} onSelect={selectTab} />
          <TabButton current={settingsOpen ? null : tab} id="stores" label="Stores" icon={<Store aria-hidden className="size-5" />} onSelect={selectTab} />
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
  current: Tab | null;
  id: Tab;
  label: string;
  icon: ReactNode;
  onSelect: (tab: Tab) => void;
}) {
  const selected = current === id;
  return (
    <button
      type="button"
      aria-current={selected ? "page" : undefined}
      onClick={() => onSelect(id)}
      className={cn(
        "pressable relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-2 text-small font-semibold",
        selected ? "bg-margin-wash text-ink" : "text-ink-soft",
      )}
    >
      <span aria-hidden className={cn("absolute inset-x-5 top-0 h-0.5 rounded-full", selected ? "bg-margin" : "bg-transparent")} />
      <span className={selected ? "text-margin" : undefined}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}
