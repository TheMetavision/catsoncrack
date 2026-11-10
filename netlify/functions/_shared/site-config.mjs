/**
 * Cats On Crack's non-secret settings for the shipping code, committed instead of
 * held as Netlify environment variables.
 *
 * WHY. Every variable scoped to Functions is copied into every function, and
 * AWS Lambda refuses a function whose environment is over 4 KB. A brand
 * address, a colour or a public URL costs the same bytes as a secret but
 * protects nothing, so new settings live here and only secrets go in Netlify.
 * (Comic Strip Canvas had a deploy fail on exactly this.)
 *
 * OVERRIDES. Each key is the name of an environment variable. If that variable
 * is set (non-empty) it still wins, so a value can be changed for one deploy
 * context without a commit. A few names (SITE_URL, LOGO_URL, BRAND_NAME,
 * BRAND_ACCENT, EMAIL_HEADER_BG, SANITY_PROJECT_ID, SANITY_DATASET) are
 * already set in Netlify with the same values; they keep working.
 *
 * NOTHING SECRET GOES IN THIS FILE. It is in the repository's history for
 * ever. Tokens, API keys and webhook secrets stay in Netlify.
 *
 * This is the ONLY brand-specific file in the shipping code: every other
 * netlify/functions/_shared/ shipping module is the same in The Fuglys,
 * Labrats, Cats On Crack and The Biker Babies.
 */

