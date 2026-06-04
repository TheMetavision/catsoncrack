/**
 * netlify/functions/subscribe.js  (Cats On Crack)
 *
 * Server-side newsletter signup. The merch page form POSTs { email } here;
 * this function adds the subscriber to the COC MailerLite group using a token
 * held in an env var — so no API token is ever exposed in client-side JS.
 *
 * Required env var:
 *   MAILERLITE_TOKEN     — MailerLite API token (rotate the old leaked one!)
 * Optional env var:
 *   MAILERLITE_GROUP_ID  — COC group id (defaults to the existing COC group)
 */

const GROUP_ID = process.env.MAILERLITE_GROUP_ID || '184361347785426604';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }
  if (!process.env.MAILERLITE_TOKEN) {
    console.error('subscribe: MAILERLITE_TOKEN not set');
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Newsletter not configured' }) };
  }

  let email;
  try {
    ({ email } = JSON.parse(event.body || '{}'));
  } catch (_) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid request' }) };
  }

  email = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Please enter a valid email address' }) };
  }

  try {
    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.MAILERLITE_TOKEN}`,
      },
      body: JSON.stringify({ email, groups: [GROUP_ID], status: 'active' }),
    });

    // MailerLite returns 200/201 for create, 200 for an already-existing
    // subscriber (idempotent upsert) — all are success from the user's view.
    if (res.ok) {
      return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
    }

    const detail = await res.text();
    console.error('subscribe: MailerLite error', res.status, detail);
    // 422 = validation (e.g. already unsubscribed/blocked) — don't leak detail.
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Could not sign you up right now. Please try again later.' }) };
  } catch (err) {
    console.error('subscribe: request failed', err.message || err);
    return { statusCode: 502, headers, body: JSON.stringify({ error: 'Could not sign you up right now. Please try again later.' }) };
  }
};
