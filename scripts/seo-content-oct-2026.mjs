/**
 * scripts/seo-content-oct-2026.mjs — blog SEO descriptions from
 * the October 2026 audit (limits: titles 60, descriptions 155).
 *
 *   node --env-file=.env scripts/seo-content-oct-2026.mjs            dry run: prints old → new, writes the plan
 *   node --env-file=.env scripts/seo-content-oct-2026.mjs --apply    applies the plan written by the dry run
 *
 * The dry run records each document's _rev. --apply patches a document only
 * if it is unchanged since then (ifRevisionID) and has no open draft, so
 * anything edited in Studio in between is skipped and reported, not
 * overwritten. Needs SANITY_API_TOKEN (write) in .env.
 */
import fs from 'node:fs';
import { createClient } from '@sanity/client';

const PLAN = new URL('./seo-content-oct-2026.plan.json', import.meta.url);
const MAX = { seoTitle: 60, seoDescription: 155 };

/** [_type, slug, field path, new value] */
const EDITS = [
  ['blogPost', 'creating-the-chaos-animation-insights', 'seoDescription',
    "The alleys don't draw themselves. Behind the scenes on how Cats On Crack's Meowtown gets built: the design decisions, the animation style and the detail."],
  ['blogPost', 'the-unwritten-rules-of-alley-life', 'seoDescription',
    "Every cat in Meowtown knows the code. Nobody wrote it down: you learn it fast or you don't last. The rules that keep the alleys running."],
  ['blogPost', 'urban-myths-the-ghost-cat-of-5th-street', 'seoDescription',
    "A phantom feline appears in the alleys before every major event in Meowtown's history. Nobody's photographed it, nobody agrees what it looks like. Yet..."],
  ['blogPost', 'trixies-graffiti-gallery', 'seoDescription',
    "Meowtown's most important unsigned artist: Trixie the calico, her mural behind the Neon Dragon Fish Market, and the pieces the crew would rather forget."],
  ['blogPost', 'whiskers-origin-story', 'seoDescription',
    "How a pampered house cat became Meowtown's most feared leader: the story of Whiskers McScruff, scruffy orange tabby in a tattered bandana."],
  ['blogPost', 'the-great-pipe-heist-of-25', 'seoDescription',
    'Word spread about a warehouse full of glowing pipes on the east side, and every crew wanted a piece. Only one gang had the guts to pull off the heist.'],
];

const client = createClient({
  projectId: '8ksun996', dataset: 'production', apiVersion: '2024-12-01',
  token: process.env.SANITY_API_TOKEN, useCdn: false, perspective: 'raw',
});
const get = (doc, path) => path.split('.').reduce((o, k) => o?.[k], doc);

async function dryRun() {
  const plan = [];
  for (const [type, slug, path, next] of EDITS) {
    if (next.length > MAX[path]) throw new Error(`${slug}: new value is ${next.length} chars (> ${MAX[path]})`);
    const doc = await client.fetch(`*[_type == $type && slug.current == $slug && !(_id in path("drafts.**"))][0]`, { type, slug });
    if (!doc) { console.log(`MISSING  ${type} ${slug}`); continue; }
    const old = get(doc, path) ?? '';
    if (old === next) { console.log(`SAME     ${slug} ${path}`); continue; }
    plan.push({ _id: doc._id, _rev: doc._rev, slug, path, old, next });
    console.log(`${slug} ${path}\n  old (${old.length}): ${old}\n  new (${next.length}): ${next}`);
  }
  fs.writeFileSync(PLAN, JSON.stringify(plan, null, 2));
  console.log(`\n${plan.length} change(s) planned. Run with --apply to write them.`);
}

async function apply() {
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  // One patch per document, so several fields on one document share its _rev.
  const byDoc = new Map();
  for (const p of plan) byDoc.set(p._id, [...(byDoc.get(p._id) || []), p]);
  let done = 0;
  for (const [id, edits] of byDoc) {
    const label = `${edits[0].slug} (${edits.map((e) => e.path).join(', ')})`;
    const draft = await client.fetch(`count(*[_id == $id])`, { id: `drafts.${id}` });
    if (draft) { console.log(`SKIP (open draft)       ${label}`); continue; }
    try {
      await client.patch(id).ifRevisionId(edits[0]._rev)
        .set(Object.fromEntries(edits.map((e) => [e.path, e.next]))).commit();
      console.log(`DONE     ${label}`); done += edits.length;
    } catch (e) {
      console.log(`SKIP (edited since dry run) ${label}: ${e.message}`);
    }
  }
  console.log(`
${done}/${plan.length} applied.`);
}

await (process.argv.includes('--apply') ? apply() : dryRun());
