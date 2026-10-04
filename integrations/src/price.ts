/**
 * Pure money parsing and price extraction. No I/O, so the worker and the Kernel page scripts share one tested copy.
 */

/** "$1,234.56", "USD 12.30", "12.3" -> integer cents. Returns null when no amount is found. */
export function parseMoneyToCents(text: string | null | undefined): number | null {
  if (!text) return null;
  const m = text.replace(/\u00a0/g, " ").match(/(?:US\$|\$|USD\s*)?\s*(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/);
  if (!m) return null;
  const whole = Number(m[1]!.replace(/,/g, ""));
  const frac = m[2] ? Number(m[2].padEnd(2, "0")) : 0;
  if (!Number.isFinite(whole)) return null;
  return whole * 100 + frac;
}

export interface ExtractedPrice {
  priceCents: number | null;
  inStock: boolean;
  source: "json-ld" | "meta" | "text" | "none";
}

/**
 * Best-effort offer price from a product page's HTML. Prefers structured data (JSON-LD Offer, then
 * og/product meta tags) over the first dollar amount in the text.
 */
export function extractPriceFromHtml(html: string): ExtractedPrice {
  const outOfStock = /OutOfStock|out of stock|sold out|currently unavailable/i.test(html);

  for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    const found = findOfferPrice(safeJson(block[1]!));
    if (found) {
      return { priceCents: found.priceCents, inStock: found.inStock ?? !outOfStock, source: "json-ld" };
    }
  }

  const meta =
    html.match(/<meta[^>]+(?:property|itemprop|name)=["'](?:product:price:amount|og:price:amount|price)["'][^>]*content=["']([^"']+)["']/i) ??
    html.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|itemprop|name)=["'](?:product:price:amount|og:price:amount|price)["']/i);
  if (meta) {
    const cents = parseMoneyToCents(meta[1]);
    if (cents !== null) return { priceCents: cents, inStock: !outOfStock, source: "meta" };
  }

  const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ");
  const dollar = text.match(/\$\s?\d{1,3}(?:,\d{3})*(?:\.\d{2})?/);
  if (dollar) return { priceCents: parseMoneyToCents(dollar[0]), inStock: !outOfStock, source: "text" };

  return { priceCents: null, inStock: !outOfStock, source: "none" };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

function findOfferPrice(node: unknown, depth = 0): { priceCents: number; inStock?: boolean } | null {
  if (!node || typeof node !== "object" || depth > 6) return null;
  if (Array.isArray(node)) {
    for (const n of node) {
      const f = findOfferPrice(n, depth + 1);
      if (f) return f;
    }
    return null;
  }
  const o = node as Record<string, unknown>;
  const price = o.price ?? o.lowPrice;
  if (price !== undefined && (typeof price === "number" || typeof price === "string")) {
    const cents = typeof price === "number" ? Math.round(price * 100) : parseMoneyToCents(price);
    if (cents !== null) {
      const availability = typeof o.availability === "string" ? o.availability : undefined;
      return { priceCents: cents, inStock: availability ? !/OutOfStock|SoldOut|Discontinued/i.test(availability) : undefined };
    }
  }
  for (const key of ["offers", "@graph", "mainEntity"]) {
    const f = findOfferPrice(o[key], depth + 1);
    if (f) return f;
  }
  return null;
}
