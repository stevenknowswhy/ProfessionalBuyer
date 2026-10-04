/** Stores the buyer is allowed to search. Selection lives in the browser. */

export type StoreGroupId = "big-box" | "grocery" | "pharmacy" | "marketplace" | "home" | "dollar";

export const STORE_GROUPS: { id: StoreGroupId; label: string; blurb: string }[] = [
  { id: "big-box", label: "Big box", blurb: "Warehouse clubs and the large general stores." },
  { id: "grocery", label: "Grocery", blurb: "Supermarkets." },
  { id: "pharmacy", label: "Pharmacy", blurb: "Drugstores." },
  { id: "marketplace", label: "Marketplace", blurb: "Many sellers on one site. eBay, Temu, and Etsy are in this group." },
  { id: "home", label: "Home", blurb: "Home improvement, electronics, and furniture." },
  { id: "dollar", label: "Dollar", blurb: "Discount stores." },
];

export type CatalogStore = {
  id: string;
  name: string;
  group: StoreGroupId;
  /** Hosts, without www. A pasted link on one of these turns the store on. */
  domains: string[];
  url: string;
  /** Other retailer names in sample offers that mean this store. */
  aliases?: string[];
};

export type CustomStore = {
  id: string;
  name: string;
  url: string;
  host: string;
};

export type StoreSelection = {
  selectedIds: string[];
  custom: CustomStore[];
};

export const CATALOG: CatalogStore[] = [
  { id: "walmart", name: "Walmart", group: "big-box", domains: ["walmart.com"], url: "https://www.walmart.com" },
  { id: "target", name: "Target", group: "big-box", domains: ["target.com"], url: "https://www.target.com" },
  { id: "costco", name: "Costco", group: "big-box", domains: ["costco.com"], url: "https://www.costco.com" },
  { id: "sams-club", name: "Sam's Club", group: "big-box", domains: ["samsclub.com"], url: "https://www.samsclub.com" },
  { id: "bjs", name: "BJ's", group: "big-box", domains: ["bjs.com"], url: "https://www.bjs.com" },
  { id: "amazon", name: "Amazon", group: "big-box", domains: ["amazon.com"], url: "https://www.amazon.com", aliases: ["Amazon Fresh"] },
  { id: "meijer", name: "Meijer", group: "big-box", domains: ["meijer.com"], url: "https://www.meijer.com" },

  { id: "kroger", name: "Kroger", group: "grocery", domains: ["kroger.com"], url: "https://www.kroger.com" },
  { id: "aldi", name: "Aldi", group: "grocery", domains: ["aldi.us"], url: "https://www.aldi.us" },
  { id: "trader-joes", name: "Trader Joe's", group: "grocery", domains: ["traderjoes.com"], url: "https://www.traderjoes.com" },
  { id: "whole-foods", name: "Whole Foods", group: "grocery", domains: ["wholefoodsmarket.com"], url: "https://www.wholefoodsmarket.com" },
  { id: "safeway", name: "Safeway", group: "grocery", domains: ["safeway.com"], url: "https://www.safeway.com" },
  { id: "publix", name: "Publix", group: "grocery", domains: ["publix.com"], url: "https://www.publix.com" },
  { id: "heb", name: "H-E-B", group: "grocery", domains: ["heb.com"], url: "https://www.heb.com" },
  { id: "wegmans", name: "Wegmans", group: "grocery", domains: ["wegmans.com"], url: "https://www.wegmans.com" },

  { id: "cvs", name: "CVS", group: "pharmacy", domains: ["cvs.com"], url: "https://www.cvs.com" },
  { id: "walgreens", name: "Walgreens", group: "pharmacy", domains: ["walgreens.com"], url: "https://www.walgreens.com" },
  { id: "rite-aid", name: "Rite Aid", group: "pharmacy", domains: ["riteaid.com"], url: "https://www.riteaid.com" },

  { id: "ebay", name: "eBay", group: "marketplace", domains: ["ebay.com"], url: "https://www.ebay.com" },
  { id: "temu", name: "Temu", group: "marketplace", domains: ["temu.com"], url: "https://www.temu.com" },
  { id: "etsy", name: "Etsy", group: "marketplace", domains: ["etsy.com"], url: "https://www.etsy.com" },

  { id: "home-depot", name: "Home Depot", group: "home", domains: ["homedepot.com"], url: "https://www.homedepot.com" },
  { id: "lowes", name: "Lowe's", group: "home", domains: ["lowes.com"], url: "https://www.lowes.com" },
  { id: "best-buy", name: "Best Buy", group: "home", domains: ["bestbuy.com"], url: "https://www.bestbuy.com" },
  { id: "ikea", name: "IKEA", group: "home", domains: ["ikea.com"], url: "https://www.ikea.com" },

  { id: "dollar-general", name: "Dollar General", group: "dollar", domains: ["dollargeneral.com"], url: "https://www.dollargeneral.com" },
  { id: "dollar-tree", name: "Dollar Tree", group: "dollar", domains: ["dollartree.com"], url: "https://www.dollartree.com" },
  { id: "family-dollar", name: "Family Dollar", group: "dollar", domains: ["familydollar.com"], url: "https://www.familydollar.com" },
  { id: "five-below", name: "Five Below", group: "dollar", domains: ["fivebelow.com"], url: "https://www.fivebelow.com" },
];

