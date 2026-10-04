# Seed receipts (demo fixtures)

Realistic fixture receipts for building and demoing the receipt → purchase-graph
pipeline without waiting on real email. The team should replace these with 2–3 real
forwarded receipts before the demo if possible — but these are enough to build against.

## Format

Each file is a plain-text email body: headers (`Subject:`, `From:`, `Date:`) followed by
line items. The parser should handle: retailer name, order/date, line items with
quantity × unit price, and totals.

## The story these tell (for the demo)

- **Paper towels appear twice** — Amazon ($24.99/12 rolls) and Costco ($21.99/12 rolls).
  The agent should flag: same item, cheaper at Costco, ~$3 every buy.
- **Diapers are weekly** — the dynamic-threshold example: small per-pack savings are
  worth acting on at weekly cadence.
- **Costco bulk vs Amazon single** — the landed-cost comparison across channels.

## Files

- `receipts/amazon-order-01.txt` — Amazon order confirmation (paper towels, dish soap, batteries)
- `receipts/grocery-weekly-01.txt` — weekly grocery run (milk, eggs, sourdough, diapers)
- `receipts/costco-bulk-01.txt` — Costco bulk run (toilet paper, paper towels)
