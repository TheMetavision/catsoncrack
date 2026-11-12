// Dogcatcher Dash leaderboard: shared logic for the Netlify functions (ported from The Fuglys' Scrap Dash, sd-shared.mjs,
// itself ported from Labrats' Vent Runner, vr-shared.mjs).
// Storage is Netlify Blobs (store "dogcatcher-dash"); requires @netlify/blobs with conditional writes (onlyIfMatch / onlyIfNew).
import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const BOARD_SIZE = 100;
export const KEEP_MONTHS = 24;          // monthly boards older than this are deleted
export const PUBLIC_SIZE = 20;          // entries returned to players
export const MIN_BOARD_DIST = 100;      // shorter runs are accepted but not stored
export const CONTACT_EMAIL = 'meow@catsoncrack.co.uk';   // month-end summary and claims go here

/* ---------- storage ---------- */
let storeOverride = null;               // tests inject an in-memory store
export function setStoreForTests(s) { storeOverride = s; settle = 0; }
export async function ddStore() {
  if (storeOverride) return storeOverride;
  const { getStore } = await import('@netlify/blobs');
  return getStore({ name: 'dogcatcher-dash', consistency: 'strong' });
}

/* ---------- interim guard: Netlify Blobs ignoring onlyIfNew / onlyIfMatch ----------
   November 2026: Netlify Blobs was confirmed (from a deployed function) to ignore conditional writes on our
   sites; a support ticket is open. Every onlyIfNew / onlyIfMatch call is kept exactly as it was, so the real
   protection comes back by itself once Netlify fixes it. Until then each guarded write also:
     1. reads the key first with strong consistency and refuses if it already exists (or has moved on), and
     2. stamps the value with a random writeId, reads it back, and treats a different writeId as a clash
        (someone else's write landed): refuse, or re-read and decide again.
   This narrows the race a lost conditional write opens; it can't close it completely (two writers can still
   both read back their own copy if their writes don't overlap the other's read-back). SETTLE_MS widens the
   window for the prize record, where a double win would mean two prizes. Safe to leave in after the fix. */
export const STRONG = { type: 'json', consistency: 'strong' };
export const SETTLE_MS = 300;
let settle = SETTLE_MS;                 // tests run without the pause (setStoreForTests)
export const settleMs = () => settle;
const pause = ms => (ms > 0 ? new Promise(r => setTimeout(r, ms)) : null);
/** After a write stamped with `writeId`: wait `ms`, read `key` back (strong) and say whether our write is the one stored. */
export async function stillOurs(store, key, writeId, ms = 0) {
  await pause(ms);
  const back = await store.get(key, STRONG);
  return !!back && back.writeId === writeId;
}

/* ---------- secrets and signing ---------- */
function secret() {
  const s = (globalThis.Netlify && Netlify.env.get('DD_LEADERBOARD_SECRET')) || process.env.DD_LEADERBOARD_SECRET;
  if (!s || s.length < 32) throw new Error('DD_LEADERBOARD_SECRET is missing or too short');
  return s;
}
const b64u = buf => Buffer.from(buf).toString('base64url');
export const sha256 = s => createHash('sha256').update(String(s)).digest('hex');
export function signTicket(payload) {
  const body = b64u(JSON.stringify(payload));
  const sig = createHmac('sha256', secret()).update(body).digest('base64url');
  return body + '.' + sig;
}
export function readTicket(token) {
  if (typeof token !== 'string' || token.length > 600 || !token.includes('.')) return null;
  const [body, sig] = token.split('.');
  const want = createHmac('sha256', secret()).update(body).digest();
  let got; try { got = Buffer.from(sig, 'base64url'); } catch { return null; }
  if (got.length !== want.length || !timingSafeEqual(got, want)) return null;
  try { return JSON.parse(Buffer.from(body, 'base64url').toString()); } catch { return null; }
}
/** An HMAC of `text` under the leaderboard secret (the team's disqualify links, dd-prize.mjs). */
export const signText = (text) => createHmac('sha256', secret()).update(String(text)).digest('base64url');
export const sameText = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && timingSafeEqual(x, y); };
export const newId = (n = 12) => randomBytes(n).toString('base64url');
export function claimCode() {               // 8 characters, no look-alikes (0/O, 1/I/L)
  const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', b = randomBytes(8);
  return Array.from(b, x => abc[x % abc.length]).join('');
}

/* ---------- the physics check ----------
   Game speed tops out at 34 m/s, 46 m/s under a boost. The check uses a flat 50 m/s ceiling
   (above both), so the fastest any run can cover `dist` metres is dist / 50 seconds. */