/** On first visit the buyer already searches the sample retailers plus eBay, Temu, and Etsy. */
export const DEFAULT_SELECTED_IDS = ["costco", "walmart", "target", "amazon", "ebay", "temu", "etsy"];

export const DEFAULT_SELECTION: StoreSelection = { selectedIds: [...DEFAULT_SELECTED_IDS], custom: [] };

const STORAGE_KEY = "margin-stores-v1";

const byId = new Map(CATALOG.map((store) => [store.id, store]));

export function catalogStore(id: string): CatalogStore | undefined {
  return byId.get(id);
}

export function groupLabel(id: StoreGroupId): string {
  return STORE_GROUPS.find((group) => group.id === id)?.label ?? id;
}

function hostOf(url: URL): string {
  return url.hostname.replace(/^www\./, "").toLowerCase();
}

function catalogForHost(host: string): CatalogStore | undefined {
  return CATALOG.find((store) => store.domains.some((domain) => host === domain || host.endsWith(`.${domain}`)));
}

export type LinkOutcome =
  | { ok: true; selection: StoreSelection; message: string; storeName: string }
  | { ok: false; message: string };

/** Turn a pasted store or product link into a selected catalog store, or a custom store. */
export function addStoreLink(selection: StoreSelection, raw: string): LinkOutcome {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: false, message: "Paste a store link first." };

  let url: URL;
  try {
    url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
  } catch {
    return { ok: false, message: "That is not a link. Paste the store's address, like https://www.costco.com." };
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return { ok: false, message: "Use an http or https link." };
  }

  const host = hostOf(url);
  if (!host || !host.includes(".")) return { ok: false, message: "That link has no store address." };

  const known = catalogForHost(host);
  if (known) {
    const already = selection.selectedIds.includes(known.id);
    return {
      ok: true,
      storeName: known.name,
      selection: already ? selection : { ...selection, selectedIds: [...selection.selectedIds, known.id] },
      message: already
        ? `${known.name} is already in your stores.`
        : `Added ${known.name}. The buyer searches the whole store, not one product.`,
    };
  }

  const id = `custom:${host}`;
  const existing = selection.custom.find((store) => store.id === id);
  if (existing) {
    const already = selection.selectedIds.includes(existing.id);
    return {
      ok: true,
      storeName: existing.name,
      selection: already ? selection : { ...selection, selectedIds: [...selection.selectedIds, existing.id] },
      message: already ? `${existing.name} is already in your stores.` : `Added ${existing.name}.`,
    };
  }

  const custom: CustomStore = { id, name: host, url: `${url.protocol}//${url.host}`, host };
  return {
    ok: true,
    storeName: custom.name,
    selection: { selectedIds: [...selection.selectedIds, id], custom: [...selection.custom, custom] },
    message: `Added ${host}. The buyer will include this store when it searches.`,
  };
}

