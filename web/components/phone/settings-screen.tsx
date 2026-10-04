"use client";

import { formatUsd } from "@buyer/contract";
import { useState } from "react";
import { AddressFields, InternationalChoices, ShoppingChoices } from "@/components/phone/profile-fields";
import { MOCK_SAVINGS } from "@/lib/mock-savings";
import { INTERNATIONAL_QUESTION, profileErrors, type HouseholdProfile, type ProfileField } from "@/lib/profile";

export function SettingsScreen({
  profile,
  onSave,
  mockCleared,
  onClearMock,
}: {
  profile: HouseholdProfile;
  onSave: (profile: HouseholdProfile) => void;
  mockCleared: boolean;
  onClearMock: () => void;
}) {
  const [draft, setDraft] = useState(profile);
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const [saved, setSaved] = useState(false);

  function patch(next: Partial<HouseholdProfile>) {
    setSaved(false);
    setDraft((current) => ({ ...current, ...next }));
    setErrors((current) => {
      const cleared = { ...current };
      for (const key of Object.keys(next) as ProfileField[]) delete cleared[key];
      return cleared;
    });
  }

  function save() {
    const nextErrors = profileErrors(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    onSave({ ...draft, completedAt: draft.completedAt ?? new Date().toISOString() });
    setSaved(true);
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="type-heading text-[1.75rem] text-ink">Profile</h1>
        <p className="max-w-[38ch] text-body text-ink-soft">
          Update the address and the shopping preferences the buyer uses for this household.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-body font-semibold text-ink">Address</h2>
        <AddressFields profile={draft} errors={errors} onChange={patch} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-body font-semibold text-ink">Shopping</h2>
        <p className="text-small text-ink-soft">Online, local, or a mix of both.</p>
        <ShoppingChoices value={draft.shopping} error={errors.shopping} onChange={(shopping) => patch({ shopping })} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-body font-semibold text-ink">International</h2>
        <p className="text-body text-ink-soft">{INTERNATIONAL_QUESTION}</p>
        <InternationalChoices
          value={draft.international}
          error={errors.international}
          onChange={(international) => patch({ international })}
        />
      </section>

      <button
        type="button"
        onClick={save}
        className="pressable min-h-12 w-full rounded-chip bg-ink px-4 text-small font-semibold text-paper-raised"
      >
        Save profile
      </button>
      {saved && (
        <p role="status" className="text-small text-margin">
          Profile saved.
        </p>
      )}

      <section className="flex flex-col gap-3 border-t border-rule pt-6">
        <h2 className="text-body font-semibold text-ink">Mock data</h2>
        {mockCleared ? (
          <p className="text-body text-ink-soft">Mock data is cleared. The home screen is waiting for real savings.</p>
        ) : (
          <>
            <p className="text-body text-ink-soft">
              The home screen is showing sample savings: {formatUsd(MOCK_SAVINGS.monthCents)} this month on{" "}
              {MOCK_SAVINGS.monthItems} items, and {formatUsd(MOCK_SAVINGS.yearCents)} this year on {MOCK_SAVINGS.yearItems}{" "}
              items.
            </p>
            <button
              type="button"
              onClick={onClearMock}
              className="pressable min-h-12 w-full rounded-chip border border-rule bg-paper px-4 text-small font-semibold text-ink"
            >
              Clear mock data
            </button>
          </>
        )}
      </section>
    </div>
  );
}
