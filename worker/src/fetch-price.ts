import { extractPriceFromHtml, type ExtractedPrice } from "@buyer/integrations/price";

export interface PriceCheck extends ExtractedPrice {
  httpStatus: number | null;
  durationMs: number;
  error: string | null;
}

const UA = "Mozilla/5.0 (compatible; ProfessionalBuyerWorker/0.1; +https://github.com/stevenknowswhy/professionalbuyer)";

/** Plain fetch plus the shared extractor. Never throws: failures come back as `error` with a null price. */
export async function fetchOfferPrice(url: string, timeoutMs = 15_000): Promise<PriceCheck> {
  const started = Date.now();
  try {
    const res = await fetch(url, {
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const html = await res.text();
    const extracted: ExtractedPrice = res.ok ? extractPriceFromHtml(html) : { priceCents: null, inStock: false, source: "none" };
    return {
      ...extracted,
      httpStatus: res.status,
      durationMs: Date.now() - started,
      error: res.ok ? null : `HTTP ${res.status}`,
    };
  } catch (err) {
    return {
      priceCents: null,
      inStock: false,
      source: "none",
      httpStatus: null,
      durationMs: Date.now() - started,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