export function toggleStore(selection: StoreSelection, id: string): StoreSelection {
  const selected = selection.selectedIds.includes(id);
  return {
    ...selection,
    selectedIds: selected ? selection.selectedIds.filter((item) => item !== id) : [...selection.selectedIds, id],
  };
}

export function removeCustomStore(selection: StoreSelection, id: string): StoreSelection {
  return {
    selectedIds: selection.selectedIds.filter((item) => item !== id),
    custom: selection.custom.filter((store) => store.id !== id),
  };
}

export function storesMatching(query: string, group: StoreGroupId | "all" | "added", selectedIds: readonly string[]): CatalogStore[] {
  const q = query.trim().toLowerCase();
  return CATALOG.filter((store) => {
    if (group === "added" && !selectedIds.includes(store.id)) return false;
    if (group !== "all" && group !== "added" && store.group !== group) return false;
    if (!q) return true;
    const label = groupLabel(store.group).toLowerCase();
    return (
      store.name.toLowerCase().includes(q) ||
      store.domains.some((domain) => domain.includes(q)) ||
      label.includes(q) ||
      (store.aliases ?? []).some((alias) => alias.toLowerCase().includes(q))
    );
  });
}

export function customMatching(query: string, group: StoreGroupId | "all" | "added", selection: StoreSelection): CustomStore[] {
  if (group !== "all" && group !== "added") return [];
  const q = query.trim().toLowerCase();
  return selection.custom.filter((store) => {
    if (group === "added" && !selection.selectedIds.includes(store.id)) return false;
    if (!q) return true;
    return store.name.toLowerCase().includes(q) || store.host.includes(q) || "your links".includes(q);
  });
}

/** Catalog id when a sample retailer name is one of our stores. */
export function matchRetailer(retailer: string): string | null {
  const needle = retailer.trim().toLowerCase();
  const store = CATALOG.find(
    (item) => item.name.toLowerCase() === needle || (item.aliases ?? []).some((alias) => alias.toLowerCase() === needle),
  );
  return store?.id ?? null;
}

export type RetailerCoverage = "in" | "out" | "unknown";

export function retailerCoverage(retailer: string, selectedIds: readonly string[]): RetailerCoverage {
  const id = matchRetailer(retailer);
  if (!id) return "unknown";
  return selectedIds.includes(id) ? "in" : "out";
}

export type ChosenStore = { id: string; name: string; url: string; custom: boolean; group?: StoreGroupId };

export function chosenStores(selection: StoreSelection): ChosenStore[] {
  const catalog = selection.selectedIds
    .map((id) => catalogStore(id))
    .filter((store): store is CatalogStore => Boolean(store))
    .map((store) => ({ id: store.id, name: store.name, url: store.url, custom: false, group: store.group }));
  const custom = selection.custom
    .filter((store) => selection.selectedIds.includes(store.id))
    .map((store) => ({ id: store.id, name: store.name, url: store.url, custom: true }));
  return [...catalog, ...custom];
}

export function loadSelection(): StoreSelection | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoreSelection>;
    if (!Array.isArray(parsed.selectedIds) || !Array.isArray(parsed.custom)) return null;
    const selectedIds = parsed.selectedIds.filter((id): id is string => typeof id === "string");
    const custom = parsed.custom.filter(
      (store): store is CustomStore =>
        Boolean(store) &&
        typeof store.id === "string" &&
        typeof store.name === "string" &&
        typeof store.url === "string" &&
        typeof store.host === "string",
    );
    const known = new Set([...CATALOG.map((store) => store.id), ...custom.map((store) => store.id)]);
    return { custom, selectedIds: selectedIds.filter((id) => known.has(id)) };
  } catch {
    return null;
  }
}

export function saveSelection(selection: StoreSelection): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
}
