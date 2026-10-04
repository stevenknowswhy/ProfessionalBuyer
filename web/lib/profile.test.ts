import assert from "node:assert/strict";
import test from "node:test";
import {
  emptyProfile,
  formatAddress,
  isProfileComplete,
  parseProfile,
  profileErrors,
  type HouseholdProfile,
} from "./profile.ts";

function ready(): HouseholdProfile {
  return {
    ...emptyProfile(),
    addressLine: "1200 Market Street",
    city: "San Francisco",
    region: "CA",
    postalCode: "94103",
    country: "United States",
    shopping: "mix",
    international: "yes",
    completedAt: "2026-10-04T00:00:00.000Z",
  };
}

test("a finished US address has no errors", () => {
  assert.deepEqual(profileErrors(ready()), {});
  assert.equal(isProfileComplete(ready()), true);
});

test("ZIP and state are required for the United States", () => {
  const profile = { ...ready(), postalCode: "941", region: "" };
  const errors = profileErrors(profile);
  assert.match(errors.postalCode ?? "", /ZIP/);
  assert.match(errors.region ?? "", /state/i);
});

test("other countries accept a short postal code", () => {
  const profile = { ...ready(), country: "Germany", region: "Berlin", postalCode: "10115" };
  assert.equal(profileErrors(profile).postalCode, undefined);
});

test("shopping and international stay unanswered until chosen", () => {
  const errors = profileErrors({ ...ready(), shopping: null, international: null, completedAt: null });
  assert.ok(errors.shopping);
  assert.ok(errors.international);
  assert.equal(isProfileComplete({ ...ready(), completedAt: null }), false);
});

test("stored profiles ignore unknown choices", () => {
  const parsed = parseProfile(
    JSON.stringify({ ...ready(), shopping: "anywhere", international: "maybe", country: "" }),
  );
  assert.equal(parsed?.shopping, null);
  assert.equal(parsed?.international, null);
  assert.equal(parsed?.country, "United States");
});

test("address formats as a block", () => {
  assert.equal(formatAddress(ready()), "1200 Market Street\nSan Francisco, CA 94103\nUnited States");
});
