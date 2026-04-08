#!/usr/bin/env node

import { createClient } from '@sanity/client';
import { config } from 'dotenv';
config();

const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID || '8ksun996',
  dataset: process.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
});

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

const characters = [
  { name: "Whiskers McScruff", role: "The Leader", badge: "The Leader", tagline: "The Self-Proclaimed King", bio: "A pampered house cat turned chaos prophet. Escaped into the alley, found the glowing pipes, and convinced himself the resulting madness was actually a philosophy. Runs the crew on pure conviction and absolutely no strategy.", traits: ["Chaotic", "Magnetic", "Reckless"], quote: "Chaos is the cure. I've said it before. I've said it to the bins. The bins agree with me.", accent: "#ff8c00", accentDim: "rgba(255, 140, 0, 0.15)", accentGlow: "rgba(255, 140, 0, 0.35)", initials: "WM", sortOrder: 1 },
  { name: "Luna the Loner", role: "The Ghost", badge: "The Ghost", tagline: "Born Feral, Sharpened by the Streets", bio: "Silent, precise, and already three steps ahead of everyone — she stays because she chooses to, which is the most powerful thing anyone in the Alley has ever done.", traits: ["Feral", "Precise", "Quietly Loyal"], quote: "I don't have opinions about your plan. I have information.", accent: "#00d4ff", accentDim: "rgba(0, 212, 255, 0.12)", accentGlow: "rgba(0, 212, 255, 0.3)", initials: "LL", sortOrder: 2 },
  { name: "Chubby Cheeks", role: "The Muscle", badge: "The Muscle", tagline: "Ex-Show Cat, Escaped a Diet", bio: "A round, cheerful British Shorthair who found something better than a life of grooming appointments — five people who've stopped trying to improve him. Don't mistake the warmth for softness.", traits: ["Warm", "Accidental Philosopher", "Surprisingly Dangerous"], quote: "You don't just find snacks. You earn them. And by 'earn,' I mean you take them from the weak.", accent: "#ff3d3d", accentDim: "rgba(255, 61, 61, 0.12)", accentGlow: "rgba(255, 61, 61, 0.3)", initials: "CC", sortOrder: 3 },
  { name: "Gizmo the Genius", role: "The Inventor", badge: "The Inventor", tagline: "The Mad Inventor", bio: "A cross-eyed Siamese whose brain was already running too fast before the pipes. Now operating at a frequency the laws of physics can't reliably contain. The gang's best problem-solver and most reliable problem-generator — simultaneously.", traits: ["Brilliant", "Explosive", "Uncontainable"], quote: "Now, the beautiful thing about this is — oh, that's interesting. Actually, everyone move.", accent: "#ff00cc", accentDim: "rgba(255, 0, 204, 0.12)", accentGlow: "rgba(255, 0, 204, 0.3)", initials: "GG", sortOrder: 4 },
  { name: "Trixie the Trickster", role: "The Artist", badge: "The Artist", tagline: "The Graffiti Queen", bio: "A calico live wire who processes the entire world through spray paint. The Alley's visual historian, whether it wants one or not. Operates entirely in the present tense — future consequences are a theoretical concept she has chosen not to engage with.", traits: ["Kinetic", "Creative", "Consequence-Blind"], quote: "I don't make mistakes. I make unexpectedly vivid decisions.", accent: "#00ff88", accentDim: "rgba(0, 255, 136, 0.1)", accentGlow: "rgba(0, 255, 136, 0.28)", initials: "TT", sortOrder: 5 },
  { name: "Toothless Terry", role: "The Scheme Engine", badge: "The Scheme Engine", tagline: "The Kramer of the Alley", bio: "A hairless Sphynx with a wide grin, missing several teeth, and the absolute conviction of someone who has never once considered the possibility that a plan of his has failed. He always knows a guy. The guy is always problematic.", traits: ["Optimistic", "Transactional", "Indispensable"], quote: "Here's the thing about problems, pal — a problem is just a deal that hasn't been structured yet.", accent: "#f5c518", accentDim: "rgba(245, 197, 24, 0.1)", accentGlow: "rgba(245, 197, 24, 0.28)", initials: "TT", sortOrder: 6 },
];

