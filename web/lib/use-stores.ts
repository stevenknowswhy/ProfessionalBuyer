"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addStoreLink,
  DEFAULT_SELECTION,
  loadSelection,
  removeCustomStore,
  saveSelection,
  toggleStore,
  type StoreSelection,
} from "@/lib/stores";

export function useStoreSelection() {
  const [selection, setSelection] = useState<StoreSelection>(DEFAULT_SELECTION);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = loadSelection();
    if (saved) setSelection(saved);
    setHydrated(true);
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
