"use client";

import { Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  CATALOG,
  STORE_GROUPS,
  chosenStores,
  customMatching,
  groupLabel,
  storesMatching,
  type StoreGroupId,
  type StoreSelection,
} from "@/lib/stores";
import { plural } from "@/lib/format";
import { cn } from "@/lib/utils";

type GroupFilter = StoreGroupId | "all" | "added";

const FILTERS: { id: GroupFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "added", label: "Added" },
  ...STORE_GROUPS.map((group) => ({ id: group.id, label: group.label })),
];

function StoreButton({
  name,
  detail,
  pressed,
  onClick,
  prominent,
}: {
  name: string;
  detail: string;
  pressed: boolean;
  onClick: () => void;
  prominent?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "pressable flex min-h-11 items-center justify-between gap-3 rounded-chip border px-3 text-left",
        prominent ? "min-h-14 px-4" : "",
        pressed
          ? "border-ink bg-ink text-paper-raised"
          : "border-rule bg-paper-raised text-ink hover:bg-paper-sunk",
      )}
    >
      <span className="min-w-0">
        <span className={cn("block truncate font-semibold", prominent ? "text-body" : "text-small")}>{name}</span>
        <span className={cn("block truncate text-micro", pressed ? "text-paper-raised/80" : "text-ink-faint")}>{detail}</span>
      </span>
      <span className={cn("shrink-0 text-micro font-semibold", pressed ? "text-paper-raised" : "text-ink-soft")}>
        {pressed ? "Added" : "Add"}
      </span>
    </button>
  );
}

