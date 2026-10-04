export const PROFILE_KEY = "margin-profile-v1";

export type ShoppingMode = "local" | "online" | "mix";
export type InternationalChoice = "yes" | "no";

export type HouseholdProfile = {
  addressLine: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
  shopping: ShoppingMode | null;
  international: InternationalChoice | null;
  completedAt: string | null;
};

export type ProfileField =
  | "addressLine"
  | "city"
  | "region"
  | "postalCode"
  | "country"
  | "shopping"
  | "international";

export const US_STATES: { code: string; name: string }[] = [
  ["AL", "Alabama"],
  ["AK", "Alaska"],
  ["AZ", "Arizona"],
  ["AR", "Arkansas"],
  ["CA", "California"],
  ["CO", "Colorado"],
  ["CT", "Connecticut"],
  ["DE", "Delaware"],
  ["DC", "District of Columbia"],
  ["FL", "Florida"],
  ["GA", "Georgia"],
  ["HI", "Hawaii"],
  ["ID", "Idaho"],
  ["IL", "Illinois"],
  ["IN", "Indiana"],
  ["IA", "Iowa"],
  ["KS", "Kansas"],
  ["KY", "Kentucky"],
  ["LA", "Louisiana"],
  ["ME", "Maine"],
  ["MD", "Maryland"],
  ["MA", "Massachusetts"],
  ["MI", "Michigan"],
  ["MN", "Minnesota"],
  ["MS", "Mississippi"],
  ["MO", "Missouri"],
  ["MT", "Montana"],
  ["NE", "Nebraska"],
  ["NV", "Nevada"],
  ["NH", "New Hampshire"],
  ["NJ", "New Jersey"],
  ["NM", "New Mexico"],
  ["NY", "New York"],
  ["NC", "North Carolina"],
  ["ND", "North Dakota"],
  ["OH", "Ohio"],
  ["OK", "Oklahoma"],
  ["OR", "Oregon"],
  ["PA", "Pennsylvania"],
  ["RI", "Rhode Island"],
  ["SC", "South Carolina"],
  ["SD", "South Dakota"],
  ["TN", "Tennessee"],
  ["TX", "Texas"],
  ["UT", "Utah"],
  ["VT", "Vermont"],
  ["VA", "Virginia"],
  ["WA", "Washington"],
  ["WV", "West Virginia"],
  ["WI", "Wisconsin"],
  ["WY", "Wyoming"],
].map(([code, name]) => ({ code, name }));

export const SHOPPING_OPTIONS: { id: ShoppingMode; title: string; detail: string }[] = [
  { id: "local", title: "Local", detail: "Stores you can walk or drive to." },
  { id: "online", title: "Online", detail: "Delivery, with no separate trip." },
  { id: "mix", title: "A mix of both", detail: "Nearby when it helps, delivered when it doesn't." },
];

export const INTERNATIONAL_QUESTION =
  "Would you be willing to shop internationally if it were well timed for the same item at less cost with the same or higher quality?";

export function emptyProfile(): HouseholdProfile {
  return {
    addressLine: "",
    city: "",
    region: "",
    postalCode: "",
    country: "United States",
    shopping: null,
    international: null,
    completedAt: null,
  };
}

export function isUnitedStates(country: string): boolean {
  const value = country.trim().toLowerCase();
  return value === "united states" || value === "united states of america" || value === "usa" || value === "us";
}

export function profileErrors(profile: HouseholdProfile, fields?: ProfileField[]): Partial<Record<ProfileField, string>> {
  const errors: Partial<Record<ProfileField, string>> = {};
  const want = (field: ProfileField) => !fields || fields.includes(field);

  if (want("addressLine") && profile.addressLine.trim().length < 3) {
    errors.addressLine = "Add the street address.";
  }
  if (want("city") && profile.city.trim().length < 2) {
    errors.city = "Add the city.";
  }
  if (want("region") && profile.region.trim().length < 2) {
    errors.region = isUnitedStates(profile.country) ? "Choose a state." : "Add the region.";
  }
  if (want("postalCode")) {
    const postal = profile.postalCode.trim();
    if (isUnitedStates(profile.country)) {
      if (!/^\d{5}(-\d{4})?$/.test(postal)) errors.postalCode = "Enter a 5-digit ZIP code.";
    } else if (postal.length < 2) {
      errors.postalCode = "Add the postal code.";
    }
  }
  if (want("country") && profile.country.trim().length < 2) {
    errors.country = "Add the country.";
  }
  if (want("shopping") && !profile.shopping) {
    errors.shopping = "Choose how you shop.";
  }
  if (want("international") && !profile.international) {
    errors.international = "Choose whether international buying is welcome.";
  }
  return errors;
}

export function isProfileComplete(profile: HouseholdProfile): boolean {
  return Boolean(profile.completedAt) && Object.keys(profileErrors(profile)).length === 0;
}

export function formatAddress(profile: HouseholdProfile): string {
  const cityLine = [profile.city.trim(), profile.region.trim()].filter(Boolean).join(", ");
  const place = [cityLine, profile.postalCode.trim()].filter(Boolean).join(" ");
  return [profile.addressLine.trim(), place, profile.country.trim()].filter(Boolean).join("\n");
}

export function shoppingLabel(mode: ShoppingMode | null): string {
  return SHOPPING_OPTIONS.find((option) => option.id === mode)?.title ?? "Not chosen";
}

export function internationalLabel(choice: InternationalChoice | null): string {
  if (choice === "yes") return "Yes, when the timing, price, and quality hold";
  if (choice === "no") return "No";
  return "Not chosen";
}

export function parseProfile(raw: string | null): HouseholdProfile | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<HouseholdProfile>;
    if (!value || typeof value !== "object") return null;
    const shopping = value.shopping === "local" || value.shopping === "online" || value.shopping === "mix" ? value.shopping : null;
    const international = value.international === "yes" || value.international === "no" ? value.international : null;
    return {
      addressLine: typeof value.addressLine === "string" ? value.addressLine : "",
      city: typeof value.city === "string" ? value.city : "",
      region: typeof value.region === "string" ? value.region : "",
      postalCode: typeof value.postalCode === "string" ? value.postalCode : "",
      country: typeof value.country === "string" && value.country.trim() ? value.country : "United States",
      shopping,
      international,
      completedAt: typeof value.completedAt === "string" ? value.completedAt : null,
    };
  } catch {
    return null;
  }
}

export function loadProfile(storage: Pick<Storage, "getItem"> | null): HouseholdProfile {
  if (!storage) return emptyProfile();
  return parseProfile(storage.getItem(PROFILE_KEY)) ?? emptyProfile();
}

export function saveProfile(storage: Pick<Storage, "setItem">, profile: HouseholdProfile) {
  storage.setItem(PROFILE_KEY, JSON.stringify(profile));
}
