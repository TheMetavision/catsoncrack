/**
 * populate-books.mjs (Cats On Crack)
 *
 * One-shot importer for the three Cats On Crack book covers + documents
 * into Sanity project 8ksun996.
 *
 * Usage (PowerShell, from project root C:\Users\chris\Projects\catsoncrack):
 *   $env:SANITY_WRITE_TOKEN = "sk..."
 *   node scripts/populate-books.mjs
 *
 * What it does:
 *   1. Uploads each PNG cover as a Sanity image asset
 *   2. Creates or updates a `book` document per cover with title, slug,
 *      description, seriesOrder, format='book', status='coming-soon', and
 *      coverImage (with hotspot centred on the cat group, slightly above
 *      mid-frame to favour the characters over the black title banner)
 *   3. Idempotent — re-running won't create duplicates; it patches
 *      existing docs by slug.
 *
 * COC vs Labrats differences:
 *   - 3 books instead of 4
 *   - Project ID 8ksun996, schema has `status` enum and `format` enum
 *   - All books start at status='coming-soon' (flip to 'pre-order' or
 *     'available' in Studio when the time comes)
 *   - 2:3 aspect ratio source (1360x2048) vs Labrats' 3:4
 *
 * Prereqs:
 *   @sanity/client must be available in the project root's node_modules.
 *   If running gives MODULE_NOT_FOUND: npm i -D @sanity/client
 */

import { createClient } from '@sanity/client';
import { readFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';

// ---------------------------------------------------------------------------
// Config — edit COVER_DIR if your covers live somewhere else
// ---------------------------------------------------------------------------
const PROJECT_ID = '8ksun996';
const DATASET = 'production';
const API_VERSION = '2024-01-01';

// Where the three PNGs live locally. Adjust to wherever you extracted them.
const COVER_DIR = 'C:/Users/chris/Downloads/archive (4)';

const BOOKS = [
  {
    seriesOrder: 1,
    title: 'Tales from the Alleyway',
    slug: 'tales-from-the-alleyway',
    description:
      "Whiskers' first big play for the alley. Pipe Heist of '25 in full, with the parts the Gazette couldn't print.",
    coverFile: 'hf_20260518_175524_622b0ba2-9a23-44b1-bec6-c8913ed53c2f.png',
  },
  {
    seriesOrder: 2,
    title: 'Crack-Pipe Capers',
    slug: 'crack-pipe-capers',
    description:
      'Smudge writes a crew handbook. Trixie spray-paints over half of it. Gizmo invents three things, two of them dangerous.',
    coverFile: 'hf_20260518_175102_0b576a96-e275-4447-9429-ff99db41e153.png',
  },
  {
    seriesOrder: 3,
    title: 'Long Live the King',
    slug: 'long-live-the-king',
    description:
      'A challenger from the east side. The Dumpster Throne under siege. Six cats, zero rules, one bloody-great showdown.',
    coverFile: 'hf_20260518_175407_0b0e5ca0-8fb6-4088-ae43-e5bf1e67e6b0.png',
  },
];

// Hotspot anchored slightly above centre (y = 0.42) so any square crops
// favour the cat group over the black title banner at the bottom.
const HOTSPOT = {
  x: 0.5,
  y: 0.42,
  height: 0.65,
  width: 0.7,
};
const CROP = { top: 0, bottom: 0, left: 0, right: 0 };

// ---------------------------------------------------------------------------
// Sanity client
// ---------------------------------------------------------------------------
const token = process.env.SANITY_WRITE_TOKEN;
if (!token) {
  console.error(
    '\n  Missing SANITY_WRITE_TOKEN.\n' +
      '  In PowerShell, run:\n' +
      '    $env:SANITY_WRITE_TOKEN = "sk..."\n' +
      '  (token must be for the Cats On Crack project 8ksun996, not Labrats —\n' +
      '   they are separate Sanity projects with separate tokens.)\n',
  );
  process.exit(1);
}

const client = createClient({
  projectId: PROJECT_ID,
  dataset: DATASET,
  apiVersion: API_VERSION,
  token,
  useCdn: false,
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Upload a local PNG and return its Sanity asset _id. */
async function uploadCover(localPath, filename) {
  console.log(`  ↑ uploading ${filename} …`);
  const buffer = await readFile(localPath);
  const asset = await client.assets.upload('image', buffer, {
    filename,
    contentType: 'image/png',
  });
  console.log(`    asset ready: ${asset._id}`);
  return asset._id;
}

/** Look up an existing book document by slug. Returns _id or null. */
async function findExistingBook(slug) {
  return client.fetch(
    `*[_type == "book" && slug.current == $slug][0]._id`,
    { slug },
  );
}

/** Build the full document body Sanity will store. */
function buildBookDoc(book, assetId) {
  return {
    _type: 'book',
    title: book.title,
    slug: { _type: 'slug', current: book.slug },
    description: book.description,
    seriesOrder: book.seriesOrder,
    format: 'book',
    status: 'coming-soon',
    coverImage: {
      _type: 'image',
      asset: { _type: 'reference', _ref: assetId },
      hotspot: { _type: 'sanity.imageHotspot', ...HOTSPOT },
      crop: { _type: 'sanity.imageCrop', ...CROP },
    },
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log(
    `\n  Cats On Crack book importer\n` +
      `  project: ${PROJECT_ID} / dataset: ${DATASET}\n` +
      `  covers from: ${COVER_DIR}\n`,
  );

  for (const book of BOOKS) {
    console.log(`\n▸ Vol. 0${book.seriesOrder}: ${book.title}`);

    const localPath = resolve(COVER_DIR, book.coverFile);
    let assetId;
    try {
      assetId = await uploadCover(localPath, basename(book.coverFile));
    } catch (err) {
      console.error(`  ✗ upload failed: ${err.message}`);
      console.error(`    expected file at: ${localPath}`);
      process.exitCode = 1;
      continue;
    }

    const docBody = buildBookDoc(book, assetId);
    const existingId = await findExistingBook(book.slug);

    if (existingId) {
      console.log(`  ↻ updating existing doc ${existingId}`);
      await client
        .patch(existingId)
        .set(docBody)
        .commit();
      console.log(`  ✓ updated`);
    } else {
      console.log(`  + creating new doc`);
      const created = await client.create(docBody);
      console.log(`  ✓ created ${created._id}`);
    }
  }

  console.log(
    `\n  Done. Trigger your Netlify build hook (or wait for the Sanity webhook)` +
      `\n  to publish the new /media page. All three books start at` +
      `\n  status='coming-soon' — flip to 'pre-order' or 'available' in Studio` +
      `\n  to switch the badge and unlock the order link.\n`,
  );
}

main().catch((err) => {
  console.error('\n  ✗ Fatal error:', err);
  process.exit(1);
});
