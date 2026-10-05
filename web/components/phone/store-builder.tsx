"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { groupLabel } from "@/lib/stores";
import { replaceWithNearby } from "@/lib/use-stores";
import type { NearbyStore } from "@/lib/nearby-stores";
import { cn } from "@/lib/utils";

type Address = {
  addressLine: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export function StoreBuilder({
  address,
  onBack,
  onDone,
}: {
  address: Address;
  onBack: () => void;
  onDone: () => void;
}) {
  const [stores, setStores] = useState<NearbyStore[]>([]);
  const [shown, setShown] = useState(0);
  const [phase, setPhase] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [reduce, setReduce] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  const city = address.city.trim();

  useEffect(() => {
    const controller = new AbortController();
    let gone = false;
    setPhase("loading");
    setError(null);
    setStores([]);
    setShown(0);

    async function load() {
      try {
        const response = await fetch("/api/stores/nearby", {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(address),
        });
        const data = (await response.json()) as { stores?: NearbyStore[]; error?: string };
        if (gone) return;
        if (!response.ok || !Array.isArray(data.stores)) {
          setPhase("error");
          setError(data.error || "The store search did not finish.");
          return;
        }
        const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        replaceWithNearby(data.stores.map((store) => store.id));
        setReduce(prefersReduce);
        setStores(data.stores);
        setPhase("ready");
      } catch (caught) {
        if (gone || (caught instanceof DOMException && caught.name === "AbortError")) return;
        setPhase("error");
        setError("The store search did not finish.");
      }
    }

    void load();
    return () => {
      gone = true;
      controller.abort();
    };
  }, [address, attempt]);

  useEffect(() => {
    if (phase !== "ready") return;
    if (reduce) {
      setShown(stores.length);
      const timer = window.setTimeout(() => onDoneRef.current(), 500);
      return () => window.clearTimeout(timer);
    }
    if (shown >= stores.length) {
      const timer = window.setTimeout(() => onDoneRef.current(), 700);
      return () => window.clearTimeout(timer);
    }
    const timer = window.setTimeout(() => setShown((count) => count + 1), 120);
    return () => window.clearTimeout(timer);
  }, [phase, reduce, shown, stores.length]);

  const visible = stores.slice(0, shown);
  const checking = phase === "loading" || (phase === "ready" && shown < stores.length && !reduce);
  const total = stores.length;

  return (
    <>
      <main
        data-testid="store-builder"
        className="flex w-full min-w-0 flex-1 flex-col gap-5 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]"
      >
        <div className="flex flex-col gap-2">
          <h1 className="type-heading text-[1.75rem] text-ink text-balance">Building stores near {city}</h1>
          <p className={cn("max-w-[38ch] text-body", phase === "error" ? "text-carmine" : "text-ink-soft")}>
            {phase === "error"
              ? error
              : total === 0 && phase === "ready"
                ? `No verified stores near ${city}.`
                : "Each store is checked before it is added."}
          </p>
        </div>

        {phase === "ready" && total > 0 && (
          <p className="text-body font-semibold text-margin tabular-nums" aria-live="polite">
            {shown} of {total}
          </p>
        )}

        <ul className="flex flex-col border-t border-rule">
          {visible.map((store) => (
            <li key={store.id} data-store-row={store.id} className="enter flex min-h-14 flex-col justify-center border-b border-rule py-2.5">
              <span className="flex items-baseline justify-between gap-3">
                <span className="truncate text-body font-semibold text-ink">{store.name}</span>
                <span className="shrink-0 text-micro font-semibold text-ink-soft">
                  {store.id === "amazon" ? "Online" : groupLabel(store.group)}
                </span>
              </span>
              <span className="text-small text-ink-soft">{store.reason}</span>
            </li>
          ))}
          {checking && (
            <li data-store-skeleton className="flex min-h-14 items-center border-b border-rule" aria-hidden>
              <Skeleton className={cn("h-4 w-40 rounded-chip bg-paper-sunk")} />
            </li>
          )}
        </ul>
      </main>

      <footer className="phone-tabs fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper-raised">
        <div className="mx-auto flex w-full max-w-3xl gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onBack}
            className="pressable min-h-12 min-w-24 rounded-chip border border-rule bg-paper px-4 text-body font-semibold text-ink"
          >
            Back
          </button>
          {phase === "error" && (
            <button
              type="button"
              onClick={() => setAttempt((value) => value + 1)}
              className="pressable min-h-12 flex-1 rounded-chip bg-ink px-4 text-body font-semibold text-paper-raised"
            >
              Try again
            </button>
          )}
        </div>
      </footer>
    </>
  );
}