const episodes = [
  { title: "Cats On Crack Official Trailer", videoType: "trailer", youtubeUrl: "", youtubeId: "", description: "Meet the wildest alley cats you'll ever encounter. Six cats. Zero rules. One alley.", featured: true, publishedAt: "2026-01-15T00:00:00Z" },
  { title: "The Great Pipe Heist", videoType: "episode", youtubeUrl: "", youtubeId: "", description: "When word spread about a warehouse full of glowing pipes on the east side, every crew in the city wanted a piece. But only one gang had the guts to pull off the impossible.", featured: false, publishedAt: "2026-03-01T00:00:00Z" },
  { title: "Showdown at Midnight Alley", videoType: "episode", youtubeUrl: "", youtubeId: "", description: "When rival gangs clash over territory, only the toughest survive. A firsthand account of the legendary face-off.", featured: false, publishedAt: "2026-04-01T00:00:00Z" },
];

const blogPosts = [
  { title: "The Great Pipe Heist of '25", category: "dispatches", excerpt: "When word spread about a warehouse full of glowing pipes on the east side, every crew in the city wanted a piece. But only one gang had the guts to pull off the impossible heist.", publishedAt: "2026-03-15T00:00:00Z" },
  { title: "Showdown at Midnight Alley", category: "dispatches", excerpt: "When rival gangs clash over territory, only the toughest survive. A firsthand account of the legendary face-off that changed the power dynamics of the streets forever.", publishedAt: "2026-03-01T00:00:00Z" },
  { title: "The Secret Life of Sewer Cats", category: "lore", excerpt: "Beneath the streets lies a hidden world of feline society. Our correspondent went underground to uncover the truth about the mysterious cats living below.", publishedAt: "2026-02-15T00:00:00Z" },
  { title: "Exclusive: Whiskers Speaks", category: "lore", excerpt: "In a rare moment of clarity between chaos, the self-proclaimed king of the alley sits down for an interview nobody asked for but everyone needed.", publishedAt: "2026-02-01T00:00:00Z" },
  { title: "Street Art: Trixie's Latest Masterpieces", category: "bts", excerpt: "The Graffiti Queen has been busy. A tour of Trixie's latest unauthorized gallery openings across the city's finest dumpsters and alley walls.", publishedAt: "2026-01-20T00:00:00Z" },
  { title: "Gizmo's Lab Notes: What Could Go Wrong?", category: "bts", excerpt: "A peek inside the mind of the Alley's most dangerous inventor. Spoiler: everything could go wrong. Everything has gone wrong.", publishedAt: "2026-01-05T00:00:00Z" },
];

const categories = [
  { title: "Apparel", description: "Hoodies, tees, caps — street-ready", sortOrder: 1 },
  { title: "Collectibles", description: "Stickers, pins, prints", sortOrder: 2 },
  { title: "Accessories", description: "Enamel pins, patches, mugs", sortOrder: 3 },
];

const siteSettings = {
  _id: 'siteSettings', _type: 'siteSettings',
  siteName: 'Cats On Crack',
  tagline: 'The Wildest Alley Cats You\'ll Ever Meet',
  siteDescription: 'Join Cats On Crack for wild, chaotic adventures in our animated series. Watch character videos, read the book series, and shop official merch!',
  contactEmail: 'contact@catsoncrack.com',
  youtubeChannel: 'https://www.youtube.com/@CatsOnCrackMedia',
  socialLinks: [
    { _type: 'object', _key: 'yt', platform: 'YouTube', url: 'https://www.youtube.com/@CatsOnCrackMedia' },
    { _type: 'object', _key: 'ig', platform: 'Instagram', url: 'https://www.instagram.com/catsoncrack2025' },
    { _type: 'object', _key: 'tt', platform: 'TikTok', url: 'https://www.tiktok.com/@catsoncrackmedia' },
    { _type: 'object', _key: 'x', platform: 'X', url: 'https://x.com/Cats_on_Crack_' },
  ],
  footerText: '© The Metavision 2026. All rights reserved.',
  newsletterHeadline: 'Join the Crew',
  newsletterSubtext: 'Get the latest drops, stories, and chaos delivered to your inbox.',
};

