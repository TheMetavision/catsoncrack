import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID || '8ksun996',
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: false, // SSG builds at build-time — CDN adds staleness without benefit
  perspective: 'published', // forces API to return only published docs, never drafts
  token: import.meta.env.SANITY_API_TOKEN,
});

const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  return builder.image(source);
}

// Draft filter applied to every list/single fetch as a belt-and-braces guard
// in addition to the `perspective: 'published'` flag on the client itself.
const NOT_DRAFT = `!(_id in path('drafts.**'))`;

// ─── Characters ───────────────────────────────────────────────
export async function getAllCharacters() {
  return client.fetch(`
    *[_type == "character" && ${NOT_DRAFT}] | order(sortOrder asc) {
      _id, name, "slug": slug.current, role, badge, tagline, bio, extendedBio,
      traits, quote, "accent": coalesce(accentColor, accent), accentDim, accentGlow, initials,
      portrait, galleryImages, sortOrder, seoTitle, seoDescription
    }
  `);
}

export async function getCharacterBySlug(slug: string) {
  return client.fetch(`
    *[_type == "character" && slug.current == $slug && ${NOT_DRAFT}][0] {
      _id, name, "slug": slug.current, role, badge, tagline, bio, extendedBio,
      traits, quote, "accent": coalesce(accentColor, accent), accentDim, accentGlow, initials,
      portrait, galleryImages, seoTitle, seoDescription
    }
  `, { slug });
}

// ─── Episodes / Media ─────────────────────────────────────────
export async function getAllEpisodes() {
  return client.fetch(`
    *[_type == "episode" && ${NOT_DRAFT}] | order(publishedAt desc) {
      _id, title, "slug": slug.current, videoType, season, episodeNumber,
      youtubeUrl, youtubeId, thumbnail, description,
      "featuredCharacters": featuredCharacters[]->{ name, "slug": slug.current, portrait },
      publishedAt, duration, featured, seoTitle, seoDescription
    }
  `);
}

export async function getFeaturedEpisodes() {
  return client.fetch(`
    *[_type == "episode" && featured == true && ${NOT_DRAFT}] | order(publishedAt desc)[0...4] {
      _id, title, "slug": slug.current, videoType, youtubeUrl, youtubeId,
      thumbnail, description, publishedAt, duration
    }
  `);
}

// ─── Books ────────────────────────────────────────────────────
// Sort by seriesOrder asc, with _createdAt asc as tiebreaker so two books
// sharing the same seriesOrder fall back to creation order. coverImage is
// projected as the full image object (hotspot + crop intact) so urlFor()
// can do responsive image transforms on the frontend.
export async function getAllBooks() {
  return client.fetch(`
    *[_type == "book" && ${NOT_DRAFT}] | order(seriesOrder asc, _createdAt asc) {
      _id, title, "slug": slug.current,
      description, coverImage,
      seriesOrder, format, status, orderUrl, publishedAt
    }
  `);
}

// ─── Blog Posts (Alleyway Gazette) ────────────────────────────
// NOTE: The schema field is `tag`, not `category`. The frontend reads
// `post.category`. We coalesce both into a unified `category` field so
// the frontend stays stable regardless of which field the doc was authored
// with — same pattern as the character `accent`/`accentColor` migration.
//
// `featuredImageUrl` is projected directly via `.asset->url` so the
// frontend can drop the string straight into an <img src>. We also
// surface the asset alt + dimensions for proper CLS-safe rendering.
export async function getAllBlogPosts() {
  return client.fetch(`
    *[_type == "blogPost" && ${NOT_DRAFT}] | order(publishedAt desc) {
      _id, title, "slug": slug.current,
      "category": coalesce(category, tag),
      excerpt, body, featuredImage,
      "featuredImageUrl": featuredImage.asset->url,
      "featuredImageAlt": coalesce(featuredImage.alt, title),
      "featuredImageWidth": featuredImage.asset->metadata.dimensions.width,
      "featuredImageHeight": featuredImage.asset->metadata.dimensions.height,
      "relatedCharacters": relatedCharacters[]->{ name, "slug": slug.current },
      publishedAt, readTime, seoTitle, seoDescription
    }
  `);
}

export async function getBlogPostBySlug(slug: string) {
  return client.fetch(`
    *[_type == "blogPost" && slug.current == $slug && ${NOT_DRAFT}][0] {
      _id, title, "slug": slug.current,
      "category": coalesce(category, tag),
      excerpt, body, featuredImage,
      "featuredImageUrl": featuredImage.asset->url,
      "featuredImageAlt": coalesce(featuredImage.alt, title),
      "featuredImageWidth": featuredImage.asset->metadata.dimensions.width,
      "featuredImageHeight": featuredImage.asset->metadata.dimensions.height,
      "relatedCharacters": relatedCharacters[]->{ name, "slug": slug.current, portrait },
      publishedAt, readTime, seoTitle, seoDescription
    }
  `, { slug });
}

