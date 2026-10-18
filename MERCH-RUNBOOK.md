# Cats On Crack: merch run-book

What was changed in the shop, why, and how to repeat or undo it. Newest work at the bottom of each section.
Tooling lives in `C:\Users\chris\Projects\printful-sync` (its own git repo); the site's code is on branches here.

## Stores and IDs

| | |
|---|---|
| Printful store | `PRINTFUL_STORE_COC` (store-scoped token `PRINTFUL_TOKEN_COC` in printful-sync `.env`; `PRINTFUL_API_KEY` on Netlify) |
| Sanity | project `8ksun996`, dataset `production` |
| Netlify site | `catsoncrack`, id `6e8ee45e-46e8-4928-a157-07fccf0294e3` |
| Stripe | shared with Labrats, The Fuglys and The Biker Babies (one account); sessions carry `metadata.brand = catsoncrack` |

---

## Part A: margin audit (18 Oct 2026)

**Finding.** Every drinkware product lost money on GB orders. Live Printful quotes (`POST /orders/estimate-costs`, single item),
our VAT on GB sales, Stripe 1.5% + 20p, the delivery charge collected:

| Product | Printful # | Stocked | Retail | GB landed | GB profit |
|---|---|---|---|---|---|
| 20oz Tumbler | 909 | US only | £22.50 | £36.41 | −£6.44 (−26%) |
| 16oz Can Glass | 690 | US only | £11.50 | £24.17 | −£5.24 (−34%) |
| Can Glass lid & straw | 690 | US only | £12.50 | £25.07 | −£5.17 (−32%) |
| Pin badge set (5) | 660 | US only | £9.95 | £18.41 | −£1.71 (−12%) |

Everything else makes 28–58% on a GB order. No customer had bought drinkware or pins, so actual losses were £0.

**Decisions (Alan, 18 Oct 2026):** tumbler moves to #585 (EU-stocked) at £32.95, white and black; can glass dropped;
11oz mug #19 (UK/EU) added at £12.95 with the design on both sides; pin badge sets dropped; delivery tied to destination.

### A1. The two "fulfilment-failed" records (GTVEMJDF, EB21KP20)

Neither was a Cats On Crack order. Before the brand guard (21 Jul 2026), every brand's `stripe-webhook` processed every
session on the shared Stripe account.

