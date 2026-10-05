import { NextResponse } from "next/server";
import type { Offer } from "@buyer/contract";
import householdJson from "@buyer/contract/fixtures/household.sample.json";
import savingsJson from "@buyer/contract/fixtures/savings.sample.json";
import {
  bestItemMatch,
  laneForStore,
  laneFromChannel,
  parseDollarCents,
  type ComparedOffer,
  type Lane,
} from "@/lib/receipt";
import { catalogStore, matchRetailer, type StoreGroupId } from "@/lib/stores";

export const runtime = "nodejs";
export const maxDuration = 60;

type StoreIn = { id?: unknown; name?: unknown; domain?: unknown; group?: unknown };

const JEV_URL = "https://openrouter.ai/api/alpha/decisions";
const JEV_MODEL = "typesafe/jev-1.13";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { name?: unknown; stores?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) return NextResponse.json({ error: "Pick an item from the receipt." }, { status: 400 });

  const stores = (Array.isArray(body?.stores) ? body.stores : []).flatMap(normalizeStore);
  if (stores.length === 0) {
    return NextResponse.json({ error: "Add at least one store before searching." }, { status: 400 });
  }

  const household = householdJson as { items: { id: string; name: string }[] };
  const savings = savingsJson as { items: { itemId: string; offers: Offer[] }[] };
  const matched = bestItemMatch(name, household.items);
  const fixtureOffers = matched
    ? (savings.items.find((item) => item.itemId === matched.id)?.offers ?? []).filter((offer) => !offer.excludedReason)
    : [];

  const offers: ComparedOffer[] = [];
  const covered = new Set<string>();

  for (const offer of fixtureOffers) {
    const storeId = matchRetailer(offer.retailer);
    const selected = stores.find((store) => store.id === storeId || store.name.toLowerCase() === offer.retailer.toLowerCase());
    if (!selected) continue;
    covered.add(selected.id);
    offers.push({
      storeId: selected.id,
      storeName: selected.name,
      lane: laneFromChannel(offer.channel),
      title: offer.title,
      url: offer.url || null,
      deliveredCents: offer.deliveredCents,
      shippingCents: offer.shippingCents,
      dutyCents: offer.dutyEstimateCents,
      match: null,
      provenance: "sample",
    });
  }

  const missing = stores.filter((store) => !covered.has(store.id)).slice(0, 6);
  const live = await searchLive(name, missing);
  offers.push(...live);

  const jev = await scoreMatches(name, offers);
  for (let i = 0; i < offers.length; i++) offers[i].match = jev.scores[i] ?? null;

  const provenance = offers.some((offer) => offer.provenance === "live")
    ? offers.some((offer) => offer.provenance === "sample")
      ? "mixed"
      : "live"
    : "sample";

  return NextResponse.json({
    itemId: matched?.id ?? null,
    itemName: matched?.name ?? name,
    offers,
    jev: jev.ok ? "live" : "unavailable",
    provenance,
  });
}

function normalizeStore(store: unknown): { id: string; name: string; domain: string; group?: StoreGroupId }[] {
  if (!store || typeof store !== "object") return [];
  const row = store as StoreIn;
  const id = typeof row.id === "string" ? row.id : "";
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (!id || !name) return [];
  const known = catalogStore(id);
  const domain = typeof row.domain === "string" && row.domain ? row.domain : (known?.domains[0] ?? "");
  const group = known?.group;
  return [{ id, name, domain, group }];
}

async function searchLive(
  itemName: string,
  stores: { id: string; name: string; domain: string; group?: StoreGroupId }[],
): Promise<ComparedOffer[]> {
  const key = process.env.EXA_API_KEY;
  if (!key || stores.length === 0) return [];
  const found = await Promise.all(
    stores.map(async (store): Promise<ComparedOffer | null> => {
      const query = store.domain ? `${itemName} site:${store.domain}` : `${itemName} ${store.name}`;
      try {
        const res = await fetch("https://api.exa.ai/search", {
          method: "POST",
          headers: { "content-type": "application/json", "x-api-key": key },
          body: JSON.stringify({ query, numResults: 2, contents: { highlights: true } }),
          signal: AbortSignal.timeout(12_000),
        });
        if (!res.ok) return null;
        const json = (await res.json()) as { results?: { title?: string; url?: string; highlights?: unknown }[] };
        const hit = json.results?.find((result) => result.title || result.url);
        if (!hit) return null;
        const highlights = Array.isArray(hit.highlights) ? hit.highlights.filter((part): part is string => typeof part === "string").join(" ") : "";
        const blob = `${hit.title ?? ""} ${highlights}`;
        const lane: Lane = laneForStore(store.id, store.group);
        return {
          storeId: store.id,
          storeName: store.name,
          lane,
          title: hit.title || store.name,
          url: hit.url ?? null,
          deliveredCents: parseDollarCents(blob),
          shippingCents: 0,
          dutyCents: 0,
          match: null,
          provenance: "live" as const,
        };
      } catch {
        return null;
      }
    }),
  );
  return found.filter((offer): offer is ComparedOffer => offer != null);
}

async function scoreMatches(itemName: string, offers: ComparedOffer[]): Promise<{ ok: boolean; scores: (number | null)[] }> {
  const empty = offers.map(() => null);
  const key = process.env.OPENROUTER_API_KEY;
  if (!key || offers.length === 0) return { ok: false, scores: empty };

  const questions: Record<string, unknown> = {};
  offers.forEach((offer, index) => {
    questions[`same_${index}`] = {
      type: "noul",
      instructions: `Is this listing the same product as the purchased item "${itemName}"? Listing at ${offer.storeName}: ${offer.title}`,
      criteria: {
        true: "The same product: same kind of item, close in brand, size, and form.",
        false: "A different product, a refill accessory, or a clearly different size or brand.",
      },
    };
  });

  try {
    const res = await fetch(JEV_URL, {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        model: JEV_MODEL,
        state: `Purchased item: ${itemName}`,
        questions,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return { ok: false, scores: empty };
    const json = (await res.json()) as { model?: string; answers?: Record<string, { noul?: number }> };
    if (json.model?.includes("jev-router")) return { ok: false, scores: empty };
    const scores = offers.map((_, index) => {
      const noul = json.answers?.[`same_${index}`]?.noul;
      return typeof noul === "number" ? noul : null;
    });
    return { ok: scores.some((score) => score != null), scores };
  } catch {
    return { ok: false, scores: empty };
  }
}
