"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

export type MoreItem = "search" | "ledger" | "stores" | "settings";

const ITEMS: { id: MoreItem; label: string; detail: string }[] = [
  { id: "search", label: "Search", detail: "Look up an item across your stores." },
  { id: "ledger", label: "Ledger", detail: "Purchases the household already made." },
  { id: "stores", label: "Stores", detail: "The places Genie is allowed to search." },
  { id: "settings", label: "Settings", detail: "Address, shopping preferences, and mock data." },
];

export function MoreMenu({
  open,
  current,
  onClose,
  onSelect,
}: {
  open: boolean;
  current: MoreItem | null;
  onClose: () => void;
  onSelect: (item: MoreItem) => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40">
      <button type="button" aria-label="Close menu" className="absolute inset-0 bg-ink/30" onClick={onClose} />
      <nav
        role="dialog"
        aria-modal="true"
        aria-label="More"
        className="more-drawer phone-header absolute inset-y-0 right-0 flex w-[min(20rem,86vw)] flex-col border-l border-rule bg-paper-raised pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex h-14 items-center justify-between gap-3 border-b border-rule px-4">
          <p className="type-heading text-[1.35rem] text-ink">More</p>
          <button
            type="button"
            onClick={onClose}
            className="pressable min-h-11 rounded-chip px-3 text-body font-semibold text-ink"
          >
            Close
          </button>
        </div>
        <ul className="flex flex-col border-t border-rule">
          {ITEMS.map((item) => {
            const selected = current === item.id;
            return (
              <li key={item.id} className="border-b border-rule">
                <button
                  type="button"
                  aria-current={selected ? "page" : undefined}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    "pressable relative flex min-h-[4.75rem] w-full flex-col items-start justify-center gap-1 px-4 py-3 text-left",
                    selected ? "bg-margin-wash shadow-[inset_3px_0_0_var(--margin)]" : "",
                  )}
                >
                  <span className="text-body font-semibold text-ink">{item.label}</span>
                  <span className="text-body text-ink-soft">{item.detail}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