// ─── Products ─────────────────────────────────────────────────
export async function getAllProducts() {
  return client.fetch(`
    *[_type == "product" && ${NOT_DRAFT}] | order(name asc) {
      _id, name, "slug": slug.current,
      "category": category->{ title, "slug": slug.current },
      "featuredCharacter": featuredCharacter->{ name, "slug": slug.current },
      description, designStory, price, compareAtPrice, images,
      printfulVariants, material, featured, seoTitle, seoDescription
    }
  `);
}

export async function getProductBySlug(slug: string) {
  return client.fetch(`
    *[_type == "product" && slug.current == $slug && ${NOT_DRAFT}][0] {
      _id, name, "slug": slug.current,
      "category": category->{ title, "slug": slug.current },
      "featuredCharacter": featuredCharacter->{ name, "slug": slug.current, portrait },
      description, designStory, price, compareAtPrice, images,
      printfulVariants, material, featured, seoTitle, seoDescription
    }
  `, { slug });
}

export async function getFeaturedProducts() {
  return client.fetch(`
    *[_type == "product" && featured == true && ${NOT_DRAFT}] | order(name asc)[0...6] {
      _id, name, "slug": slug.current, price, images,
      "category": category->{ title, "slug": slug.current }
    }
  `);
}

// ─── Categories ───────────────────────────────────────────────
export async function getAllCategories() {
  return client.fetch(`
    *[_type == "category" && ${NOT_DRAFT}] | order(sortOrder asc) {
      _id, title, "slug": slug.current, description, image, sortOrder
    }
  `);
}

export async function getProductsByCategory(categorySlug: string) {
  return client.fetch(`
    *[_type == "product" && category->slug.current == $categorySlug && ${NOT_DRAFT}] | order(name asc) {
      _id, name, "slug": slug.current, price, compareAtPrice, images, featured
    }
  `, { categorySlug });
}

// ─── FAQs ─────────────────────────────────────────────────────
export async function getAllFaqs() {
  return client.fetch(`*[_type == "faq" && ${NOT_DRAFT}] | order(order asc) { _id, question, answer, category, order }`);
}

// ─── Pages ────────────────────────────────────────────────────
export async function getPageBySlug(slug: string) {
  return client.fetch(`
    *[_type == "page" && slug.current == $slug && ${NOT_DRAFT}][0] {
      _id, title, "slug": slug.current, body, noIndex, seoTitle, seoDescription
    }
  `, { slug });
}

// ─── Site Settings ────────────────────────────────────────────
export async function getSiteSettings() {
  return client.fetch(`
    *[_type == "siteSettings" && ${NOT_DRAFT}][0] {
      siteName, tagline, siteDescription, contactEmail, youtubeChannel,
      socialLinks, announcementBar, logo, footerLogo, footerText,
      newsletterHeadline, newsletterSubtext
    }
  `);
}

// ─── Theme audio (added 2026-04-30 for the IP brand theme-tune feature build #4/4 — FINAL) ───
// Pinned to _id == "siteSettings" so it only ever reads the canonical singleton.
// Returns null URL if the singleton has no MP3 uploaded yet OR if themeEnabled
// is explicitly false — both render-blocking states the CocChaosButton
// component safely handles by rendering nothing.
//
// COC-specific notes:
//   - 5 themeAudio fields only (no engineSfxUrl unlike BB — Cats On Crack
//     has no SFX prologue per Arc spec I.2)
//   - `enabled: result?.enabled !== false` — null treated as enabled (kill
//     switch must be EXPLICIT false to disable). Same fallback pattern as
//     BB/LR — handles the singleton-initialValue gap (Sanity initialValue
//     only fires on doc creation, not on schema-added fields to existing
//     singletons, so themeEnabled lands null on first deploy until Alan
//     opens Studio and saves explicitly).
export interface ThemeAudio {
  audioUrl: string | null;
  trackTitle: string | null;
  trackArtist: string | null;
  enabled: boolean;
}
export async function getThemeAudio(): Promise<ThemeAudio> {
  const result = await client.fetch(`*[_type == "siteSettings" && _id == "siteSettings"][0]{
    "audioUrl": themeAudioFile.asset->url,
    "trackTitle": themeTrackTitle,
    "trackArtist": themeTrackArtist,
    "enabled": themeEnabled
  }`);
  return {
    audioUrl: result?.audioUrl ?? null,
    trackTitle: result?.trackTitle ?? 'Cats On Crack Main Theme',
    trackArtist: result?.trackArtist ?? '',
    enabled: result?.enabled !== false, // null treated as enabled (kill switch must be explicit false to disable)
  };
}
