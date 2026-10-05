/**
 * Nearby stores for one household address.
 * Chains are kept or dropped from published state and metro footprints.
 * A chain is returned only after its https site answers below status 500 on its own host.
 */

export const NEARBY_CAP = 20;

export type NearbyGroup = "big-box" | "grocery" | "pharmacy" | "home" | "dollar";

export type NearbyAddress = {
  addressLine: string;
  city: string;
  region: string;
  postalCode: string;
  country: string;
};

export type NearbyStore = {
  id: string;
  name: string;
  group: NearbyGroup;
  url: string;
  domain: string;
  reason: string;
};

export type NearbyResponse = {
  city: string;
  region: string;
  stores: NearbyStore[];
};

type Chain = {
  id: string;
  name: string;
  group: NearbyGroup;
  url: string;
  domain: string;
  rank: number;
  states: readonly string[];
  /** City must be in this list when the state has an entry. */
  onlyCities?: Readonly<Partial<Record<string, readonly string[]>>>;
  skipCities?: readonly string[];
  online?: boolean;
  footprint: string;
};

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  DC: "District of Columbia",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
};

const ALL_STATES = Object.keys(STATE_NAMES);

function except(codes: readonly string[]): string[] {
  const skip = new Set(codes);
  return ALL_STATES.filter((code) => !skip.has(code));
}

/** Southern California cities where the banner is Vons or Ralphs, not Safeway or Lucky. */
const SOCAL = [
  "los angeles",
  "san diego",
  "long beach",
  "anaheim",
  "santa ana",
  "irvine",
  "chula vista",
  "glendale",
  "huntington beach",
  "santa clarita",
  "garden grove",
  "oceanside",
  "rancho cucamonga",
  "ontario",
  "corona",
  "fontana",
  "moreno valley",
  "san bernardino",
  "riverside",
  "oxnard",
  "thousand oaks",
  "simi valley",
  "pasadena",
  "torrance",
  "pomona",
  "escondido",
  "orange",
  "fullerton",
  "costa mesa",
  "downey",
  "inglewood",
  "ventura",
  "west covina",
  "norwalk",
  "burbank",
  "el monte",
  "carson",
  "compton",
  "temecula",
  "murrieta",
  "carlsbad",
  "vista",
  "el cajon",
  "chino",
  "chino hills",
  "whittier",
  "santa monica",
  "beverly hills",
  "culver city",
  "burbank",
  "palmdale",
  "lancaster",
  "camarillo",
  "newport beach",
  "irvine",
  "mission viejo",
  "san clemente",
  "palm springs",
  "palm desert",
  "victorville",
  "redlands",
] as const;

const HOUSTON = [
  "houston",
  "pasadena",
  "sugar land",
  "katy",
  "pearland",
  "baytown",
  "missouri city",
  "conroe",
  "the woodlands",
  "spring",
  "cypress",
  "league city",
  "friendswood",
  "deer park",
  "bellaire",
  "humble",
  "tomball",
  "rosenberg",
  "richmond",
  "galveston",
  "texas city",
  "stafford",
  "jersey village",
] as const;

const AUSTIN = [
  "austin",
  "round rock",
  "cedar park",
  "pflugerville",
  "georgetown",
  "lakeway",
  "bee cave",
  "leander",
  "kyle",
  "buda",
  "san marcos",
] as const;

const DFW = [
  "dallas",
  "fort worth",
  "arlington",
  "plano",
  "irving",
  "garland",
  "grand prairie",
  "carrollton",
  "lewisville",
  "frisco",
  "mckinney",
  "mesquite",
  "denton",
  "allen",
  "richardson",
  "forney",
  "waxahachie",
  "rockwall",
  "flower mound",
  "euless",
  "bedford",
  "grapevine",
  "southlake",
  "keller",
  "wylie",
  "rowlett",
  "desoto",
  "cedar hill",
] as const;

