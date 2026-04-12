/**
 * netlify/functions/create-checkout.js
 *
 * Creates a Stripe Checkout Session from cart items using ad-hoc pricing.
 * No need to pre-create Stripe Products — prices are built on the fly.
 *
 * Env vars required in Netlify:
 *   STRIPE_SECRET_KEY  — sk_live_... (your single Stripe account key)
 *   SITE_URL           — e.g. https://catsoncrack.co.uk
 *
 * BRAND_TAG is the only thing that changes per brand — it tags orders
 * in Stripe so you know which brand they came from.
 */

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

/* ── Brand identifier (change per brand) ── */
const BRAND_TAG = 'catsoncrack-web';

/* ── Allowed shipping countries ── */
const ALLOWED_COUNTRIES = [
  'GB',
  'US', 'CA',
  'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'AT', 'PT', 'IE', 'PL', 'SE',
  'DK', 'FI', 'CZ', 'GR', 'RO', 'HU', 'BG', 'HR', 'SK', 'SI', 'LT',
  'LV', 'EE', 'CY', 'LU', 'MT', 'MC', 'SM', 'VA', 'AD', 'AZ', 'KZ',
  'IS', 'LI', 'NO', 'CH',
  'AU', 'NZ',
  'JP', 'BR',
  'MX', 'SG', 'KR', 'IN', 'ZA', 'AE', 'SA', 'TH', 'MY', 'PH', 'ID',
  'AR', 'CL', 'CO', 'PE', 'HK', 'TW', 'IL', 'TR', 'NG', 'KE', 'GH',
];

/* ── Shipping tiers (same as Wyrmfuel) ── */
function buildShippingOptions(cartTotalPence) {
  const freeThreshold = 7500; // £75 in pence
  const ukRate = cartTotalPence >= freeThreshold ? 0 : 695;
  const ukLabel = cartTotalPence >= freeThreshold
    ? 'UK Standard (FREE over £75)'
    : 'UK Standard';

  return [
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: ukRate, currency: 'gbp' },
        display_name: ukLabel,
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 3 },
          maximum: { unit: 'business_day', value: 5 },
        },
      },
    },
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 1295, currency: 'gbp' },
        display_name: 'Europe',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 5 },
          maximum: { unit: 'business_day', value: 10 },
        },
      },
    },
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 1495, currency: 'gbp' },
        display_name: 'North America',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 7 },
          maximum: { unit: 'business_day', value: 14 },
        },
      },
    },
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 1795, currency: 'gbp' },
        display_name: 'Australia & New Zealand',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 10 },
          maximum: { unit: 'business_day', value: 18 },
        },
      },
    },
    {
      shipping_rate_data: {
        type: 'fixed_amount',
        fixed_amount: { amount: 1995, currency: 'gbp' },
        display_name: 'Rest of World',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 10 },
          maximum: { unit: 'business_day', value: 21 },
        },
      },
    },
  ];
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  if (!process.env.STRIPE_SECRET_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Stripe not configured' }) };
  }

  try {
    const { items } = JSON.parse(event.body || '{}');

    if (!items || items.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Cart is empty' }) };
    }

    const SITE_URL = process.env.SITE_URL || process.env.URL || 'http://localhost:8888';

    const line_items = items.map((item) => {
      const colourLabel = item.colour ? ` — ${item.colour}` : '';
      return {
        price_data: {
          currency: 'gbp',
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: `${item.title}${colourLabel} (${item.size})`,
          },
        },
        quantity: item.quantity || 1,
      };
    });

    /* Calculate cart total in pence for free-shipping threshold */
    const cartTotalPence = items.reduce((sum, item) => {
      return sum + Math.round(item.price * 100) * (item.quantity || 1);
    }, 0);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items,
      shipping_address_collection: {
        allowed_countries: ALLOWED_COUNTRIES,
      },
      shipping_options: buildShippingOptions(cartTotalPence),
      success_url: `${SITE_URL}/order-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE_URL}/shop`,
      metadata: { source: BRAND_TAG },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error('Stripe checkout error:', err.message || err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Checkout failed' }),
    };
  }
};
