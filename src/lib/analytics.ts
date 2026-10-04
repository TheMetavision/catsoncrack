/**
 * src/lib/analytics.ts  (Cats On Crack)
 *
 * Google Analytics 4, consent-first (UK PECR). Nothing from Google loads until
 * the visitor presses Accept on the consent banner; the choice lives in
 * localStorage under CONSENT_KEY ("granted" | "denied").
 *
 * State is kept on window (dataLayer, gtag, the gtag.js <script>), not in this
 * module, because the module is bundled into both the banner script and the
 * cart island.
 *
 * Shop events (view_item / add_to_cart / begin_checkout) are sent only with
 * consent. Inline page scripts (define:vars, which cannot import) queue events
 * on window.cocGa; the banner drains that queue once it has run.
 */

export const GA_MEASUREMENT_ID = 'G-6NNR8LH648';
export const CONSENT_KEY = 'coc-consent';
export const CURRENCY = 'GBP'; // create-checkout charges in gbp

type Consent = 'granted' | 'denied' | null;

export interface GaItem {
  item_id: string;
  item_name: string;
  item_variant?: string;
  item_category?: string;
  price: number;
  quantity: number;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    cocGa?: unknown[] | { push: (entry: unknown) => void };
    [key: `ga-disable-${string}`]: boolean | undefined;
  }
}

const SCRIPT_ID = 'coc-gtag-js';

export function getConsent(): Consent {
  try {
    const v = localStorage.getItem(CONSENT_KEY);
    return v === 'granted' || v === 'denied' ? v : null;
  } catch {
    return null;
  }
}

export function hasConsent(): boolean {
  return getConsent() === 'granted';
}

function storeConsent(value: 'granted' | 'denied') {
  try { localStorage.setItem(CONSENT_KEY, value); } catch { /* private mode: applies to this page only */ }
}

/* Order-confirmation pages carry ?session_id=cs_... from Stripe; Google gets
   the bare address only. The referrer is cut to its origin for the same reason. */
const PRIVATE_QUERY_PATH = /^\/(order-success|order-confirmation|checkout\/success|success)\/?$/;

function pageFields(): Record<string, string> {
  if (!PRIVATE_QUERY_PATH.test(location.pathname)) return {};
  const fields: Record<string, string> = { page_location: location.origin + location.pathname };
  try {
    if (document.referrer) fields.page_referrer = new URL(document.referrer).origin + '/';
  } catch { /* unparsable referrer: leave GA's default */ }
  return fields;
}

function gtag(...args: unknown[]) {
  window.dataLayer = window.dataLayer || [];
  // gtag.js expects the arguments object itself, as in Google's snippet.
  // eslint-disable-next-line prefer-rest-params
  window.gtag = window.gtag || function () { window.dataLayer!.push(arguments); };
  window.gtag(...args);
}