const CHAINS: readonly Chain[] = [
  { id: "costco", name: "Costco", group: "big-box", url: "https://www.costco.com", domain: "costco.com", rank: 10, states: except(["RI", "WV", "WY"]), footprint: "warehouse clubs" },
  { id: "sams-club", name: "Sam's Club", group: "big-box", url: "https://www.samsclub.com", domain: "samsclub.com", rank: 20, states: except(["AK", "DC", "MA", "OR", "RI", "VT", "WA"]), footprint: "warehouse clubs" },
  {
    id: "bjs",
    name: "BJ's",
    group: "big-box",
    url: "https://www.bjs.com",
    domain: "bjs.com",
    rank: 30,
    states: ["AL", "CT", "DE", "FL", "GA", "IN", "KY", "ME", "MD", "MA", "MI", "NH", "NJ", "NY", "NC", "OH", "PA", "RI", "SC", "TN", "TX", "VA"],
    onlyCities: { TX: DFW },
    footprint: "warehouse clubs",
  },
  { id: "walmart", name: "Walmart", group: "big-box", url: "https://www.walmart.com", domain: "walmart.com", rank: 40, states: ALL_STATES, footprint: "supercenters and neighborhood markets" },
  { id: "target", name: "Target", group: "big-box", url: "https://www.target.com", domain: "target.com", rank: 50, states: ALL_STATES, footprint: "stores" },
  { id: "meijer", name: "Meijer", group: "big-box", url: "https://www.meijer.com", domain: "meijer.com", rank: 60, states: ["IL", "IN", "KY", "MI", "OH", "WI"], footprint: "supercenters" },
  { id: "amazon", name: "Amazon", group: "big-box", url: "https://www.amazon.com", domain: "amazon.com", rank: 70, states: ALL_STATES, online: true, footprint: "online" },

  { id: "heb", name: "H-E-B", group: "grocery", url: "https://www.heb.com", domain: "heb.com", rank: 10, states: ["TX"], skipCities: ["el paso"], footprint: "supermarkets" },
  { id: "kroger", name: "Kroger", group: "grocery", url: "https://www.kroger.com", domain: "kroger.com", rank: 20, states: ["AL", "AR", "GA", "IL", "IN", "KY", "LA", "MI", "MS", "MO", "OH", "SC", "TN", "TX", "WV"], footprint: "supermarkets" },
  { id: "publix", name: "Publix", group: "grocery", url: "https://www.publix.com", domain: "publix.com", rank: 30, states: ["AL", "FL", "GA", "KY", "NC", "SC", "TN", "VA"], footprint: "supermarkets" },
  { id: "wegmans", name: "Wegmans", group: "grocery", url: "https://www.wegmans.com", domain: "wegmans.com", rank: 40, states: ["CT", "DC", "DE", "MA", "MD", "NC", "NJ", "NY", "PA", "VA"], footprint: "supermarkets" },
  { id: "safeway", name: "Safeway", group: "grocery", url: "https://www.safeway.com", domain: "safeway.com", rank: 50, states: ["AK", "AZ", "CA", "CO", "DC", "HI", "MD", "OR", "VA", "WA"], skipCities: SOCAL, footprint: "supermarkets" },
  { id: "hy-vee", name: "Hy-Vee", group: "grocery", url: "https://www.hy-vee.com", domain: "hy-vee.com", rank: 60, states: ["IA", "IL", "KS", "MN", "MO", "NE", "SD", "WI"], footprint: "supermarkets" },
  { id: "giant-eagle", name: "Giant Eagle", group: "grocery", url: "https://www.gianteagle.com", domain: "gianteagle.com", rank: 70, states: ["IN", "MD", "OH", "PA", "WV"], footprint: "supermarkets" },
  { id: "food-lion", name: "Food Lion", group: "grocery", url: "https://www.foodlion.com", domain: "foodlion.com", rank: 80, states: ["DE", "GA", "KY", "MD", "NC", "PA", "SC", "TN", "VA", "WV"], footprint: "supermarkets" },
  { id: "stop-and-shop", name: "Stop & Shop", group: "grocery", url: "https://www.stopandshop.com", domain: "stopandshop.com", rank: 90, states: ["CT", "MA", "NJ", "NY", "RI"], footprint: "supermarkets" },
  { id: "shoprite", name: "ShopRite", group: "grocery", url: "https://www.shoprite.com", domain: "shoprite.com", rank: 100, states: ["CT", "DE", "MD", "NJ", "NY", "PA"], footprint: "supermarkets" },
  { id: "hannaford", name: "Hannaford", group: "grocery", url: "https://www.hannaford.com", domain: "hannaford.com", rank: 110, states: ["MA", "ME", "NH", "NY", "VT"], footprint: "supermarkets" },
  { id: "jewel-osco", name: "Jewel-Osco", group: "grocery", url: "https://www.jewelosco.com", domain: "jewelosco.com", rank: 120, states: ["IL"], footprint: "supermarkets" },
  { id: "schnucks", name: "Schnucks", group: "grocery", url: "https://www.schnucks.com", domain: "schnucks.com", rank: 130, states: ["IL", "IN", "MO"], footprint: "supermarkets" },
  { id: "fiesta", name: "Fiesta Mart", group: "grocery", url: "https://www.fiestamart.com", domain: "fiestamart.com", rank: 140, states: ["TX"], onlyCities: { TX: [...HOUSTON, ...AUSTIN, ...DFW] }, footprint: "supermarkets" },
  { id: "randalls", name: "Randalls", group: "grocery", url: "https://www.randalls.com", domain: "randalls.com", rank: 150, states: ["TX"], onlyCities: { TX: [...HOUSTON, ...AUSTIN] }, footprint: "supermarkets" },
  { id: "central-market", name: "Central Market", group: "grocery", url: "https://www.centralmarket.com", domain: "centralmarket.com", rank: 160, states: ["TX"], onlyCities: { TX: [...HOUSTON, ...AUSTIN, ...DFW, "san antonio"] }, footprint: "supermarkets" },
  { id: "winn-dixie", name: "Winn-Dixie", group: "grocery", url: "https://www.winndixie.com", domain: "winndixie.com", rank: 170, states: ["AL", "FL", "GA", "LA", "MS"], footprint: "supermarkets" },
  { id: "ingles", name: "Ingles", group: "grocery", url: "https://www.ingles-markets.com", domain: "ingles-markets.com", rank: 180, states: ["AL", "GA", "NC", "SC", "TN", "VA"], footprint: "supermarkets" },
  { id: "smart-final", name: "Smart & Final", group: "grocery", url: "https://www.smartandfinal.com", domain: "smartandfinal.com", rank: 190, states: ["AZ", "CA", "NV"], footprint: "warehouse grocery stores" },
  { id: "grocery-outlet", name: "Grocery Outlet", group: "grocery", url: "https://www.groceryoutlet.com", domain: "groceryoutlet.com", rank: 200, states: ["CA", "DE", "ID", "MD", "NV", "NJ", "OH", "OR", "PA", "WA"], footprint: "discount supermarkets" },
  { id: "lucky", name: "Lucky", group: "grocery", url: "https://www.luckysupermarkets.com", domain: "luckysupermarkets.com", rank: 210, states: ["CA"], skipCities: SOCAL, footprint: "supermarkets" },
  { id: "sprouts", name: "Sprouts", group: "grocery", url: "https://www.sprouts.com", domain: "sprouts.com", rank: 220, states: ["AL", "AZ", "CA", "CO", "DE", "FL", "GA", "KS", "LA", "MD", "MO", "NC", "NJ", "NM", "NV", "NY", "OK", "PA", "SC", "TN", "TX", "UT", "VA", "WA", "WY"], footprint: "grocery stores" },
  { id: "aldi", name: "Aldi", group: "grocery", url: "https://www.aldi.us", domain: "aldi.us", rank: 230, states: ["AL", "AR", "AZ", "CA", "CT", "DC", "DE", "FL", "GA", "IA", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "MS", "NC", "ND", "NE", "NH", "NJ", "NV", "NY", "OH", "OK", "PA", "RI", "SC", "SD", "TN", "TX", "VA", "VT", "WI", "WV"], footprint: "discount supermarkets" },
  { id: "trader-joes", name: "Trader Joe's", group: "grocery", url: "https://www.traderjoes.com", domain: "traderjoes.com", rank: 240, states: ["AL", "AR", "AZ", "CA", "CO", "CT", "DC", "DE", "FL", "GA", "IA", "ID", "IL", "IN", "KS", "KY", "LA", "MA", "MD", "ME", "MI", "MN", "MO", "NC", "NE", "NH", "NJ", "NM", "NV", "NY", "OH", "OK", "OR", "PA", "RI", "SC", "TN", "TX", "UT", "VA", "VT", "WA", "WI"], footprint: "grocery stores" },
  { id: "whole-foods", name: "Whole Foods", group: "grocery", url: "https://www.wholefoodsmarket.com", domain: "wholefoodsmarket.com", rank: 250, states: except(["AK", "DE", "ND", "SD", "VT", "WV"]), footprint: "grocery stores" },

  { id: "cvs", name: "CVS", group: "pharmacy", url: "https://www.cvs.com", domain: "cvs.com", rank: 10, states: ALL_STATES, footprint: "pharmacies" },
  { id: "walgreens", name: "Walgreens", group: "pharmacy", url: "https://www.walgreens.com", domain: "walgreens.com", rank: 20, states: ALL_STATES, footprint: "pharmacies" },

  { id: "home-depot", name: "Home Depot", group: "home", url: "https://www.homedepot.com", domain: "homedepot.com", rank: 10, states: ALL_STATES, footprint: "home improvement stores" },
  { id: "lowes", name: "Lowe's", group: "home", url: "https://www.lowes.com", domain: "lowes.com", rank: 20, states: ALL_STATES, footprint: "home improvement stores" },

  { id: "dollar-general", name: "Dollar General", group: "dollar", url: "https://www.dollargeneral.com", domain: "dollargeneral.com", rank: 10, states: except(["AK", "HI"]), skipCities: ["san francisco"], footprint: "discount stores" },
  { id: "dollar-tree", name: "Dollar Tree", group: "dollar", url: "https://www.dollartree.com", domain: "dollartree.com", rank: 20, states: except(["AK", "HI"]), footprint: "discount stores" },
  { id: "family-dollar", name: "Family Dollar", group: "dollar", url: "https://www.familydollar.com", domain: "familydollar.com", rank: 30, states: except(["AK", "HI"]), footprint: "discount stores" },
  { id: "five-below", name: "Five Below", group: "dollar", url: "https://www.fivebelow.com", domain: "fivebelow.com", rank: 40, states: except(["AK", "HI", "ID", "MT"]), footprint: "discount stores" },
];

