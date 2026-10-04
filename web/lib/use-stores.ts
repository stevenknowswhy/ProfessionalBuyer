"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addStoreLink,
  CATALOG,
  DEFAULT_SELECTION,
  loadSelection,
  removeCustomStore,
  saveSelection,
  toggleStore,
  type StoreSelection,
} from "@/lib/stores";

const nearbyListeners = new Set<(selection: StoreSelection) => void>();

/** Replace the household's selected stores with a nearby result. Custom links are cleared. */
export function replaceWithNearby(ids: readonly string[]): StoreSelection {
  const known = new Set(CATALOG.map((store) => store.id));
  const selectedIds: string[] = [];
  for (const id of ids) {
    if (!known.has(id) || selectedIds.includes(id)) continue;
    selectedIds.push(id);
    if (selectedIds.length >= 20) break;
  }
  const selection: StoreSelection = { selectedIds, custom: [] };
  saveSelection(selection);
  for (const listener of nearbyListeners) listener(selection);
  return selection;
}

export function useStoreSelection() {
  const [selection, setSelection] = useState<StoreSelection>(DEFAULT_SELECTION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadSelection();
    if (saved) setSelection(saved);
    setHydrated(true);
  }, []);

  useEffect(() => {
    nearbyListeners.add(setSelection);
    return () => {
      nearbyListeners.delete(setSelection);
    };
  }, []);

  useEffect(() => {
    if (hydrated) saveSelection(selection);
  }, [hydrated, selection]);

  const toggle = useCallback((id: string) => {
    setSelection((current) => toggleStore(current, id));
  }, []);

  const addLink = useCallback((raw: string) => {
    let message = "";
    setSelection((current) => {
      const result = addStoreLink(current, raw);
      message = result.message;
      return result.ok ? result.selection : current;
    });
    return message;
  }, []);

  const removeCustom = useCallback((id: string) => {
    setSelection((current) => removeCustomStore(current, id));
  }, []);

  return { selection, toggle, addLink, removeCustom };
}