/** Load gtag.js and send the page_view. Idempotent; only call with consent. */
function loadGtag() {
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
  if (document.getElementById(SCRIPT_ID)) {
    // Re-accepted after a reject on this same page.
    gtag('consent', 'update', { analytics_storage: 'granted' });
    return;
  }
  gtag('consent', 'default', {
    analytics_storage: 'granted',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  gtag('js', new Date());
  gtag('config', GA_MEASUREMENT_ID, pageFields());

  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.appendChild(s);
}

/** Expire every _ga / _ga_<container> cookie on this host and its parent domain. */
function deleteGaCookies() {
  const host = location.hostname;
  const domains = ['', host, `.${host}`];
  const bare = host.replace(/^www\./, '');
  if (bare !== host) domains.push(bare, `.${bare}`);
  for (const pair of document.cookie.split(';')) {
    const name = pair.split('=')[0].trim();
    if (!/^_ga(_|$)/.test(name)) continue;
    for (const d of domains) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${d ? `; domain=${d}` : ''}`;
    }
  }
}

export function grantConsent() {
  storeConsent('granted');
  loadGtag();
}

export function denyConsent() {
  const wasLoaded = !!document.getElementById(SCRIPT_ID);
  storeConsent('denied');
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  if (wasLoaded) gtag('consent', 'update', { analytics_storage: 'denied' });
  deleteGaCookies();
}

/** On every page: start GA if the visitor accepted on an earlier visit. */
export function initAnalytics() {
  if (hasConsent()) loadGtag();
}

/** Send a GA4 event, only with consent. */
export function track(name: string, params: Record<string, unknown> = {}) {
  if (!hasConsent() || window[`ga-disable-${GA_MEASUREMENT_ID}`]) return;
  if (!document.getElementById(SCRIPT_ID)) loadGtag();
  gtag('event', name, params);
}

/** Like track(), but resolves once GA confirms the hit or after timeoutMs. */
export function trackAndWait(name: string, params: Record<string, unknown>, timeoutMs = 800): Promise<void> {
  if (!hasConsent() || window[`ga-disable-${GA_MEASUREMENT_ID}`]) return Promise.resolve();
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, timeoutMs);
    const done = () => { clearTimeout(timer); resolve(); };
    track(name, { ...params, event_callback: done, event_timeout: timeoutMs });
  });
}

/* Same shapes create-checkout writes to the Stripe session metadata. */
const CLIENT_ID = /^\d+\.\d+$/;
const SESSION_ID = /^\d{1,20}$/;

/**
 * GA's client_id and session_id for the server-side purchase, inside ONE shared
 * time limit. Resolves {} without consent, if gtag.js is blocked, or if it does
 * not answer in time. A session id is only returned alongside a valid client id.
 */
export function getGaIds(timeoutMs = 800): Promise<{ client_id?: string; session_id?: string }> {
  if (!hasConsent() || window[`ga-disable-${GA_MEASUREMENT_ID}`]) return Promise.resolve({});
  if (!document.getElementById(SCRIPT_ID)) loadGtag();

  const ask = (field: string) => new Promise<string>((resolve) => {
    try { gtag('get', GA_MEASUREMENT_ID, field, (v: unknown) => resolve(v == null ? '' : String(v))); }
    catch { resolve(''); }
  });
  const limit = new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs));

  return Promise.race([Promise.all([ask('client_id'), ask('session_id')]), limit]).then((r) => {
    if (!r) return {};
    const [clientId, sessionId] = r;
    if (!CLIENT_ID.test(clientId)) return {};
    return SESSION_ID.test(sessionId) ? { client_id: clientId, session_id: sessionId } : { client_id: clientId };
  });
}

/* ── GA4 items ─────────────────────────────────────────────────────────── */

/** Product slug from a cart id when the item predates the slug field. */
function slugFromId(id: string): string {
  const art = /^wallart-(.+)-(poster|canvas-standard|canvas-gallery)-[^-]+$/.exec(id);
  if (art) return art[1];
  return id.replace(/^product-/, '');
}

/** item_variant: colour / size for garments, format / size for wall art. */
export function variantLabel(item: { colour?: string; size?: string; format?: string }): string {
  return [item.format || item.colour, item.size].filter(Boolean).join(' / ');
}

export function toGaItem(item: {
  id: string; slug?: string; title: string; price: number; quantity?: number;
  size?: string; colour?: string; format?: string; productType?: string;
}): GaItem {
  const out: GaItem = {
    item_id: item.slug || slugFromId(item.id),
    item_name: item.title,
    price: Number(item.price) || 0,
    quantity: item.quantity || 1,
  };
  const variant = variantLabel(item);
  if (variant) out.item_variant = variant;
  if (item.productType) out.item_category = item.productType;
  return out;
}

/** value + currency + items, as GA4 ecommerce events expect. */
export function ecommerceParams(items: GaItem[]) {
  const value = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return { currency: CURRENCY, value: Math.round(value * 100) / 100, items };
}

/* ── Queue for inline page scripts ─────────────────────────────────────── */

/** Drain window.cocGa ([eventName, params] entries) and send later pushes straight away. */
export function drainQueue() {
  const run = (entry: unknown) => {
    if (Array.isArray(entry) && typeof entry[0] === 'string') track(entry[0], entry[1] || {});
  };
  const pending = Array.isArray(window.cocGa) ? window.cocGa : [];
  window.cocGa = { push: run };
  pending.forEach(run);
}
