/**
 * src/lib/ga4-purchase.cjs  (Cats On Crack)
 *
 * Server-side GA4 `purchase` via the Measurement Protocol, sent by the Stripe
 * webhook once the order has been handled. Only for shoppers who accepted
 * analytics: create-checkout stores their GA ids in the session metadata
 * (ga_client_id / ga_session_id) only when the browser had consent.
 *
 * Skips silently (resolves { sent: false, reason }) when:
 *   - GA4_MEASUREMENT_ID or GA4_API_SECRET is not set
 *   - the session is not livemode
 *   - there is no valid ga_client_id
 *   - the caller says this is a retry of an order already recorded
 * One overall time limit covers any Stripe line-item lookup and the GA call.
 * Never throws.
 *
 * Amounts: value = what Stripe charged minus shipping; shipping and tax in
 * their own fields; each item at the price actually charged per unit after
 * discounts, with the per-unit discount in `discount`.
 */

const MP_URL = 'https://www.google-analytics.com/mp/collect';
const DEFAULT_TIMEOUT_MS = 2500;

const CLIENT_ID = /^\d+\.\d+$/;
const SESSION_ID = /^\d{1,20}$/;

const money = (minor) => Math.round(Number(minor) || 0) / 100;

function productMeta(li) {
  const p = li && li.price && li.price.product;
  return p && typeof p === 'object' && p.metadata ? p.metadata : {};
}

/* One GA4 item per Stripe line item. Metadata is what create-checkout stamps:
   coc_slug / coc_type / coc_colour / coc_size for print-on-demand,
   wallart_slug / wallart_format / wallart_size for wall art. */
function toItem(li) {
  const m = productMeta(li);
  const quantity = li.quantity || 1;
  const inhouse = m.fulfilment === 'inhouse';
  const item = {
    item_id: (inhouse ? m.wallart_slug : m.coc_slug) || li.description || 'item',
    item_name: li.description || 'Cats On Crack item',
    price: money((li.amount_total || 0) / quantity),
    quantity,
  };
  const variant = inhouse
    ? [m.wallart_format, m.wallart_size].filter(Boolean).join(' / ')
    : [m.coc_colour, m.coc_size].filter(Boolean).join(' / ');
  if (variant) item.item_variant = variant;
  const category = inhouse ? 'wallart' : m.coc_type;
  if (category) item.item_category = category;
  if (li.amount_discount) item.discount = money(li.amount_discount / quantity);
  return item;
}

/** The Measurement Protocol body. Pure; exported for tests. */
function buildPurchasePayload(session, lineItems) {
  const meta = session.metadata || {};
  const totals = session.total_details || {};
  const shippingMinor = totals.amount_shipping != null
    ? totals.amount_shipping
    : (session.shipping_cost && session.shipping_cost.amount_total) || 0;

  const params = {
    transaction_id: session.id,
    value: money((session.amount_total || 0) - shippingMinor),
    currency: String(session.currency || 'gbp').toUpperCase(),
    shipping: money(shippingMinor),
    tax: money(totals.amount_tax || 0),
    items: ((lineItems && lineItems.data) || []).map(toItem),
    engagement_time_msec: 1,
  };
  if (SESSION_ID.test(String(meta.ga_session_id || ''))) params.session_id = String(meta.ga_session_id);

  return {
    client_id: String(meta.ga_client_id),
    consent: { ad_user_data: 'DENIED', ad_personalization: 'DENIED' },
    events: [{ name: 'purchase', params }],
  };
}

/** Why this session would be skipped, or null to send. */
function skipReason(session, env) {
  if (!env.GA4_MEASUREMENT_ID || !env.GA4_API_SECRET) return 'not-configured';
  if (!session || !session.livemode) return 'test-mode';
  const clientId = session.metadata && session.metadata.ga_client_id;
  if (!CLIENT_ID.test(String(clientId || ''))) return 'no-client-id';
  return null;
}

/**
 * Send the purchase. Resolves { sent, reason }; never rejects.
 * opts:
 *   lineItems        — Stripe list result ({ data: [...] }, price.product expanded)
 *   stripe           — Stripe client, used only if lineItems is empty
 *   alreadyRecorded  — true on a Stripe retry for an order already saved: skip
 *   env, fetch, timeoutMs — injectable for tests
 */
async function sendGa4Purchase(session, opts = {}) {
  const env = opts.env || process.env;
  const fetchImpl = opts.fetch || globalThis.fetch;
  const timeoutMs = opts.timeoutMs || DEFAULT_TIMEOUT_MS;
  const id = session && session.id;

  try {
    const reason = skipReason(session, env) || (opts.alreadyRecorded ? 'already-recorded' : null);
    if (reason) return { sent: false, reason };

    const controller = new AbortController();
    let timer;
    const limit = new Promise((resolve) => {
      timer = setTimeout(() => { controller.abort(); resolve({ sent: false, reason: 'timeout' }); }, timeoutMs);
    });

    const work = (async () => {
      let lineItems = opts.lineItems;
      if ((!lineItems || !lineItems.data || !lineItems.data.length) && opts.stripe) {
        lineItems = await opts.stripe.checkout.sessions.listLineItems(id, { limit: 100, expand: ['data.price.product'] });
      }
      const url = `${MP_URL}?measurement_id=${encodeURIComponent(env.GA4_MEASUREMENT_ID)}&api_secret=${encodeURIComponent(env.GA4_API_SECRET)}`;
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPurchasePayload(session, lineItems)),
        signal: controller.signal,
      });
      if (!res.ok) return { sent: false, reason: `http-${res.status}` };
      return { sent: true, reason: null };
    })().catch((err) => ({ sent: false, reason: `error: ${err && err.message ? err.message : err}` }));

    const result = await Promise.race([work, limit]);
    clearTimeout(timer);
    if (result.sent) console.log(`[GA4-OK] session ${id}: purchase sent.`);
    else console.warn(`[GA4-SKIP] session ${id}: ${result.reason}.`);
    return result;
  } catch (err) {
    console.warn(`[GA4-SKIP] session ${id}: ${err && err.message ? err.message : err}.`);
    return { sent: false, reason: 'error' };
  }
}

module.exports = { sendGa4Purchase, buildPurchasePayload, skipReason };