export const SITE_CONFIG = Object.freeze({
  SITE_URL: 'https://catsoncrack.co.uk',
  SITE_HOST: 'catsoncrack.co.uk',
  STUDIO_URL: 'https://catsoncrack.sanity.studio',

  SANITY_PROJECT_ID: '8ksun996',
  SANITY_DATASET: 'production',

  BRAND_NAME: 'Cats On Crack',
  // In email subjects: "Your Labrats wall art is on its way".
  BRAND_SHORT: 'Cats On Crack',

  // EVERY customer email sent through Resend (order confirmation, Printful's
  // "it's shipped", wall-art dispatch, returns, referral thank-you, contact-form
  // acknowledgement, newsletter confirmation and any other) comes from, and
  // takes replies at, the brand's own address. Nothing else may set a
  // customer sender: no hard-coded address, no other environment variable.
  EMAIL_FROM: 'Cats On Crack <meow@catsoncrack.co.uk>',
  EMAIL_REPLY_TO: 'meow@catsoncrack.co.uk',
  // The team's own emails (shipping-emails.mjs toTeam) keep the sender they
  // had before the customer emails moved to the brand address.
  TEAM_EMAIL_FROM: 'Cats On Crack <meow@catsoncrack.co.uk>',
  TEAM_EMAIL_REPLY_TO: 'contact@themetavision.co.uk',
  // Shipping, returns and alert emails to the team (NOTIFICATION_TO).
  TEAM_EMAIL: 'contact@themetavision.co.uk',
  // The address the policies and /returns tell customers to write to: the
  // brand inbox, the same address customer emails come from.
  CONTACT_EMAIL: 'meow@catsoncrack.co.uk',

  // The look of the customer emails: the "It's shipped" email's palette
  // (printful-webhook.mjs), so both read as one brand.
  LOGO_URL: 'https://catsoncrack.co.uk/coc-logo-purple.png',
  BRAND_ACCENT: '#FF00FF',
  EMAIL_HEADER_BG: '#270D2A',
  EMAIL_PAGE_BG: '#11131a',
  EMAIL_CARD_BG: '#181B22',
  EMAIL_HEADING: '#F0EDE8',
  EMAIL_TEXT: '#b8b5ad',
  EMAIL_MUTED: '#8a8880',
  EMAIL_RULE: '#2a2f3d',
  EMAIL_BUTTON_TEXT: '#ffffff',
  // The wall-art dispatch email's opening line, in the voice of the
  // "It's shipped" email ("Your gear's left the alley…").
  DISPATCH_LINE: "Your wall art's left the alley and is on its way",

  // The metavision-shipping service. Every call is HMAC-signed with
  // SHIPPING_SECRET, which stays in Netlify.
  SHIPPING_API_URL: 'https://mv-shipping-svc-26.netlify.app',
  SHIPPING_BRAND: 'COC',

  // Several posters travel rolled in one tube. The service declares the
  // band's weight (the largest poster's band), so each poster beyond the
  // first adds this many grams, sent to create-parcel as extraWeightG.
  // Measured as negligible, so 0 (the setting stays in case that changes).
  POSTER_EXTRA_WEIGHT_G: '0',

  // /returns covers wall art and, with this on, merchandise (Printful): change
  // of mind by prepaid label in the X1 (mailer) / X2 (bulky box) bands, and
  // faulty or damaged items as Printful claims with no label. On 2 Nov 2026
  // (feat/merch-returns). "false" puts merchandise back to "email us".
  RETURNS_CLOTHING: 'true',
  // Change of mind on merchandise: days after Printful's ship date (Printful
  // gives no delivery date). The brand's policy wording must match.
  RETURNS_MERCH_WINDOW_DAYS: '21',
  // Printful's own deadline for a reprint or refund claim: days after it
  // shipped. Shown on each claim in the Studio.
  PRINTFUL_CLAIM_DAYS: '30',

  // Where /returns sends people while it is switched off.
  RETURNS_POLICY_PATH: '/legal/returns-refunds/',

  // Where each carrier's returns are collected from. For the team's "ready to
  // collect" email only; never sent to a customer.
  RETURN_POINT_INPOST: 'InPost locker, 59 West Road, Shoeburyness',
  RETURN_POINT_EVRI: 'ASDA Shoebury, North Shoebury Road',
  RETURN_POINT_UPS: 'Skanda, 93-95 West Road, Shoeburyness',

  // ── Post-delivery sequence and referral programme (post-delivery.mjs,
  // referral.mjs). BRAND_KEY is the metadata.brand create-checkout stamps on
  // every session (the stripe-webhook brand guard); every referral code and
  // coupon carries it too. Coupons are created in Stripe on first use.
  BRAND_KEY: 'catsoncrack',
  REFERRAL_FRIEND_PREFIX: 'MEOW',
  REFERRAL_REWARD_PREFIX: 'COCTHX',
  REFERRAL_FRIEND_COUPON_ID: 'coc-referral-friend-10',
  REFERRAL_REWARD_COUPON_ID: 'coc-referral-reward-10',
  // MailerLite "COC - Customers" (existing group); its automation sends the
  // post-delivery emails. Only coc_-prefixed fields are written.
  MAILERLITE_CUSTOMERS_GROUP: 'COC - Customers',
  MAILERLITE_CUSTOMERS_GROUP_ID: '200065134059587076',
  MAILERLITE_FIELD_PREFIX: 'coc',

  // ── Dogcatcher Dash prize (netlify/lib/dd-prize.mjs). The prize is created in
  // Printful as a DRAFT; the team email links here to confirm it. If the
  // value contains {id} it is replaced with the Printful order id (set a
  // per-order link once its exact format has been checked in the dashboard).
  PRINTFUL_ORDERS_URL: 'https://www.printful.com/dashboard/default/orders',
});

/**
 * A setting: the environment variable of the same name if it is set, else the
 * committed value.
 *
 * @param {keyof typeof SITE_CONFIG} name
 * @param {Record<string, string|undefined>} [env] defaults to process.env; tests pass their own
 */
export function setting(name, env = process.env) {
  if (!(name in SITE_CONFIG)) throw new Error(`site-config: unknown setting ${name}`);
  const v = env?.[name];
  return typeof v === 'string' && v.trim() ? v.trim() : SITE_CONFIG[name];
}

/** A yes/no setting. */
export const flag = (name, env = process.env) => ['true', '1', 'yes'].includes(setting(name, env).toLowerCase());

/** A whole-number setting (grams and the like); `fallback` if it isn't one. */
export function intSetting(name, fallback = 0, env = process.env) {
  const n = Number(setting(name, env));
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

/**
 * The Sanity token for a function that WRITES, in the order stripe-webhook
 * and printful-webhook already read them.
 */
export function sanityWriteToken(env = process.env) {
  for (const name of ['SANITY_API_TOKEN', 'SANITY_TOKEN']) {
    const v = env?.[name];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return undefined;
}
