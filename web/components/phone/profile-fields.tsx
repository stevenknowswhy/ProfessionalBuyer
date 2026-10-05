"use client";

import {
  INTERNATIONAL_QUESTION,
  SHOPPING_OPTIONS,
  US_STATES,
  formatAddress,
  internationalLabel,
  isUnitedStates,
  shoppingLabel,
  type HouseholdProfile,
  type InternationalChoice,
  type ProfileField,
  type ShoppingMode,
} from "@/lib/profile";
import { cn } from "@/lib/utils";

const inputClass =
  "field w-full rounded-chip border border-rule bg-paper-raised px-3 text-ink outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} role="alert" className="text-small text-carmine">
      {message}
    </p>
  );
}

export function AddressFields({
  profile,
  errors,
  onChange,
}: {
  profile: HouseholdProfile;
  errors: Partial<Record<ProfileField, string>>;
  onChange: (patch: Partial<HouseholdProfile>) => void;
}) {
  const unitedStates = isUnitedStates(profile.country);
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1.5">
        <span className="text-small font-semibold text-ink">Street address</span>
        <input
          className={inputClass}
          autoComplete="address-line1"
          enterKeyHint="next"
          value={profile.addressLine}
          aria-invalid={Boolean(errors.addressLine)}
          aria-describedby={errors.addressLine ? "address-line-error" : undefined}
          onChange={(event) => onChange({ addressLine: event.target.value })}
        />
        <FieldError id="address-line-error" message={errors.addressLine} />
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-small font-semibold text-ink">City</span>
        <input
          className={inputClass}
          autoComplete="address-level2"
          enterKeyHint="next"
          value={profile.city}
          aria-invalid={Boolean(errors.city)}
          aria-describedby={errors.city ? "city-error" : undefined}
          onChange={(event) => onChange({ city: event.target.value })}
        />
        <FieldError id="city-error" message={errors.city} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-small font-semibold text-ink">{unitedStates ? "State" : "Region"}</span>
          {unitedStates ? (
            <select
              className={inputClass}
              autoComplete="address-level1"
              value={profile.region}
              aria-invalid={Boolean(errors.region)}
              aria-describedby={errors.region ? "region-error" : undefined}
              onChange={(event) => onChange({ region: event.target.value })}
            >
              <option value="">Choose</option>
              {US_STATES.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          ) : (
            <input
              className={inputClass}
              autoComplete="address-level1"
              value={profile.region}
              aria-invalid={Boolean(errors.region)}
              aria-describedby={errors.region ? "region-error" : undefined}
              onChange={(event) => onChange({ region: event.target.value })}
            />
          )}
          <FieldError id="region-error" message={errors.region} />
        </label>

        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-small font-semibold text-ink">{unitedStates ? "ZIP code" : "Postal code"}</span>
          <input
            className={inputClass}
            autoComplete="postal-code"
            inputMode={unitedStates ? "numeric" : "text"}
            enterKeyHint="next"
            value={profile.postalCode}
            aria-invalid={Boolean(errors.postalCode)}
            aria-describedby={errors.postalCode ? "postal-error" : undefined}
            onChange={(event) => onChange({ postalCode: event.target.value })}
          />
          <FieldError id="postal-error" message={errors.postalCode} />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-small font-semibold text-ink">Country</span>
        <input
          className={inputClass}
          autoComplete="country-name"
          list="profile-countries"
          enterKeyHint="done"
          value={profile.country}
          aria-invalid={Boolean(errors.country)}
          aria-describedby={errors.country ? "country-error" : undefined}
          onChange={(event) => {
            const country = event.target.value;
            const crossedBorder = isUnitedStates(profile.country) !== isUnitedStates(country);
            onChange(crossedBorder ? { country, region: "" } : { country });
          }}
        />
        <datalist id="profile-countries">
          <option value="United States" />
          <option value="Canada" />
          <option value="Mexico" />
          <option value="United Kingdom" />
          <option value="Germany" />
          <option value="Japan" />
        </datalist>
        <FieldError id="country-error" message={errors.country} />
      </label>
    </div>
  );
}

export function ShoppingChoices({
  value,
  error,
  onChange,
}: {
  value: ShoppingMode | null;
  error?: string;
  onChange: (mode: ShoppingMode) => void;
}) {
  return (
    <fieldset className="flex flex-col border-t border-rule">
      <legend className="sr-only">How you prefer to shop</legend>
      {SHOPPING_OPTIONS.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "pressable flex min-h-16 w-full flex-col items-start justify-center gap-1 border-b border-rule px-1 py-3 text-left",
              selected ? "bg-margin-wash px-3 shadow-[inset_3px_0_0_var(--margin)]" : "",
            )}
          >
            <span className="text-body font-semibold text-ink">{option.title}</span>
            <span className="text-small text-ink-soft">{option.detail}</span>
          </button>
        );
      })}
      <FieldError id="shopping-error" message={error} />
    </fieldset>
  );
}

export function InternationalChoices({
  value,
  error,
  onChange,
}: {
  value: InternationalChoice | null;
  error?: string;
  onChange: (choice: InternationalChoice) => void;
}) {
  const options: { id: InternationalChoice; title: string; detail: string }[] = [
    {
      id: "yes",
      title: "Yes",
      detail: "Only when it is the same item, well timed, cheaper, and the same or better quality.",
    },
    {
      id: "no",
      title: "No",
      detail: "Keep the search in this country.",
    },
  ];
  return (
    <fieldset className="flex flex-col border-t border-rule">
      <legend className="sr-only">{INTERNATIONAL_QUESTION}</legend>
      {options.map((option) => {
        const selected = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "pressable flex min-h-16 w-full flex-col items-start justify-center gap-1 border-b border-rule px-1 py-3 text-left",
              selected ? "bg-margin-wash px-3 shadow-[inset_3px_0_0_var(--margin)]" : "",
            )}
          >
            <span className="text-body font-semibold text-ink">{option.title}</span>
            <span className="text-small text-ink-soft">{option.detail}</span>
          </button>
        );
      })}
      <FieldError id="international-error" message={error} />
    </fieldset>
  );
}

export function ProfileReview({ profile }: { profile: HouseholdProfile }) {
  return (
    <dl className="surface flex flex-col gap-4 p-4">
      <div>
        <dt className="text-small text-ink-soft">Address</dt>
        <dd className="mt-1 whitespace-pre-line text-body text-ink">{formatAddress(profile)}</dd>
      </div>
      <div>
        <dt className="text-small text-ink-soft">Shopping</dt>
        <dd className="mt-1 text-body font-semibold text-ink">{shoppingLabel(profile.shopping)}</dd>
      </div>
      <div>
        <dt className="text-small text-ink-soft">International</dt>
        <dd className="mt-1 text-body font-semibold text-ink">{internationalLabel(profile.international)}</dd>
      </div>
    </dl>
  );
}
