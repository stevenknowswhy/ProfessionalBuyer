import { createHash } from "node:crypto";

/**
 * Server-side only (not exported from the package root, so web/ never bundles node:crypto).
 * The hash the user approved must equal the hash of the offer at execution time.
 */
export function offerHash(offer: { url: string; deliveredCents: number; normalizedUnits: number }): string {
  return createHash("sha256")
    .update(`${offer.url}|${offer.deliveredCents}|${offer.normalizedUnits}`)
    .digest("hex")
    .slice(0, 16);
}
