// Tests for the server-side GA4 purchase (src/lib/ga4-purchase.cjs) and its
// use in the Stripe webhook (netlify/functions/stripe-webhook.cjs), including
// the brand guard for the shared Stripe account.
//
// fetch and Stripe are stubbed, so nothing leaves the machine.
//
//   npm test
import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { sendGa4Purchase, buildPurchasePayload } = require('../src/lib/ga4-purchase.cjs');

const ENV = { GA4_MEASUREMENT_ID: 'G-TEST123', GA4_API_SECRET: 'secret' };
const quiet = () => {};
console.log = quiet; console.warn = quiet; console.error = quiet;

// Shaped like a Stripe Checkout Session: £25 tee x2 with £5 off the line,
// £30 canvas, £6.95 shipping, no tax.
const session = (over = {}, meta = {}) => ({
  id: 'cs_live_abc123',
  livemode: true,
  currency: 'gbp',
  amount_total: 4500 + 3000 + 695,
  total_details: { amount_shipping: 695, amount_tax: 0, amount_discount: 500 },
  metadata: { brand: 'catsoncrack', ga_client_id: '123456789.987654321', ga_session_id: '1727000000', ...meta },
  ...over,
});
const LINE_ITEMS = {
  data: [
    { description: 'Actually Everyone Move T-Shirt — Black (M)', quantity: 2, amount_total: 4500, amount_discount: 500,
      price: { product: { metadata: { printful_variant_id: '101', coc_slug: 'actually-everyone-move', coc_type: 'tshirt', coc_colour: 'Black', coc_size: 'M' } } } },
    { description: 'Actually Everyone Move — Canvas', quantity: 1, amount_total: 3000, amount_discount: 0,
      price: { product: { metadata: { fulfilment: 'inhouse', wallart_slug: 'actually-everyone-move', wallart_format: 'canvas-standard', wallart_size: 'medium' } } } },
  ],
};

let calls;
const okFetch = async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return { ok: true, status: 204 }; };
beforeEach(() => { calls = []; });

/* ── Skips ─────────────────────────────────────────────────────────────── */

test('skips without GA4_MEASUREMENT_ID or GA4_API_SECRET', async () => {
  for (const env of [{}, { GA4_MEASUREMENT_ID: 'G-X' }, { GA4_API_SECRET: 's' }]) {
    const r = await sendGa4Purchase(session(), { env, fetch: okFetch, lineItems: LINE_ITEMS });
    assert.deepEqual(r, { sent: false, reason: 'not-configured' });
  }
  assert.equal(calls.length, 0);
});

test('skips without a valid ga_client_id', async () => {
  for (const ga_client_id of [undefined, '', 'abc', '123', '1.2.3', 'GA1.1.123.456']) {
    const r = await sendGa4Purchase(session({}, { ga_client_id }), { env: ENV, fetch: okFetch, lineItems: LINE_ITEMS });
    assert.equal(r.reason, 'no-client-id', String(ga_client_id));
  }
  assert.equal(calls.length, 0);
});

test('skips test-mode sessions', async () => {
  const r = await sendGa4Purchase(session({ livemode: false }), { env: ENV, fetch: okFetch, lineItems: LINE_ITEMS });
  assert.deepEqual(r, { sent: false, reason: 'test-mode' });
  assert.equal(calls.length, 0);
});

test('skips a Stripe retry of an order already recorded', async () => {
  const r = await sendGa4Purchase(session(), { env: ENV, fetch: okFetch, lineItems: LINE_ITEMS, alreadyRecorded: true });
  assert.deepEqual(r, { sent: false, reason: 'already-recorded' });
  assert.equal(calls.length, 0);
});

/* ── Never throws ──────────────────────────────────────────────────────── */

test('never throws: fetch rejects, bad input, non-2xx', async () => {
  const boom = async () => { throw new Error('network down'); };
  assert.equal((await sendGa4Purchase(session(), { env: ENV, fetch: boom, lineItems: LINE_ITEMS })).sent, false);
  assert.equal((await sendGa4Purchase(null, { env: ENV, fetch: okFetch })).sent, false);
  assert.equal((await sendGa4Purchase(undefined, { env: ENV, fetch: okFetch })).sent, false);
  assert.equal((await sendGa4Purchase(session(), { env: ENV, fetch: okFetch, lineItems: { data: [null] } })).sent, false);
  const r = await sendGa4Purchase(session(), { env: ENV, fetch: async () => ({ ok: false, status: 500 }), lineItems: LINE_ITEMS });
  assert.deepEqual(r, { sent: false, reason: 'http-500' });
});