const GROUP_ORDER: Record<NearbyGroup, number> = { "big-box": 0, grocery: 1, pharmacy: 2, home: 3, dollar: 4 };

const BLOCKED_HOSTS = new Set(["facebook.com", "instagram.com", "tiktok.com", "linktr.ee", "etsy.com"]);

const siteCache = new Map<string, Promise<boolean>>();

function isUnitedStates(country: string): boolean {
  const value = country.trim().toLowerCase();
  return value === "united states" || value === "united states of america" || value === "usa" || value === "us";
}

export function normalizeRegion(region: string): string | null {
  const trimmed = region.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  if (STATE_NAMES[upper]) return upper;
  const match = Object.entries(STATE_NAMES).find(([, name]) => name.toLowerCase() === trimmed.toLowerCase());
  return match?.[0] ?? null;
}

function cityKey(city: string): string {
  return city.trim().toLowerCase().replace(/\./g, "").replace(/\s+/g, " ");
}

function chainFits(chain: Chain, region: string, city: string): boolean {
  if (!chain.states.includes(region)) return false;
  const key = cityKey(city);
  if (chain.skipCities?.includes(key)) return false;
  const only = chain.onlyCities?.[region];
  if (only && !only.includes(key)) return false;
  return true;
}

function reasonFor(chain: Chain, city: string, region: string): string {
  const state = STATE_NAMES[region] ?? region;
  if (chain.online) return `Online retailer that ships to ${city}.`;
  if (chain.id === "heb" && cityKey(city) === "houston") return "H-E-B operates supermarkets across Texas, including Houston.";
  if (chain.id === "safeway" && region === "CA") return "Safeway operates supermarkets in Northern California, including the Bay Area.";
  if (chain.id === "fiesta") return "Fiesta Mart operates supermarkets in Houston, Austin, and Dallas–Fort Worth.";
  if (chain.id === "randalls") return "Randalls operates supermarkets in the Houston and Austin areas.";
  if (chain.id === "central-market") return "Central Market operates supermarkets in major Texas cities, including this metro.";
  if (chain.id === "bjs" && region === "TX") return "BJ's operates warehouse clubs in the Dallas–Fort Worth area.";
  if (chain.id === "publix") return `Publix operates supermarkets in the Southeast, including ${state}.`;
  if (chain.id === "wegmans") return `Wegmans operates supermarkets in the Northeast, including ${state}.`;
  if (chain.id === "meijer") return `Meijer operates supercenters in the Midwest, including ${state}.`;
  if (chain.id === "lucky") return "Lucky operates supermarkets in Northern California.";
  if (chain.id === "grocery-outlet" && region === "CA") return "Grocery Outlet operates discount supermarkets in California, including San Francisco.";
  if (chain.id === "smart-final" && region === "CA") return "Smart & Final operates warehouse grocery stores in California, including the Bay Area.";
  return `${chain.name} operates ${chain.footprint} in ${state}.`;
}

