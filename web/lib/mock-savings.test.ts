import assert from "node:assert/strict";
import test from "node:test";
import { MOCK_SAVINGS, clearMockSavings, mockSavingsCleared } from "./mock-savings.ts";

test("the home mock is $414.23 on 12 items and $6,812.85 on 240 items", () => {
  assert.equal(MOCK_SAVINGS.monthCents, 41423);
  assert.equal(MOCK_SAVINGS.monthItems, 12);
  assert.equal(MOCK_SAVINGS.yearCents, 681285);
  assert.equal(MOCK_SAVINGS.yearItems, 240);
});

test("clearing mock data is remembered", () => {
  const jar = new Map<string, string>();
  const storage = {
    getItem: (key: string) => jar.get(key) ?? null,
    setItem: (key: string, value: string) => {
      jar.set(key, value);
    },
  };
  assert.equal(mockSavingsCleared(storage), false);
  clearMockSavings(storage);
  assert.equal(mockSavingsCleared(storage), true);
});