test('one overall time limit: a hanging GA call or Stripe lookup resolves on time', async () => {
  const hang = (url, init) => new Promise((_, reject) => init.signal.addEventListener('abort', () => reject(new Error('aborted'))));
  let t = Date.now();
  let r = await sendGa4Purchase(session(), { env: ENV, fetch: hang, lineItems: LINE_ITEMS, timeoutMs: 100 });
  assert.deepEqual(r, { sent: false, reason: 'timeout' });
  assert.ok(Date.now() - t < 1000);

  const slowStripe = { checkout: { sessions: { listLineItems: () => new Promise(() => {}) } } };
  t = Date.now();
  r = await sendGa4Purchase(session(), { env: ENV, fetch: okFetch, stripe: slowStripe, timeoutMs: 100 });
  assert.deepEqual(r, { sent: false, reason: 'timeout' });
  assert.ok(Date.now() - t < 1000);
  assert.equal(calls.length, 0);
});

/* ── Payload ───────────────────────────────────────────────────────────── */

test('sends one purchase to the Measurement Protocol', async () => {
  const r = await sendGa4Purchase(session(), { env: ENV, fetch: okFetch, lineItems: LINE_ITEMS });
  assert.deepEqual(r, { sent: true, reason: null });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://www.google-analytics.com/mp/collect?measurement_id=G-TEST123&api_secret=secret');
  const body = calls[0].body;
  assert.equal(body.client_id, '123456789.987654321');
  assert.deepEqual(body.consent, { ad_user_data: 'DENIED', ad_personalization: 'DENIED' });
  assert.equal(body.events.length, 1);
  assert.equal(body.events[0].name, 'purchase');
  assert.equal(body.events[0].params.transaction_id, 'cs_live_abc123');
  assert.equal(body.events[0].params.engagement_time_msec, 1);
});

test('value is what Stripe charged excluding shipping; shipping and tax separate', () => {
  const p = buildPurchasePayload(session(), LINE_ITEMS).events[0].params;
  assert.equal(p.value, 75); // 81.95 charged - 6.95 shipping
  assert.equal(p.shipping, 6.95);
  assert.equal(p.tax, 0);
  assert.equal(p.currency, 'GBP');

  const taxed = session({ amount_total: 9195, total_details: { amount_shipping: 695, amount_tax: 1250 } });
  const t = buildPurchasePayload(taxed, LINE_ITEMS).events[0].params;
  assert.equal(t.value, 85);
  assert.equal(t.tax, 12.5);

  // Older sessions without total_details fall back to shipping_cost.
  const legacy = session({ total_details: undefined, shipping_cost: { amount_total: 695 } });
  assert.equal(buildPurchasePayload(legacy, LINE_ITEMS).events[0].params.value, 75);
});

test('items at the price actually charged, with each unit\'s discount', () => {
  const [tee, canvas] = buildPurchasePayload(session(), LINE_ITEMS).events[0].params.items;
  assert.deepEqual(tee, {
    item_id: 'actually-everyone-move', item_name: 'Actually Everyone Move T-Shirt — Black (M)',
    price: 22.5, quantity: 2, item_variant: 'Black / M', item_category: 'tshirt', discount: 2.5,
  });
  assert.deepEqual(canvas, {
    item_id: 'actually-everyone-move', item_name: 'Actually Everyone Move — Canvas',
    price: 30, quantity: 1, item_variant: 'canvas-standard / medium', item_category: 'wallart',
  });
});

test('session_id included only when valid', () => {
  const params = (ga_session_id) => buildPurchasePayload(session({}, { ga_session_id }), LINE_ITEMS).events[0].params;
  assert.equal(params('1727000000').session_id, '1727000000');
  for (const bad of [undefined, '', 'abc', '12.5', '123456789012345678901', '-1']) {
    assert.equal('session_id' in params(bad), false, String(bad));
  }
});

test('lists the line items from Stripe when none were passed', async () => {
  let asked = null;
  const stripe = { checkout: { sessions: { listLineItems: async (id) => { asked = id; return LINE_ITEMS; } } } };
  const r = await sendGa4Purchase(session(), { env: ENV, fetch: okFetch, stripe, lineItems: { data: [] } });
  assert.equal(r.sent, true);
  assert.equal(asked, 'cs_live_abc123');
  assert.equal(calls[0].body.events[0].params.items.length, 2);
});