/** Every chain the address qualifies for, largest groups first. Amazon is last. */
export function rankedNearby(input: { city: string; region: string; country: string }): NearbyStore[] {
  if (!isUnitedStates(input.country)) return [];
  const region = normalizeRegion(input.region);
  const city = input.city.trim();
  if (!region || city.length < 2) return [];
  const matches = CHAINS.filter((chain) => chainFits(chain, region, city));
  const local = matches
    .filter((chain) => !chain.online)
    .sort((a, b) => GROUP_ORDER[a.group] - GROUP_ORDER[b.group] || a.rank - b.rank);
  const online = matches.filter((chain) => chain.online);
  return [...local, ...online].map((chain) => ({
    id: chain.id,
    name: chain.name,
    group: chain.group,
    url: chain.url,
    domain: chain.domain,
    reason: reasonFor(chain, city, region),
  }));
}

/** Keep at most 19 stores a household can reach, then one online option. */
export function capNearby(stores: readonly NearbyStore[]): NearbyStore[] {
  const amazon = stores.find((store) => store.id === "amazon");
  const local = stores.filter((store) => store.id !== "amazon");
  const picked = local.slice(0, amazon ? NEARBY_CAP - 1 : NEARBY_CAP);
  if (amazon) picked.push(amazon);
  return picked.slice(0, NEARBY_CAP);
}

