/**
 * The interim replay guard (netlify/lib/dd-shared.mjs, "interim guard"): Netlify Blobs was found ignoring
 * onlyIfNew / onlyIfMatch on our sites (November 2026). These tests run the dd-* functions on an in-memory
 * store that IGNORES conditional writes, as Blobs does now, and check that the read-first and writeId
 * read-back checks still refuse a replayed run ticket, a second claim or decline for the same month,
 * and a second month close. Resend, Printful and the Sanity catalogue are faked; any other network call fails.
 *
 *   npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const quiet = () => {};
console.log = quiet; console.warn = quiet; console.error = quiet;

process.env.DD_LEADERBOARD_SECRET = 'test-secret-0123456789-abcdefghijklmnop';
process.env.PRINTFUL_API_KEY = 'pf_test_key';
process.env.RESEND_API_KEY = 're_test';

// ── in-memory Blobs that ignores onlyIfNew / onlyIfMatch (every write lands) ──
const mem = new Map(); let n = 0;
const conditional = { new: 0, match: 0 };
const { setStoreForTests, signTicket, sha256, monthId } = await import('../netlify/lib/dd-shared.mjs');
const tick = () => new Promise((r) => setImmediate(r));   // every store call yields, so parallel requests interleave
setStoreForTests({
  async get(k) { await tick(); const v = mem.get(k); return v ? JSON.parse(v.d) : null; },
  async getWithMetadata(k) { await tick(); const v = mem.get(k); return v ? { data: JSON.parse(v.d), etag: v.e } : null; },
  async setJSON(k, val, o = {}) {
    await tick();
    if (o.onlyIfNew) conditional.new++;
    if (o.onlyIfMatch) conditional.match++;
    mem.set(k, { d: JSON.stringify(val), e: 'e' + (++n) });
    return { modified: true, etag: 'e' + n };            // what Blobs answers while it ignores the condition
  },
  async *list({ prefix }) { yield { blobs: [...mem.keys()].filter((k) => k.startsWith(prefix)).map((key) => ({ key })) }; },
  async delete(k) { await tick(); mem.delete(k); },
});
const read = (k) => (mem.has(k) ? JSON.parse(mem.get(k).d) : null);

// ── fetch: Resend, Printful, Sanity (GET), nothing else ──
const sent = [], pfOrders = [];
const PRODUCT = { name: 'Alley Cat Chaos', slug: 'alley-cat-chaos', variants: [{ productType: 'tshirt', printfulVariants: [{ colour: 'Black', size: 'M', syncVariantId: '6001' }] }] };
const jsonRes = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(String(url)), method = (init.method || 'GET').toUpperCase();
  if (u.hostname === 'api.resend.com' && method === 'POST') { sent.push(JSON.parse(init.body)); return jsonRes({ id: 'em_' + sent.length }); }
  if (u.hostname.endsWith('.api.sanity.io') && method === 'GET') return jsonRes({ result: PRODUCT });
  if (u.hostname === 'api.printful.com') {
    if (method === 'POST' && u.pathname === '/orders') { pfOrders.push(JSON.parse(init.body)); return jsonRes({ result: { id: 900 + pfOrders.length } }); }
    return jsonRes({ result: { id: 6001 } });
  }
  throw new Error('unexpected network call ' + url);
};

const submit = (await import('../netlify/functions/dd-submit.mjs')).default;
const claim = (await import('../netlify/functions/dd-claim.mjs')).default;
const decline = (await import('../netlify/functions/dd-decline.mjs')).default;
const { closeMonth } = await import('../netlify/functions/dd-close-month.mjs');
const { newRecord, createRecord } = await import('../netlify/lib/dd-prize.mjs');

let ip = 0;   // a fresh IP per request keeps the anti-spam counters out of the way
const post = async (fn, body) => { const a = `10.0.0.${++ip}`; const res = await fn(new Request('https://x/api', { method: 'POST', body: JSON.stringify(body), headers: { 'x-nf-client-connection-ip': a } }), { ip: a }); return { status: res.status, ...(await res.json()) }; };
const dev = (c) => sha256(c.repeat(64));
const ticket = (d, secsAgo = 200) => signTicket({ rid: Math.random().toString(36).slice(2), t: Date.now() - secsAgo * 1000, stage: 'alley', runner: 'whiskers', dev: d });
const run = (tk, nick, dist) => post(submit, { token: tk, nick, dist, score: 10 });
const form = (month, claimCode) => ({ month, claimCode, claimant: 'winner', name: 'Pat Player', email: 'pat@example.com', address1: '1 Kipper Lane', town: 'Southend-on-Sea', postcode: 'SS1 1AA', design: 'alley-cat-chaos', garment: 'tshirt', colour: 'Black', size: 'M', consent: true });
const cands = (k) => Array.from({ length: k }, (_, i) => ({ rid: 'r' + i, nick: 'SlyKipper' + String(10 + i), dist: 3000 - i * 100, score: 1, stage: 'alley', runner: 'whiskers', dev: dev(String.fromCharCode(97 + i)), flag: false, secs: 900 }));

test('the mock really ignores conditional writes (as Netlify Blobs does now)', async () => {
  const { ddStore } = await import('../netlify/lib/dd-shared.mjs');
  const s = await ddStore();
  await s.setJSON('probe', { a: 1 }, { onlyIfNew: true });
  const again = await s.setJSON('probe', { a: 2 }, { onlyIfNew: true });
  const stale = await s.setJSON('probe', { a: 3 }, { onlyIfMatch: 'not-the-etag' });
  assert.equal(again.modified, true); assert.equal(stale.modified, true); assert.deepEqual(read('probe'), { a: 3 });
  mem.delete('probe');
});

test('run tickets: a replayed ticket is refused with "used"', async () => {
  const tk = ticket(dev('a'));
  const first = await run(tk, 'SlyKipper42', 2000);
  assert.equal(first.ok, true); assert.equal(first.monthRank, 1);
  const before = conditional.new;
  const replay = await run(tk, 'SlyKipper42', 2000);
  assert.equal(replay.status, 409); assert.equal(replay.reason, 'used');
  assert.equal(conditional.new, before, 'refused by the read-first check, before any write');
});

test('run tickets: the same ticket sent twice at once counts once', async () => {
  const tk = ticket(dev('b'), 300);
  const both = await Promise.all([run(tk, 'AlleyTomcat07', 2600), run(tk, 'AlleyTomcat07', 2600)]);
  assert.deepEqual(both.map((r) => r.ok).sort(), [false, true]);
  assert.equal(both.find((r) => !r.ok).reason, 'used');
  const board = read(`board/${monthId()}`).entries;
  assert.equal(board.filter((e) => e.dev === dev('b')).length, 1);
});

test('boards: two runs submitted at once both reach the board', async () => {
  const both = await Promise.all([run(ticket(dev('c'), 400), 'NiftyMoggy11', 1500), run(ticket(dev('d'), 400), 'LuckyPaws22', 1400)]);
  assert.ok(both.every((r) => r.ok));
  const devs = read(`board/${monthId()}`).entries.map((e) => e.dev);
  assert.ok(devs.includes(dev('c')) && devs.includes(dev('d')), 'neither write lost the other');
});

test('month close: closing a second time, or twice at once, does nothing', async () => {
  const [y, m] = monthId().split('-').map(Number), next = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 2));
  const mails = sent.length;
  const both = await Promise.all([closeMonth(next), closeMonth(next)]);
  assert.equal(both.filter((c) => c.winner === 'already closed').length, 1);
  assert.equal(sent.length, mails + 1, 'one summary email');
  const code = read(`winners/${monthId()}`).offer.claimCode;
  const again = await closeMonth(next);
  assert.equal(again.winner, 'already closed'); assert.equal(sent.length, mails + 1);
  assert.equal(read(`winners/${monthId()}`).offer.claimCode, code, 'the claim code is not replaced');
});

test('prize claims: a second claim for the same month is refused with "already claimed"', async () => {
  const month = monthId(), code = read(`winners/${month}`).offer.claimCode;
  const drafts = pfOrders.length;
  const first = await post(claim, form(month, code));
  assert.equal(first.ok, true);
  assert.equal(read(`winners/${month}`).status, 'claimed');
  const second = await post(claim, form(month, code));
  assert.equal(second.status, 409); assert.equal(second.reason, 'claimed');
  assert.equal(pfOrders.length, drafts + 1, 'one Printful draft');
});

test('prize claims: two claims sent at once make one claim and one draft', async () => {
  const { ddStore } = await import('../netlify/lib/dd-shared.mjs');
  const month = '2099-01';
  assert.equal(await createRecord(await ddStore(), newRecord(month, cands(3))), true);
  const code = read(`winners/${month}`).offer.claimCode, drafts = pfOrders.length;
  const both = await Promise.all([post(claim, form(month, code)), post(claim, form(month, code))]);
  assert.deepEqual(both.map((r) => r.ok).sort(), [false, true]);
  assert.ok(['busy', 'claimed'].includes(both.find((r) => !r.ok).reason));
  assert.equal(pfOrders.length, drafts + 1, 'one Printful draft');
  const rec = read(`winners/${month}`);
  assert.equal(rec.status, 'claimed'); assert.equal(rec.claim.idx, 0);
  const late = await post(claim, form(month, code));
  assert.equal(late.reason, 'claimed');
});

test('declines and pass-downs: a repeated decline, or two at once, passes the prize down only one place', async () => {
  const { ddStore } = await import('../netlify/lib/dd-shared.mjs');
  const month = '2099-02';
  assert.equal(await createRecord(await ddStore(), newRecord(month, cands(4))), true);
  const code = read(`winners/${month}`).offer.claimCode;
  const both = await Promise.all([post(decline, { month, claimCode: code }), post(decline, { month, claimCode: code })]);
  assert.deepEqual(both.map((r) => r.ok).sort(), [false, true]);
  let rec = read(`winners/${month}`);
  assert.equal(rec.offer.idx, 1, 'passed to the next player, not two places');
  assert.equal(rec.history.filter((h) => h.outcome === 'declined').length, 1);
  const again = await post(decline, { month, claimCode: code });
  assert.equal(again.ok, false); assert.equal(again.reason, 'code');
  rec = read(`winners/${month}`);
  assert.equal(rec.offer.idx, 1);
  // the old holder's code can't claim either
  const stale = await post(claim, form(month, code));
  assert.equal(stale.ok, false); assert.equal(stale.reason, 'code');
});

test('month close: a month that already has a record is never overwritten', async () => {
  const { ddStore } = await import('../netlify/lib/dd-shared.mjs');
  const before = read('winners/2099-01');
  assert.equal(await createRecord(await ddStore(), newRecord('2099-01', cands(2))), false);
  assert.deepEqual(read('winners/2099-01'), before);
});
