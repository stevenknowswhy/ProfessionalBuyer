/**
 * Five Amazon.com listings a US family of four would buy in a week.
 * Checked 2026-10-04. Prices are observations from the product page that day, not guarantees.
 * deliveredCents is set only when a dollar amount was printed on that page.
 */

export type FamilyItem = {
  id: string;
  /** Plain name a parent would recognize. */
  name: string;
  /** Amazon product title. The pack size is in this title. */
  title: string;
  /** Pack size as printed in the Amazon title. */
  pack: string;
  /** Product page (/dp/ or /gp/product/), not a search page. */
  url: string;
  /** Integer cents printed on the page, or null when the page listed no price. */
  deliveredCents: number | null;
};

export const FAMILY_ITEMS: FamilyItem[] = [
  {
    id: "bounty-towels",
    name: "Bounty paper towels",
    title: "Bounty Select-A-Size Paper Towels, White, 8 Triple Rolls = 24 Regular Roll",
    pack: "8 triple rolls",
    url: "https://www.amazon.com/Bounty-Select-Towels-Triple-Regular/dp/B0DQYPYVB6",
    deliveredCents: 2539,
  },
  {
    id: "tide-detergent",
    name: "Tide laundry detergent",
    title: "Tide Original Scent Liquid Laundry Detergent, 100 Fl Oz (Packaging May Vary)",
    pack: "100 fl oz",
    url: "https://www.amazon.com/Tide-Original-Laundry-Detergent-Packaging/dp/B000V9QMGQ",
    deliveredCents: 3690,
  },
  {
    id: "dawn-dish-soap",
    name: "Dawn dish soap",
    title: "Dawn Ultra Concentrated Dish Detergent - Original Scent - 90 oz. Bottle",
    pack: "90 oz",
    url: "https://www.amazon.com/Dawn-Ultra-Dishwashing-Liquid-Original/dp/B015JJPYAM",
    deliveredCents: 2449,
  },
  {
    id: "glad-trash-bags",
    name: "Glad trash bags",
    title: "Glad ForceFlex Tall Kitchen Drawstring Trash Bags - Fresh Clean with Febreze, 160 ct./13 gal.",
    pack: "160 count, 13 gal",
    url: "https://www.amazon.com/dp/B0DD1TH3JY",
    deliveredCents: 3595,
  },
  {
    id: "crest-toothpaste",
    name: "Crest toothpaste",
    title: "Crest Complete Whitening + Scope Toothpaste, 6.5 Ounce (5 Pack)",
    pack: "6.5 oz, 5 pack",
    url: "https://www.amazon.com/dp/B092BH949D",
    deliveredCents: 2150,
  },
];

/** Lanes the phone app already understands: local big-box, Amazon online, Temu overseas. */
export const FAMILY_STORES = [
  { id: "walmart", name: "Walmart", domain: "walmart.com" },
  { id: "target", name: "Target", domain: "target.com" },
  { id: "costco", name: "Costco", domain: "costco.com" },
  { id: "amazon", name: "Amazon", domain: "amazon.com" },
  { id: "temu", name: "Temu", domain: "temu.com" },
] as const;