export function selectNearbyStores(input: { city: string; region: string; country: string }): NearbyStore[] {
  return capNearby(rankedNearby(input));
}

export function hostMatches(url: string, domain: string): boolean {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
    const expected = domain.replace(/^www\./, "").toLowerCase();
    return host === expected || host.endsWith(`.${expected}`);
  } catch {
    return false;
  }
}

async function fetchRetailSite(url: string, domain: string, fetchImpl: typeof fetch): Promise<boolean> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }
  if (parsed.protocol !== "https:") return false;
  try {
    const response = await fetchImpl(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: {
        Accept: "text/html,application/xhtml+xml",
        "User-Agent": "ProfessionalBuyer demo",
      },
    });
    if (response.status >= 500) return false;
    if (response.status >= 400 && response.status !== 401 && response.status !== 403 && response.status !== 429) return false;
    const finalUrl = response.url || url;
    if (!hostMatches(finalUrl, domain)) return false;
    const host = new URL(finalUrl).hostname.replace(/^www\./, "").toLowerCase();
    if (BLOCKED_HOSTS.has(host)) return false;
    return true;
  } catch {
    return false;
  }
}

/** True when the store's own https site answers with a status a buyer can still open. */
export function verifyRetailSite(url: string, domain: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  if (fetchImpl !== fetch) return fetchRetailSite(url, domain, fetchImpl);
  const cached = siteCache.get(domain);
  if (cached) return cached;
  const pending = fetchRetailSite(url, domain, fetchImpl);
  siteCache.set(domain, pending);
  return pending;
}