export function StoreBoard({
  selection,
  onToggle,
  onAddLink,
  onRemoveCustom,
  onClose,
}: {
  selection: StoreSelection;
  onToggle: (id: string) => void;
  onAddLink: (raw: string) => string;
  onRemoveCustom: (id: string) => void;
  onClose?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<GroupFilter>("all");
  const [link, setLink] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [found, setFound] = useState<{ id: string; name: string; domain: string; url: string }[]>([]);
  const [scoutAt, setScoutAt] = useState<string | null>(null);

  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/stores/discovered", { cache: "no-store" });
        const json = (await res.json()) as { updatedAt?: string | null; stores?: { id: string; name: string; domain: string; url: string }[] };
        if (stop) return;
        setFound(Array.isArray(json.stores) ? json.stores : []);
        setScoutAt(json.updatedAt ?? null);
      } catch {
        if (!stop) setFound([]);
      }
    }
    load();
    const timer = window.setInterval(load, 30_000);
    return () => {
      stop = true;
      window.clearInterval(timer);
    };
  }, []);

  const matches = useMemo(() => storesMatching(query, group, selection.selectedIds), [query, group, selection.selectedIds]);
  const custom = useMemo(() => customMatching(query, group, selection), [query, group, selection]);
  const chosen = chosenStores(selection);
  const groups = STORE_GROUPS.filter((item) => matches.some((store) => store.group === item.id));
  const scoutMatches = found.filter((store) => {
    if (group === "added" && !selection.selectedIds.includes(`custom:${store.domain}`) && !selection.selectedIds.includes(store.id)) return false;
    const q = query.trim().toLowerCase();
    return !q || store.name.toLowerCase().includes(q) || store.domain.includes(q);
  });

  function submitLink(event: React.FormEvent) {
    event.preventDefault();
    const message = onAddLink(link);
    setNotice(message);
    if (!message.startsWith("Paste") && !message.startsWith("That") && !message.startsWith("Use an")) setLink("");
  }

  return (
    <div className={cn("mx-auto flex w-full max-w-5xl flex-col gap-8", onClose ? "px-6 py-6" : "gap-6 py-1")}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex max-w-xl flex-col gap-2">
          <h2 className="type-heading text-ink">Stores</h2>
          <p className="text-body text-ink-soft">
            Choose where the buyer looks. Big-box stores are the large buttons. eBay, Temu, and Etsy are under Marketplace.
            Paste a link for a store that is not listed.
          </p>
        </div>
        {onClose && (
          <button type="button" onClick={onClose} className="pressable min-h-10 rounded-chip bg-ink px-4 text-small font-semibold text-paper-raised">
            Back to the ledger
          </button>
        )}
      </div>

      <section aria-labelledby="stores-searching" className="surface flex flex-col gap-3 p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h3 id="stores-searching" className="text-small font-semibold text-ink">
            The buyer searches {plural(chosen.length, "store")}
          </h3>
        </div>
        {chosen.length === 0 ? (
          <p className="text-small text-ink-soft">None yet. Add a big-box store or paste a link.</p>
        ) : (
          <ul className="flex flex-wrap gap-2">
            {chosen.map((store) => (
              <li key={store.id}>
                <button
                  type="button"
                  onClick={() => (store.custom ? onRemoveCustom(store.id) : onToggle(store.id))}
                  className="pressable inline-flex min-h-10 items-center gap-2 rounded-full bg-margin-wash px-3 text-small font-semibold text-ink"
                >
                  {store.name}
                  <span className="text-micro font-medium text-ink-soft">{store.custom ? "Your link" : groupLabel(store.group!)}</span>
                  <X aria-hidden className="size-3.5" />
                  <span className="sr-only">Remove {store.name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <form onSubmit={submitLink} className="surface flex flex-col gap-3 p-4">
        <label htmlFor="store-link" className="text-small font-semibold text-ink">
          Paste a store link
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="store-link"
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="https://www.costco.com"
            inputMode="url"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            className="min-h-11 flex-1 rounded-chip border border-rule bg-paper px-3 text-body text-ink outline-none placeholder:text-ink-faint"
          />
          <button type="submit" className="pressable min-h-11 rounded-chip bg-ink px-4 text-small font-semibold text-paper-raised">
            Add store
          </button>
        </div>
        <p className="text-small text-ink-soft" role="status">
          {notice ?? "A known store, including eBay, Temu, and Etsy, is switched on. Any other address is added under Your links."}
        </p>
      </form>

      {(group === "all" || group === "big-box" || group === "added") && (
      <section aria-labelledby="stores-scout" className="flex flex-col gap-3">
        <div>
          <h3 id="stores-scout" className="text-small font-semibold text-ink">
            Big-box scout
          </h3>
          <p className="text-small text-ink-soft">
            A scanner asks OpenRouter&apos;s free models for big-box stores most families use, checks the site, and adds the ones that answer.
            {scoutAt ? ` Last pass ${new Date(scoutAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}.` : " Waiting for the first pass."}
          </p>
        </div>
        {scoutMatches.length === 0 ? (
          <p className="text-small text-ink-soft">No new stores yet. Walmart, Target, Costco, Sam&apos;s Club, BJ&apos;s, Amazon, and Meijer are already in the list.</p>
        ) : (
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {scoutMatches.map((store) => (
              <li key={store.id}>
                <button
                  type="button"
                  onClick={() => {
                    const message = onAddLink(store.url);
                    setNotice(message);
                  }}
                  className="pressable flex min-h-14 w-full items-center justify-between gap-3 rounded-chip border border-rule bg-paper-raised px-4 text-left"
                >
                  <span>
                    <span className="block text-body font-semibold text-ink">{store.name}</span>
                    <span className="block text-micro text-ink-faint">{store.domain}</span>
                  </span>
                  <span className="text-micro font-semibold text-ink-soft">Add</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
      )}

      <div className="flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">Filter stores</span>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Find a store, such as Temu or Costco"
            className="min-h-11 w-full rounded-chip border border-rule bg-paper-raised pr-3 pl-10 text-body text-ink outline-none placeholder:text-ink-faint"
          />
        </label>
        <div role="group" aria-label="Store groups" className="flex flex-wrap gap-2">
          {FILTERS.map((item) => {
            const selected = group === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={selected}
                onClick={() => setGroup(item.id)}
                className={cn(
                  "pressable min-h-10 rounded-full px-3 text-small font-semibold",
                  selected ? "bg-ink text-paper-raised" : "bg-paper-sunk text-ink",
                )}
              >
                {item.label}
              </button>
            );
          })}
        </div>
        {(query.trim() || group !== "all") && (
          <p className="text-small text-ink-soft">{plural(matches.length + custom.length, "match", "matches")}</p>
        )}
      </div>

      {matches.length === 0 && custom.length === 0 ? (
        <p className="text-body text-ink-soft">No store matches that. Try another name, or paste its link.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((item) => {
            const stores = matches.filter((store) => store.group === item.id);
            const prominent = item.id === "big-box" && group !== "added" && query.trim() === "";
            return (
              <section key={item.id} aria-labelledby={`stores-${item.id}`} className="flex flex-col gap-3">
                <div>
                  <h3 id={`stores-${item.id}`} className="text-small font-semibold text-ink">
                    {item.label}
                  </h3>
                  <p className="text-small text-ink-soft">{item.blurb}</p>
                </div>
                <ul className={cn("grid gap-2", prominent ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2 lg:grid-cols-3")}>
                  {stores.map((store) => (
                    <li key={store.id}>
                      <StoreButton
                        name={store.name}
                        detail={store.domains[0]}
                        pressed={selection.selectedIds.includes(store.id)}
                        onClick={() => onToggle(store.id)}
                        prominent={prominent}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {custom.length > 0 && (
            <section aria-labelledby="stores-custom" className="flex flex-col gap-3">
              <div>
                <h3 id="stores-custom" className="text-small font-semibold text-ink">
                  Your links
                </h3>
                <p className="text-small text-ink-soft">Stores you pasted that are not in the list.</p>
              </div>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {custom.map((store) => (
                  <li key={store.id} className="flex flex-col gap-1">
                    <StoreButton
                      name={store.name}
                      detail={store.host}
                      pressed={selection.selectedIds.includes(store.id)}
                      onClick={() => onToggle(store.id)}
                    />
                    <button type="button" onClick={() => onRemoveCustom(store.id)} className="self-start px-1 text-micro font-semibold text-ink-soft underline-offset-4 hover:underline">
                      Remove {store.name}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      <p className="text-small text-ink-faint">
        {plural(CATALOG.length, "listed store")}, including eBay, Temu, and Etsy.
      </p>
    </div>
  );
}
