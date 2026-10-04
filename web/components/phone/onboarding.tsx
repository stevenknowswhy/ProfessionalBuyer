"use client";

import { useState } from "react";
import { Wordmark } from "@/components/shell/top-bar";
import { AddressFields, InternationalChoices, ProfileReview, ShoppingChoices } from "@/components/phone/profile-fields";
import { INTERNATIONAL_QUESTION, profileErrors, type HouseholdProfile, type ProfileField } from "@/lib/profile";
import { cn } from "@/lib/utils";

const STEPS: { title: string; body: string; fields: ProfileField[] }[] = [
  {
    title: "Where should the buyer shop from?",
    body: "Your address is how nearby stores, delivery, and tax get decided. The rest of the setup is about how you like to shop.",
    fields: ["addressLine", "city", "region", "postalCode", "country"],
  },
  {
    title: "How do you prefer to shop?",
    body: "This is a preference, not a ban. The buyer still compares the real delivered cost.",
    fields: ["shopping"],
  },
  {
    title: INTERNATIONAL_QUESTION,
    body: "Same item means the same product, not a lookalike. Less cost means the delivered price, not the shelf price.",
    fields: ["international"],
  },
  {
    title: "Does this look right?",
    body: "You can change any of this later in Settings.",
    fields: ["addressLine", "city", "region", "postalCode", "country", "shopping", "international"],
  },
];

export function Onboarding({
  initial,
  onComplete,
}: {
  initial: HouseholdProfile;
  onComplete: (profile: HouseholdProfile) => void;
}) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState(initial);
  const [errors, setErrors] = useState<Partial<Record<ProfileField, string>>>({});
  const page = STEPS[step];

  function patch(next: Partial<HouseholdProfile>) {
    setDraft((current) => ({ ...current, ...next }));
    setErrors((current) => {
      const cleared = { ...current };
      for (const key of Object.keys(next) as ProfileField[]) delete cleared[key];
      return cleared;
    });
  }

  function continueFrom() {
    const nextErrors = profileErrors(draft, page.fields);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (step < STEPS.length - 1) {
      setStep((current) => current + 1);
      window.scrollTo(0, 0);
      return;
    }
    onComplete(draft);
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full min-w-0 max-w-3xl flex-col bg-paper">
      <header className="phone-header sticky top-0 z-30 border-b border-rule bg-paper">
        <div className="flex h-14 items-center justify-between gap-3 px-4">
          <Wordmark />
          <p className="shrink-0 text-small text-ink-soft tabular-nums">
            {step + 1} of {STEPS.length}
          </p>
        </div>
        <div className="grid grid-cols-4 gap-1 px-4 pb-3" aria-hidden>
          {STEPS.map((item, index) => (
            <span key={item.title} className={cn("h-1 rounded-full", index <= step ? "bg-margin" : "bg-rule")} />
          ))}
        </div>
      </header>

      <main className="flex w-full min-w-0 flex-1 flex-col gap-5 px-4 pt-5 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        <div className="flex flex-col gap-2">
          <h1 className={cn("text-ink text-balance", step === 2 ? "text-[1.45rem] leading-snug font-display" : "type-heading text-[1.75rem]")}>
            {page.title}
          </h1>
          <p className="max-w-[38ch] text-body text-ink-soft">{page.body}</p>
        </div>

        {step === 0 && <AddressFields profile={draft} errors={errors} onChange={patch} />}
        {step === 1 && <ShoppingChoices value={draft.shopping} error={errors.shopping} onChange={(shopping) => patch({ shopping })} />}
        {step === 2 && (
          <InternationalChoices
            value={draft.international}
            error={errors.international}
            onChange={(international) => patch({ international })}
          />
        )}
        {step === 3 && <ProfileReview profile={draft} />}
      </main>

      <footer className="phone-tabs fixed inset-x-0 bottom-0 z-30 border-t border-rule bg-paper-raised">
        <div className="mx-auto flex w-full max-w-3xl gap-3 px-4 py-3">
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                setErrors({});
                setStep((current) => current - 1);
                window.scrollTo(0, 0);
              }}
              className="pressable min-h-12 min-w-24 rounded-chip border border-rule bg-paper px-4 text-small font-semibold text-ink"
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={continueFrom}
            className="pressable min-h-12 flex-1 rounded-chip bg-ink px-4 text-small font-semibold text-paper-raised"
          >
            {step === STEPS.length - 1 ? "Start buying" : "Continue"}
          </button>
        </div>
      </footer>
    </div>
  );
}
