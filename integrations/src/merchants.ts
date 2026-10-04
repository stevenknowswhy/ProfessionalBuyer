/**
 * Merchant adapters: the page scripts Kernel runs for guest checkout. Each script is Playwright code executed
 * server-side by `kernel.browsers.playwright.execute` (it has `page` in scope and must `return` a JSON value).
 * The generic adapter is best-effort; the demo merchant chosen in I2 gets its own adapter with exact selectors.
 */

export interface PaymentFieldBinding {
  /** Field name from the Kernel Vault card item schema, never a value. */
  field: string;
  selector: string;
}

export interface MerchantAdapter {
  id: string;
  matches(url: URL): boolean;
  /** Navigates from the product URL to the order-review page. Returns `{ reachedReview, pageUrl, note }`. */
  toReviewScript(productUrl: string): string;
  /** Selectors for KERNEL fill on the payment step. Empty means the merchant needs no card before review. */
  paymentFields: PaymentFieldBinding[];
  /** Returns `{ totalText }` read from the order-review page. */
  readTotalScript: string;
  /** Clicks the final place-order button. Returns `{ orderRef }`. Only run after the total check passes. */
  placeOrderScript: string;
}

const js = (s: string) => JSON.stringify(s);

export const genericAdapter: MerchantAdapter = {
  id: "generic",
  matches: () => true,
  toReviewScript: (productUrl) => `
    await page.goto(${js(productUrl)}, { waitUntil: "domcontentloaded", timeout: 45000 });
    const clickFirst = async (patterns) => {
      for (const p of patterns) {
        const el = page.getByRole("button", { name: p }).first();
        if (await el.count()) { await el.click({ timeout: 8000 }).catch(() => {}); return true; }
        const link = page.getByRole("link", { name: p }).first();
        if (await link.count()) { await link.click({ timeout: 8000 }).catch(() => {}); return true; }
      }
      return false;
    };
    const added = await clickFirst([/add to cart/i, /add to bag/i, /add to basket/i]);
    await page.waitForTimeout(2500);
    await clickFirst([/view cart/i, /go to cart/i, /^cart$/i]);
    await page.waitForTimeout(1500);
    await clickFirst([/checkout/i, /check out/i]);
    await page.waitForTimeout(2500);
    await clickFirst([/guest/i, /continue as guest/i]);
    await page.waitForTimeout(2000);
    const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 4000);
    const reachedReview = /review (your )?order|order summary|place order|complete order/i.test(body);
    return { reachedReview, pageUrl: page.url(), note: added ? "added to cart" : "no add-to-cart button found" };
  `,
  paymentFields: [],
  readTotalScript: `
    const candidates = page.locator("text=/(order total|grand total|^total)/i");
    const n = Math.min(await candidates.count(), 5);
    for (let i = 0; i < n; i++) {
      const row = candidates.nth(i).locator("xpath=ancestor-or-self::*[contains(., '$')][1]");
      const t = await row.innerText().catch(() => "");
      const m = t.match(/\\$\\s?\\d{1,3}(?:,\\d{3})*(?:\\.\\d{2})?/g);
      if (m && m.length) return { totalText: m[m.length - 1] };
    }
    return { totalText: null };
  `,
  placeOrderScript: `
    const btn = page.getByRole("button", { name: /place (your )?order|complete (your )?order|pay now/i }).first();
    if (!(await btn.count())) return { orderRef: null, error: "place-order button not found" };
    await btn.click({ timeout: 10000 });
    await page.waitForTimeout(6000);
    const body = (await page.locator("body").innerText().catch(() => "")).slice(0, 6000);
    const m = body.match(/order\\s*(?:number|#|no\\.?)\\s*[:#]?\\s*([A-Z0-9-]{5,})/i);
    return { orderRef: m ? m[1] : null };
  `,
};

const adapters: MerchantAdapter[] = [];

export function adapterFor(url: string): MerchantAdapter {
  const u = new URL(url);
  return adapters.find((a) => a.matches(u)) ?? genericAdapter;
}

/** Read-only page scan for verifyOffer: title plus the structured bits the price extractor understands. */
export function verifyScript(url: string): string {
  return `
    await page.goto(${js(url)}, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);
    const title = await page.title();
    const ld = await page.$$eval('script[type="application/ld+json"]', (els) => els.map((e) => e.textContent || ""));
    const metas = await page.$$eval("meta", (els) => els
      .filter((e) => /price/i.test(e.getAttribute("property") || e.getAttribute("itemprop") || e.getAttribute("name") || ""))
      .map((e) => e.outerHTML));
    const text = (await page.locator("body").innerText().catch(() => "")).slice(0, 20000);
    const html = ld.map((s) => '<script type="application/ld+json">' + s + "</script>").join("") + metas.join("") + "<body>" + text + "</body>";
    return { title, url: page.url(), html };
  `;
}
