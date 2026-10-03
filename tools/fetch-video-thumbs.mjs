#!/usr/bin/env node
/**
 * tools/fetch-video-thumbs.mjs
 *
 * Downloads a thumbnail for every episode video into
 * public/video-thumbs/<youtubeId>.jpg, so the Media page shows self-hosted
 * images and nothing is fetched from YouTube until the visitor presses play.
 * Re-run after adding an episode in Sanity; a missing thumbnail falls back to
 * a plain branded poster, never to YouTube's image server.
 *
 *   node tools/fetch-video-thumbs.mjs            # only missing thumbnails
 *   node tools/fetch-video-thumbs.mjs --force    # re-download all
 */
import { mkdir, writeFile, access, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'public', 'video-thumbs');
const FORCE = process.argv.includes('--force');
const HERO_TRAILER_FALLBACK_ID = 'ay215yKvntY'; // keep in sync with src/pages/media.astro

// Optional token from .env (dataset reads are public without one).
let token = process.env.SANITY_API_TOKEN;
if (!token) {
  try {
    token = (await readFile(join(ROOT, '.env'), 'utf8')).match(/^SANITY_API_TOKEN=(.*)$/m)?.[1]?.trim();
  } catch { /* no .env */ }
}

const query = `*[_type == "episode" && !(_id in path("drafts.**"))]{ youtubeId, youtubeUrl }`;
const res = await fetch(
  `https://8ksun996.api.sanity.io/v2024-01-01/data/query/production?query=${encodeURIComponent(query)}`,
  token ? { headers: { Authorization: `Bearer ${token}` } } : {}
);
if (!res.ok) throw new Error(`Sanity query failed: HTTP ${res.status}`);
const idFrom = (e) =>
  e.youtubeId ||
  e.youtubeUrl?.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{6,})/)?.[1];
const ids = [...new Set([HERO_TRAILER_FALLBACK_ID, ...(await res.json()).result.map(idFrom)])]
  .filter((id) => /^[\w-]{11}$/.test(id || ''));

await mkdir(OUT, { recursive: true });
const VARIANTS = ['maxresdefault', 'sddefault', 'hqdefault'];

for (const id of ids) {
  const file = join(OUT, `${id}.jpg`);
  if (!FORCE) {
    try { await access(file); console.log(`skip  ${id} (exists)`); continue; } catch { /* fetch it */ }
  }
  let saved = false;
  for (const v of VARIANTS) {
    const r = await fetch(`https://i.ytimg.com/vi/${id}/${v}.jpg`);
    if (!r.ok) continue;
    const buf = Buffer.from(await r.arrayBuffer());
    if (buf.length < 2000) continue; // YouTube's grey "no thumbnail" placeholder
    await writeFile(file, buf);
    console.log(`saved ${id} (${v}, ${Math.round(buf.length / 1024)}KB)`);
    saved = true;
    break;
  }
  if (!saved) console.log(`MISSING ${id}: no thumbnail available`);
}