async function migrate() {
  console.log('🐱 Starting Cats On Crack content migration...\n');

  console.log('📋 Creating site settings...');
  await client.createOrReplace(siteSettings);
  console.log('   ✅ Site settings created\n');

  console.log('👥 Creating characters...');
  for (const char of characters) {
    await client.createOrReplace({
      _type: 'character', _id: `character-${slugify(char.name)}`,
      name: char.name, slug: { _type: 'slug', current: slugify(char.name) },
      role: char.role, badge: char.badge, tagline: char.tagline, bio: char.bio,
      traits: char.traits, quote: char.quote,
      accent: char.accent, accentDim: char.accentDim, accentGlow: char.accentGlow, initials: char.initials,
      sortOrder: char.sortOrder,
      seoTitle: `${char.name} — Cats On Crack`,
      seoDescription: char.bio.substring(0, 155) + '...',
    });
    console.log(`   ✅ ${char.name}`);
  }
  console.log(`   → ${characters.length} characters created\n`);

  console.log('🎬 Creating episodes...');
  for (const ep of episodes) {
    await client.createOrReplace({
      _type: 'episode', _id: `episode-${slugify(ep.title)}`,
      title: ep.title, slug: { _type: 'slug', current: slugify(ep.title) },
      videoType: ep.videoType, youtubeUrl: ep.youtubeUrl, youtubeId: ep.youtubeId,
      description: ep.description, featured: ep.featured, publishedAt: ep.publishedAt,
      seoTitle: `${ep.title} — Cats On Crack`,
      seoDescription: ep.description.substring(0, 155) + '...',
    });
    console.log(`   ✅ ${ep.title}`);
  }
  console.log(`   → ${episodes.length} episodes created\n`);

  console.log('📝 Creating blog posts...');
  for (const post of blogPosts) {
    await client.createOrReplace({
      _type: 'blogPost', _id: `post-${slugify(post.title)}`,
      title: post.title, slug: { _type: 'slug', current: slugify(post.title) },
      category: post.category, excerpt: post.excerpt,
      body: [{ _type: 'block', _key: 'placeholder', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 'span1', text: post.excerpt + ' [Full article content to be added in Sanity Studio]', marks: [] }] }],
      publishedAt: post.publishedAt,
      seoTitle: `${post.title} — The Alleyway Gazette`,
      seoDescription: post.excerpt.substring(0, 155) + '...',
    });
    console.log(`   ✅ ${post.title}`);
  }
  console.log(`   → ${blogPosts.length} blog posts created\n`);

  console.log('🏷️  Creating merch categories...');
  for (const cat of categories) {
    await client.createOrReplace({
      _type: 'category', _id: `category-${slugify(cat.title)}`,
      title: cat.title, slug: { _type: 'slug', current: slugify(cat.title) },
      description: cat.description, sortOrder: cat.sortOrder,
    });
    console.log(`   ✅ ${cat.title}`);
  }
  console.log(`   → ${categories.length} categories created\n`);

  console.log('═══════════════════════════════════════════');
  console.log('🎉 Migration complete!');
  console.log(`   ${characters.length} characters`);
  console.log(`   ${episodes.length} episodes`);
  console.log(`   ${blogPosts.length} blog posts`);
  console.log(`   ${categories.length} categories`);
  console.log(`   1 site settings document`);
  console.log('═══════════════════════════════════════════');
}

migrate().catch((err) => { console.error('❌ Migration failed:', err); process.exit(1); });