- **GTVEMJDF (6 Jul):** a Fuglys order (Scabby Road poster + Fuglys Sticker Set 2). The Fuglys webhook fulfilled it
  correctly (Printful #165858044 in the Fuglys store); this site's webhook tried the Fuglys variants in this store and failed.
- **EB21KP20 (19 Jul):** almost certainly a Biker Babies order (BB was the only other brand with a Sticker Set 3). BB's
  repo then had a stale `stripe-webhook.mjs` beside the real one, which reads basket data the checkout no longer sends,
  so it found "no items". COC and Fuglys tried it and failed. An internal test order: nothing owed.
- Both records are kept and **relabelled** (18 Oct): `status: other-brand`, the explanation in `failureReason`.
- Fixed already on 21 Jul (brand guard + single webhook file). Added now, as a second lock: see "Own-store check" below.

### Own-store check in the webhook (branch `feat/margin-delivery`)

Before placing a Printful order, `stripe-webhook.cjs` asks `GET /store/variants/{id}` for every line with the store-scoped
`PRINTFUL_API_KEY`: 200 only for this store's variants, 404 for another store's (checked live, 18 Oct). If any line isn't
ours, or the check fails, **nothing is ordered**: the merchant alert says NOT OUR VARIANT with the ids, and the order log
gets `status: fulfilment-failed` and the reason in `failureReason`. Stripe test-mode sessions get `test: true` and a
`[TEST]` alert. Tests: `tests/own-store-check.test.mjs`.

### A2. Delivery tied to the destination (branch `feat/margin-delivery`)

Before: all five delivery rates were offered to every buyer, so an overseas buyer could pick UK Standard (£6.95).

- `src/lib/shipping-regions.mjs`: regions and rates (unchanged: UK £6.95, free from £75; Europe £9.95; USA/Canada £10.95;
  Australia/NZ/Japan/Brazil £11.95; Rest of World £14.95) and the same 76 countries. Keep it identical in all four IP sites.
- Cart drawer: "Delivering to" country picker (remembered on the device, guessed from the browser language), the
  delivery line and total for that country, the free-UK bar only for GB, and a warning for lines Printful won't ship there.
- `create-checkout.cjs`: requires the country; refuses unknown ones (400) and lines Printful won't ship there (422);
  Stripe gets `allowed_countries: [country]` and only that region's rate; `metadata.delivery_country`.
- `src/data/ship-to.json`: countries refused per productType, generated from Printful's own answers. Regenerate after any
  range change:
  ```powershell
  cd C:\Users\chris\Projects\printful-sync
  node --env-file=.env probe-ship-to.mjs catsoncrack labrats thefuglys bikerbabies --extra=585,19   # ~25 min, quotes only
  node export-ship-to.mjs catsoncrack C:\Users\chris\Projects\catsoncrack\src\data\ship-to.json
  ```
- What the probe found (18 Oct): **Brazil** fails for every Printful product (Printful needs the recipient's CPF/CNPJ and
  the checkout doesn't collect it), so Printful lines are refused for BR; wall art (in-house) still ships there.
  **Ukraine** is refused for adult apparel. The old #909 tumbler was refused in 15 countries; #585 and the mug ship to all
  but Brazil.
- Tests: `tests/delivery-destination.test.mjs`.

### Previews: test payments and draft catalogue

- **Stripe TEST values** in `deploy-preview` and `branch-deploy` only, so preview checkouts are test payments. Production
  keeps the live values. Set with `scripts\set-stripe-test.ps1` (refuses anything but `rk_test_`/`sk_test_` and
  `whsec_`, delete-then-recreate as secrets, stops if production's value ids change). Needs a TEST-mode webhook endpoint
  in Stripe for the preview URL, event `checkout.session.completed`.
  Production value ids before (18 Oct): `STRIPE_SECRET_KEY` `a78fdea6`, `STRIPE_WEBHOOK_SECRET` `84b3ed48`.
- **Draft catalogue on previews:** `SANITY_PERSPECTIVE=previewDrafts` is set in `deploy-preview` and `branch-deploy` only
  (18 Oct), so a preview build and its checkout read Sanity drafts; production reads published.

### A3. Pin badge sets (#660)

Printful has no UK/EU badge blank (#660 is its only one, US-stocked). 30% on GB would need £20.50 for a set of five, against
£5–£10 in the market. Dropped. Sanity: `product-badge-set-1` … `-4`; Printful: 441991684, 441991714, 441991759, 441991789.

---

## Part B: drinkware (Cats On Crack first)

Config: `printful-sync/brands/catsoncrack.config.mjs`.

| Garment | Blank | Price | Notes |
|---|---|---|---|
| `tumbler` | #585 Stainless Steel Tumbler 20 oz, White + Black (EU) | £32.95 | `externalKey: tumbler585` (new products sit beside #909's until those go). Printed on both sides, as Dotty's: the design twice, at ¼ and ¾ of the 2776×2374 wrap, each in a 1250×1450 box (`make-mug-wraps.mjs --kind=tumbler` → `designs.tumblerPrintFileUrl`); images: Left, "Printed on both sides", Right |
| `mug` | #19 White Glossy Mug 11 oz (UK + EU) | £12.95 | design twice, at ¼ and ¾ of the 2700×1050 wrap (`make-mug-wraps.mjs` → `designs.mugPrintFileUrl`); images: Front, "Printed on both sides", Handle on Left |
| `glass` | #690 | — | removed from the config |

Steps done (18 Oct 2026):

1. Mockup check before creating anything (`mockup-check.mjs`, Mockup Generator, no products): #585 white and black, and the
   mug from both sides, on Curiosity Killed The Snitch. The first tumbler size (1877 px) cropped the title at the edges; 1450 px
   matches #909. Images: `printful-sync/mockup-checks/`.
2. Mug wraps for all 46 designs uploaded to the Sanity CDN (`make-mug-wraps.mjs catsoncrack`).
3. Printful products created in batches of 6 (`run-batches.ps1 -Stage printful -Flags "--types=tumbler,mug"`): 92 products,
   one #585 tumbler (2 variants) and one mug per design. Store checked: no duplicates.
4. The manifest held only one design; all 46 were read back from Printful with `adopt` (creates nothing).

5. Mockups for the new garments only (`run-batches.ps1 -Stage mockups -Flags "--types=tumbler,mug --strict"`): every
   tumbler has rendered White and Black images (Printful's store previews); every mug has Front, "Printed on both sides"
   and Handle on Left (Mockup Generator, re-hosted on the Sanity CDN). Wide designs (e.g. Tiny Terror) lose the ends of the
   title round the side on the store's angled preview, as they already did on #909.
6. Sanity **drafts** (`run-batches.ps1 -Stage sync -Flags "--types=tumbler,mug --drop-types=glass"`): on all 46 designs the
   tumbler is replaced by #585 (£32.95, White/Black), the mug added (£12.95), the can glass removed; every other garment,
   all copy and images exactly as published. Pin sets: drafts with `active: false` (`draft-inactive.mjs`).
   Checked with `verify-drafts.mjs catsoncrack tumbler,mug glass`: 50 drafts, nothing else changed, every variant id in the
   live store. Production still shows the published (old) catalogue; the deploy preview reads the drafts.

### Launch order, after Alan approves the preview (in this order, nothing earlier)

1. **Merge the PR** (`feat/margin-delivery`, Alan). Netlify rebuilds production from `main`: the new code against the old,
   published catalogue. It handles both: can glasses and badges still list and check out until their products go (tabs
   kept, empty tabs vanish; test "old and new catalogue both check out"), and a basket with no country set just shows the
   picker.
2. **Deploy the Studio schema** from `sanity/`: `npx sanity schema deploy` and `npx sanity deploy` (`other-brand` status,
   `test` flag).
3. **Publish the drafts**: `cd C:\Users\chris\Projects\printful-sync`, `node --env-file=.env publish-drafts.mjs catsoncrack --dry`,
   then without `--dry` (46 designs + 4 inactive pin sets). Production then needs a rebuild to show them (Netlify:
   trigger deploy, or the next push to `main`).
4. **Check the live site**: a tumbler and a mug page (both-sides images), the basket country picker, a GB basket reaching
   Stripe with one rate and one country, merch tabs without Can Glasses or Badges.
5. **Only then delete the old products**, after `pins-report.mjs catsoncrack` shows no unfinished Printful orders: the 46
   #909 tumblers (`catsoncrack-<slug>-tumbler`), the 46 #690 can glasses (`-glass`) and the 4 pin sets (441991684,
   441991714, 441991759, 441991789). The 4 `product-badge-set-*` docs stay in Sanity, inactive.
6. `store-check.mjs catsoncrack tumbler585,mug,tumbler,glass,pin` should then show 0 for tumbler, glass and pin.
7. Production env: `PRINTFUL_AUTO_CONFIRM=true` (production context only) makes live orders confirmed; without it they are
   Printful drafts to confirm by hand. Previews never confirm (test-mode payments are always drafts).

### After every preview test payment

Test-mode orders reach Printful as **drafts** (never confirmed) and the Sanity log as `test: true`. Delete them after each test:
`cd C:\Users\chris\Projects\printful-sync`, `node --env-file=.env delete-test-orders.mjs catsoncrack` (lists them), then
`... --apply` (deletes the Printful drafts and the test log records).
