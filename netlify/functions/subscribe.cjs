/**
 * netlify/functions/subscribe.js  (Cats On Crack)
 *
 * Server-side newsletter signup. The homepage form and the Alleyway Gazette
 * form POST { email } to /api/subscribe (netlify.toml rewrites
 * /api/*  ->  /.netlify/functions/*). The MailerLite API token lives in an
 * env var and is NEVER sent to the browser.
 *
 * Env vars (set in Netlify; mark MAILERLITE_API_KEY as "Secret"):
 *   MAILERLITE_API_KEY   - MailerLite API token  (use the ROTATED token)
 *   MAILERLITE_GROUP_ID  - COC newsletter group  (default below = the group
 *                          the homepage/gazette currently subscribe people to)
 *
 * Response contract (consumed by the two COC newsletter forms):
 *   200 { ok: true }                 -> newly subscribed
 *   200 { ok: true, already: true }  -> already on the list
 *   400 { error }                    -> invalid email / bad request
 *   500 { error }                    -> not configured (env var missing)
 *   502 { error }                    -> MailerLite unreachable / errored
 */

const GROUP_ID = process.env.MAILERLITE_GROUP_ID || '184360844895716414';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return json(405, { error: 'Method not allowed' });
  }
  if (!process.env.MAILERLITE_API_KEY) {
    console.error('subscribe: MAILERLITE_API_KEY not set');
    return json(500, { error: 'Newsletter not configured' });
  }

  let email;
  try {
    ({ email } = JSON.parse(event.body || '{}'));
  } catch (_) {
    return json(400, { error: 'Invalid request' });
  }

  email = String(email || '').trim().toLowerCase();
  if (!EMAIL_RE.test(email)) {
    return json(400, { error: 'Please enter a valid email address' });
  }

  const payload = { email, status: 'active' };
  if (GROUP_ID) payload.groups = [GROUP_ID];

  try {
    const res = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${process.env.MAILERLITE_API_KEY}`,
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) return json(200, { ok: true });
    // 422 = validation / already-handled address -> friendly "already in" state
    if (res.status === 422) return json(200, { ok: true, already: true });

    const detail = await res.text();
    console.error('subscribe: MailerLite error', res.status, detail);
    return json(502, { error: 'Could not sign you up right now. Please try again later.' });
  } catch (err) {
    console.error('subscribe: request failed', (err && err.message) || err);
    return json(502, { error: 'Could not sign you up right now. Please try again later.' });
  }
};

function json(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}