/* ── Webhook: brand guard, ordering, idempotency ───────────────────────── */

process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
let listed;
require.cache[require.resolve('stripe')] = {
  exports: () => ({
    webhooks: { constructEvent: (body) => JSON.parse(body) },
    checkout: { sessions: { listLineItems: async () => { listed++; return LINE_ITEMS; } } },
  }),
};
const webhook = require('../netlify/functions/stripe-webhook.cjs');

function deliver(sess) {
  return webhook.handler({
    httpMethod: 'POST',
    headers: { 'stripe-signature': 't=1,v1=x' },
    body: JSON.stringify({ type: 'checkout.session.completed', data: { object: sess } }),
  });
}
function withEnv(vars, fn) {
  const saved = {};
  for (const k of Object.keys(vars)) { saved[k] = process.env[k]; if (vars[k] == null) delete process.env[k]; else process.env[k] = vars[k]; }
  return fn().finally(() => { for (const k of Object.keys(saved)) { if (saved[k] == null) delete process.env[k]; else process.env[k] = saved[k]; } });
}
const NO_SIDE_EFFECTS = { RESEND_API_KEY: null, PRINTFUL_API_KEY: null, SANITY_TOKEN: null, ...ENV };

test('brand guard: other brands\' sessions get 200 and nothing else happens', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url }); return { ok: true, status: 200, json: async () => ({}), text: async () => '' }; };
  listed = 0;
  try {
    await withEnv({ ...NO_SIDE_EFFECTS, RESEND_API_KEY: 're_x', PRINTFUL_API_KEY: 'pf_x', SANITY_TOKEN: 'sk_x' }, async () => {
      for (const meta of [{ brand: 'fuglys' }, { brand: 'labrats' }, { brand: 'bikerbabies', source: 'bikerbabies-web' }, {}]) {
        const res = await deliver(session({}, { brand: undefined, ...meta }));
        assert.equal(res.statusCode, 200);
        assert.equal(JSON.parse(res.body).skipped, 'other-brand');
      }
    });
  } finally { globalThis.fetch = realFetch; }
  assert.equal(listed, 0);
  assert.equal(calls.length, 0);
  assert.equal(webhook.isCatsOnCrackSession({ metadata: { brand: 'catsoncrack' } }), true);
  assert.equal(webhook.isCatsOnCrackSession({ metadata: { source: 'catsoncrack-web' } }), true);
  assert.equal(webhook.isCatsOnCrackSession({ metadata: { brand: 'fuglys' } }), false);
  assert.equal(webhook.isCatsOnCrackSession({}), false);
});

test('webhook sends the GA4 purchase for a Cats On Crack order and still returns 200', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => { calls.push({ url: String(url), body: init && init.body }); return { ok: true, status: 204, json: async () => ({}), text: async () => '' }; };
  listed = 0;
  try {
    await withEnv(NO_SIDE_EFFECTS, async () => {
      const res = await deliver(session());
      assert.equal(res.statusCode, 200);
    });
  } finally { globalThis.fetch = realFetch; }
  assert.equal(listed, 1); // the webhook's own lookup; the GA helper reuses it
  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /^https:\/\/www\.google-analytics\.com\/mp\/collect/);
});

test('webhook: a Stripe retry for an order already in the Sanity log does not resend', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    url = String(url); calls.push({ url });
    const body = url.includes('/data/query/') ? { result: 1 } : {};
    return { ok: true, status: 200, json: async () => body, text: async () => '' };
  };
  try {
    await withEnv({ ...NO_SIDE_EFFECTS, SANITY_TOKEN: 'sk_x' }, async () => {
      const res = await deliver(session());
      assert.equal(res.statusCode, 200);
    });
  } finally { globalThis.fetch = realFetch; }
  assert.ok(calls.some((c) => c.url.includes('/data/mutate/')), 'order log still written');
  assert.equal(calls.filter((c) => c.url.includes('google-analytics.com')).length, 0);
});

test('webhook: GA failure never fails the response', async () => {
  const realFetch = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('GA down'); };
  try {
    await withEnv(NO_SIDE_EFFECTS, async () => {
      const res = await deliver(session());
      assert.equal(res.statusCode, 200);
    });
  } finally { globalThis.fetch = realFetch; }
});
