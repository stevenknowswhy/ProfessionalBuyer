"""Ready-made Laya question sets for the Personal Professional Buyer.

Design notes (from the Laya skill):
- Ask what the text SAYS, not what to do. Map answers to actions in code.
- Put numbers/comparisons into words in code first; never hand Laya raw numbers.
- Keep option lists short; every option gets a description.
"""

# 1) Receipt triage — runs on every inbound email before the LLM parser.
# Measured 2026-10-04 on fixtures (English checkpoint, zero-shot):
#   is_receipt: Amazon receipt 0.92 / non-receipt 0.00 ; retailer: amazon 0.97
TRIAGE_QUESTIONS = {
    "is_receipt": {
        "type": "noul",
        "instructions": "Was something bought, ordered, or shipped according to this text?",
    },
    "retailer": {
        "type": "choice",
        "instructions": "Which retailer issued this receipt?",
        "criteria": {
            "amazon": "Amazon.com order, shipment, or delivery emails",
            "grocery_delivery": "Instacart, grocery delivery, or supermarket receipts",
            "warehouse_club": "Costco, Sam's Club, or BJ's receipts",
            "other_retailer": "any other store or online retailer",
            "not_a_receipt": "this is not a receipt at all",
        },
    },
}

# 2) Buy guardrail — cheap first pass before proposing a purchase.
BUY_GUARD_QUESTIONS = {
    "listing_legit": {
        "type": "noul",
        "instructions": "Does this product listing look like a legitimate offer from a real seller (clear product, price, seller info) rather than spam or a scam?",
    },
    "matches_household": {
        "type": "noul",
        "instructions": "Does this product match what the household normally buys (same item type and plausible brand)?",
    },
}

# 3) Significance — is this saving worth interrupting the user?
# Call with state phrased in words, e.g.:
#   "The household buys diapers every week. This deal saves fifty cents per pack."
SIGNIFICANCE_QUESTIONS = {
    "worth_acting": {
        "type": "noul",
        "instructions": "Given the purchase frequency and the size of the saving described, is this worth acting on now?",
    },
}

# Suggested thresholds (tune on real data; see SKILL.md calibration notes):
#   is_receipt >= 0.80        -> parse as receipt; else ignore email
#   listing_legit >= 0.85      -> propose buy; else escalate to LLM review
#   worth_acting >= 0.70       -> notify user; else file silently / watch
