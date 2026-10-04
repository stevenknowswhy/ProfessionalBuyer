"use client";

import { useCallback, useEffect, useState } from "react";
import {
  emptyProfile,
  isProfileComplete,
  loadProfile,
  saveProfile,
  type HouseholdProfile,
} from "@/lib/profile";

export function useProfile() {
  const [profile, setProfile] = useState<HouseholdProfile>(emptyProfile);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfile(loadProfile(window.localStorage));
    setHydrated(true);
  }, []);

  const write = useCallback((next: HouseholdProfile) => {
    setProfile(next);
    saveProfile(window.localStorage, next);
  }, []);

  const complete = useCallback(
    (next: HouseholdProfile) => {
      write({ ...next, completedAt: new Date().toISOString() });
    },
    [write],
  );

  return {
    profile,
    hydrated,
    completed: hydrated && isProfileComplete(profile),
    save: write,
    complete,
  };
}