export const MAX_SPEED = 50;
export function minSeconds(dist) {
  return dist / MAX_SPEED;
}
// A run is impossible if it arrived faster than physics allows (small allowance for clocks and rounding).
export function plausibility(dist, elapsedSec) {
  const need = minSeconds(dist);
  if (elapsedSec < need * 0.95 - 2) return { ok: false, need };
  return { ok: true, need, flag: elapsedSec < need * 1.12 };   // suspiciously close to the theoretical best
}

/* ---------- nicknames: generated from fixed word lists, never typed ---------- */
// The game's own lists (public/games/dogcatcher-dash/index.html, NICK_A / NICK_B): keep the two in step.
export const NICK_A = ['Sly', 'Shady', 'Scruffy', 'Sneaky', 'Slinky', 'Mangy', 'Nifty', 'Lucky', 'Feral', 'Speedy', 'Midnight', 'Alley', 'Swift', 'Crafty', 'Cheeky', 'Bold', 'Daring', 'Stray', 'Plucky', 'Ginger'];
export const NICK_B = ['Whisker', 'Paws', 'Tomcat', 'Kipper', 'Prowler', 'Scrapper', 'Moggy', 'Pouncer', 'Sardine', 'Rascal', 'Bandit', 'Dasher', 'Runner', 'Claws', 'Tabby', 'Nipper', 'Rooftop', 'Mouser', 'Kitten', 'Drifter'];
export function validNick(n) {
  const m = typeof n === 'string' && /^([A-Z][a-z]+)([A-Z][a-z]+)(\d{2})$/.exec(n);
  return !!m && NICK_A.includes(m[1]) && NICK_B.includes(m[2]);
}
export const STAGES = ['alley', 'canal', 'warehouse'];
export const RUNNERS = ['whiskers', 'slinky'];

/* ---------- periods (UK calendar months) ---------- */
export function monthId(date = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit' }).formatToParts(date);
  return p.find(x => x.type === 'year').value + '-' + p.find(x => x.type === 'month').value;
}
export function prevMonthId(date = new Date()) {
  const [y, m] = monthId(date).split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
}
export const monthName = id => new Date(Date.UTC(+id.slice(0, 4), +id.slice(5) - 1, 15)).toLocaleString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });

/* ---------- boards: best run per device, sorted by distance ---------- */
export async function addToBoard(store, key, entry) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const cur = await store.getWithMetadata(key, STRONG);   // read first (interim guard: a new board is only created when none exists)
    const entries = cur && cur.data ? cur.data.entries.slice() : [];
    const mine = entries.findIndex(e => e.dev === entry.dev);
    if (mine >= 0 && entries[mine].dist >= entry.dist) return rankOf(entries, entries[mine]);
    if (mine >= 0) entries.splice(mine, 1);
    entries.push(entry);
    entries.sort((a, b) => b.dist - a.dist || a.at - b.at);
    const kept = entries.slice(0, BOARD_SIZE);
    const opts = cur ? { onlyIfMatch: cur.etag } : { onlyIfNew: true };
    const writeId = newId();
    const res = await store.setJSON(key, { entries: kept, updated: Date.now(), writeId }, opts);
    if (res && res.modified === false) continue;
    if (!(await stillOurs(store, key, writeId))) continue;     // interim guard: another submit's write replaced ours, so add again
    const r = kept.indexOf(entry); return r >= 0 ? r + 1 : null;
  }
  throw new Error('board busy');
}
const rankOf = (entries, e) => entries.indexOf(e) + 1;
export const publicEntry = (e, i) => ({ rank: i + 1, nick: e.nick, dist: e.dist, score: e.score, stage: e.stage, runner: e.runner, at: e.at });

/* ---------- rate limiting (approximate, per hashed IP per hour) ---------- */
export async function rateLimited(store, req, context, bucket, max) {
  const ip = (context && context.ip) || req.headers.get('x-nf-client-connection-ip') || 'unknown';
  const key = `rl/${Math.floor(Date.now() / 3600000)}/${bucket}/${sha256(ip).slice(0, 24)}`;
  const n = ((await store.get(key, { type: 'json' })) || 0) + 1;
  await store.setJSON(key, n);
  return n > max;
}

/* ---------- small helpers ---------- */
export const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store', ...headers } });
export async function readJson(req, maxBytes = 4000) {
  const text = await req.text();
  if (text.length > maxBytes) return null;
  try { return JSON.parse(text); } catch { return null; }
}
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