type GeocodeHit = { city: string; region: string };

function placeFromNominatim(body: unknown): GeocodeHit | null {
  if (!Array.isArray(body) || !body[0] || typeof body[0] !== "object") return null;
  const first = body[0] as { address?: Record<string, unknown> };
  const address = first.address;
  if (!address) return null;
  const country = typeof address.country_code === "string" ? address.country_code.toLowerCase() : "";
  if (country && country !== "us") return null;
  const iso = typeof address["ISO3166-2-lvl4"] === "string" ? address["ISO3166-2-lvl4"] : "";
  const fromIso = iso.startsWith("US-") ? normalizeRegion(iso.slice(3)) : null;
  const fromName = typeof address.state === "string" ? normalizeRegion(address.state) : null;
  const region = fromIso ?? fromName;
  const cityValue = [address.city, address.town, address.village, address.hamlet, address.municipality].find((value) => typeof value === "string" && value.trim());
  if (!region || typeof cityValue !== "string") return null;
  return { city: cityValue.trim(), region };
}

export async function geocodeAddress(address: NearbyAddress, fetchImpl: typeof fetch = fetch): Promise<GeocodeHit | null> {
  const query = [address.addressLine, address.city, address.region, address.postalCode, address.country]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
  if (!query) return null;
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=1&q=${encodeURIComponent(query)}`;
  try {
    const response = await fetchImpl(url, {
      signal: AbortSignal.timeout(8000),
      headers: {
        Accept: "application/json",
        "User-Agent": "ProfessionalBuyer demo",
      },
    });
    if (!response.ok) return null;
    return placeFromNominatim(await response.json());
  } catch {
    return null;
  }
}

export async function buildNearbyStores(
  address: NearbyAddress,
  deps?: {
    geocode?: (address: NearbyAddress) => Promise<GeocodeHit | null>;
    verify?: (store: NearbyStore) => Promise<boolean>;
  },
): Promise<NearbyResponse> {
  let city = address.city.trim();
  let region = normalizeRegion(address.region) ?? "";
  if (isUnitedStates(address.country)) {
    try {
      const geo = await (deps?.geocode ?? geocodeAddress)(address);
      if (geo) {
        city = geo.city || city;
        region = geo.region || region;
      }
    } catch {
      // The typed state still chooses the footprint.
    }
  }
  if (!isUnitedStates(address.country) || !region) {
    return { city, region: region || address.region.trim(), stores: [] };
  }
  const ranked = rankedNearby({ city, region, country: address.country });
  const verify = deps?.verify ?? ((store: NearbyStore) => verifyRetailSite(store.url, store.domain));
  const checked = await Promise.all(ranked.map(async (store) => ((await verify(store)) ? store : null)));
  const stores = capNearby(checked.filter((store): store is NearbyStore => store !== null));
  return { city, region, stores };
}
