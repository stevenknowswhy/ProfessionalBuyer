export const MOCK_SAVINGS_KEY = "margin-mock-savings-v1";

/** Home-screen sample the household can clear. Not a measured saving. */
export const MOCK_SAVINGS = {
  monthCents: 414_23,
  monthItems: 12,
  yearCents: 681_285,
  yearItems: 240,
} as const;

export function mockSavingsCleared(storage: Pick<Storage, "getItem"> | null): boolean {
  if (!storage) return false;
  return storage.getItem(MOCK_SAVINGS_KEY) === "cleared";
}

export function clearMockSavings(storage: Pick<Storage, "setItem">) {
  storage.setItem(MOCK_SAVINGS_KEY, "cleared");
}
