# Margin: design token plan

The product is a professional buyer for one household. The interface is a **concierge's private ledger**: calm, exact, a little formal. It borrows from the physical things a bookkeeper uses (green-grey ledger paper, iron-gall ink, a highlighter for "look at this") instead of from AI dashboards.

## Review against the brief and the generic defaults

| Generic default | What we do instead | Why |
|---|---|---|
| Warm cream paper (`#F4F1EA`) | Cool green-grey **ledger paper** (`#EBF5F4`) | Accounting pads are pale green with blue rules; it is the subject's own material |
| Terracotta / clay accent | **Banknote green** for savings, **highlighter yellow** for "needs your approval" | Green means money kept; a highlighter stroke is how a bookkeeper flags a line |
| Near-black `#111` text | **Iron-gall ink**, a deep blue-black (`#15223B`) | Fountain-pen ink on a ledger, readable at 14:1 |
| Serif from the usual list (Fraunces, Instrument Serif, Playfair) | **Bodoni Moda**, optical sizes 6 to 96 | Didone contrast is the banknote and engraved-statement letterform; the Number is set at opsz 96 |
| Inter / Geist UI sans | **Schibsted Grotesk** | A newsroom grotesk with true tabular figures; plain, slightly warm |
| Mono for small data labels | **Spline Sans Mono only for formulas and the offer hash** | Mono marks "this is a computation", nothing else |
| ALL-CAPS tracked eyebrows, `A · B · C` meta, `→` on buttons | Sentence case, plain sentences, verbs on buttons | Copy rules from the brief |
| Identical cards with one radius and grey shadow | Concentric radii by depth, hairline ring shadows | Hierarchy comes from depth, not decoration |

One bold move: **the Number**, a very large Bodoni figure. Everything else stays quiet.

## Color (OKLCH, one light mode)

Two neutrals (paper, ink) and two accents (green, highlighter). Carmine exists only for errors and blocked states.

| Token | OKLCH | Hex (approx) | Role |
|---|---|---|---|
| `--paper` | `0.962 0.011 192` | `#EBF5F4` | Page background, ledger paper |
| `--paper-raised` | `0.985 0.006 192` | `#F6FBFB` | Cards and panels that sit on the paper |
| `--paper-sunk` | `0.935 0.014 195` | `#DFEDEC` | Wells, table headers, skeletons |
| `--rule` | `0.86 0.025 215` | `#BFD6DB` | Ledger-blue hairlines and dividers |
| `--ink` | `0.255 0.05 262` | `#15223B` | Text, primary buttons |
| `--ink-soft` | `0.46 0.035 258` | `#4C596C` | Secondary text (AA on paper) |
| `--ink-faint` | `0.60 0.025 245` | `#74828F` | Tertiary text, never for essential content |
| `--margin` | `0.50 0.115 160` | `#00774C` | Savings, best offer, success |
| `--margin-wash` | `0.94 0.035 165` | `#D7F3E5` | Background behind savings highlights |
| `--flag` | `0.92 0.16 108` | `#EFEC5F` | Highlighter fill: "needs your approval" |
| `--flag-ink` | `0.42 0.09 95` | `#5D4C00` | Text and borders on or near the highlighter |
| `--carmine` | `0.52 0.17 25` | `#B63132` | Errors, blocked approvals only |

shadcn semantic variables map onto these (`--background` is paper, `--foreground` is ink, `--card` is paper-raised, `--muted` is paper-sunk, `--border` is a softened rule, `--destructive` is carmine), so library components inherit the palette.

## Type roles

| Role | Face | Size / line | Notes |
|---|---|---|---|
| `number` | Bodoni Moda 500, opsz 96 | `clamp(5rem, 11vw, 10rem)` / 0.9 | The Number only. Tabular figures |
| `display` | Bodoni Moda 500, opsz 48 | 2.5rem / 1.05 | Page and takeover headlines, `text-wrap: balance` |
| `heading` | Bodoni Moda 500, opsz 24 | 1.5rem / 1.15 | Zone titles, card titles |
| `title` | Schibsted Grotesk 600 | 0.9375rem / 1.35 | Row titles, button labels |
| `body` | Schibsted Grotesk 400 | 0.9375rem / 1.5 | Conversation and prose |
| `small` | Schibsted Grotesk 450 | 0.8125rem / 1.4 | Secondary lines |
| `micro` | Schibsted Grotesk 550 | 0.75rem / 1.3 | Badges, sentence case |
| `formula` | Spline Sans Mono 400 | 0.78rem / 1.5 | Formulas, offer hash |

Every money value uses `tabular-nums` (`.money`). Dollar figures come only from contract values through `formatUsd`.

## Space, radii, depth

- 4px grid. Zone gutter 24px, card padding 16px, row padding 10px 12px.
- Concentric radii, outer = inner + inset: `--r-chip 6px` (rows, chips, inputs), `--r-card 12px` (cards, chips at 6px inset), `--r-panel 20px` (zone panels holding cards at 8px inset). Badges are full pills.
- Shadows are borders: `--shadow-ring` is a 1px ink ring at 8% plus a 1px soft drop; `--shadow-lift` adds a long, low blur for the approval card and takeovers only.
- Hit areas at least 40px; focus ring is a 2px ink ring with a 2px paper offset.

## Motion

- Easing: `--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` for enters and presses; `--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1)` for on-screen moves. No ease-in.
- Durations: 150ms (press, color), 200ms (enter), 250ms (drawers, cards). Stagger 40ms. Layout moves use a spring (`duration 0.45, bounce 0.12`).
- Buttons scale to 0.97 on press. Enters start at `opacity 0, translateY(4px)`, never `scale(0)`.
- The Number's 1.2s digit roll is the single orchestrated moment.
- Skeletons, not spinners. `prefers-reduced-motion`: drop all movement, keep opacity.

## Layout at 1440 and 1920

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Margin            Demo household   Sample data                 Review mode  │ 56px
├──────────────┬────────────────────────────────────────┬──────────────────────┤
│ Household    │ Concierge                              │ Needs your approval  │
│ ledger       │                                        │ ┌──────────────────┐ │
│              │  You    Scan my receipts               │ │ Costco  [amount] │ │
│ Paper towels │                                        │ └──────────────────┘ │
│  4 buys, 48d │  Buyer  Read 14 receipts...            │ Activity             │
│ Toilet paper │  ┌──────────────────────────────────┐  │  neon  Wrote 3 ...   │
│ Diapers      │  │ [the Number] a year   (savings)  │  │  exa   Searched ...  │
│ ...          │  └──────────────────────────────────┘  │ Watching             │
│ AA batteries │  ┌ price comparison ────────────────┐  │  Paper towels ╱╲__   │
│  not enough  │  └──────────────────────────────────┘  │                      │
│  history     │ [ Ask your buyer...            Send ]  │                      │
│  320px       │  fluid, content max 720px              │  400px               │
└──────────────┴────────────────────────────────────────┴──────────────────────┘
```

Content is left-aligned throughout; numbers in tables are right-aligned. The center column keeps a 720px measure so conversation lines stay under 80 characters.
