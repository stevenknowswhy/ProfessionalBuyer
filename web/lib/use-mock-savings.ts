"use client";

import { useCallback, useEffect, useState } from "react";
import { clearMockSavings, mockSavingsCleared } from "@/lib/mock-savings";

export function useMockSavings() {
  const [cleared, setCleared] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCleared(mockSavingsCleared(window.localStorage));
    setHydrated(true);
  }, []);

  const clear = useCallback(() => {
    clearMockSavings(window.localStorage);
    setCleared(true);
  }, []);

  return { cleared, hydrated, clear };
}
