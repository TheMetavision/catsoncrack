import { createClient } from '@sanity/client';
import imageUrlBuilder from '@sanity/image-url';

export const client = createClient({
  projectId: import.meta.env.SANITY_PROJECT_ID || '8ksun996',
  dataset: import.meta.env.SANITY_DATASET || 'production',
  apiVersion: '2024-01-01',
  useCdn: true,
});

const builder = imageUrlBuilder(client);

export function urlFor(source: any) {
  return builder.image(source);
}

// ─── Characters ───────────────────────────────────────────────
export async function getAllCharacters() {
  return client.fetch(`
    *[_type == "character"] | order(sortOrder asc) {
      _id, name, "slug": slug.current, role, badge, tagline, bio, extendedBio,
      traits, quote, "accent": coalesce(accentColor, accent), accentDim, accentGlow, initials,
      portrait, galleryImages, sortOrder, seoTitle, seoDescription
    }
  `);
}

export async function getCharacterBySlug(slug: string) {
  return client.fetch(`
    *[_type == "character" && slug.current == $slug][0] {
      _id, name, "slug": slug.current, role, badge, tagline, bio, extendedBio,
      traits, quote, "accent": coalesce(accentColor, accent), accentDim, accentGlow, initials,
      portrait, galleryImages, seoTitle, seoDescription
    }
  `, { slug });
}

// ─── Episodes / Media ─────────────────────────────────────────
export async function getAllEpisodes() {
  return client.fetch(`
    *[_type == "episode"] | order(publishedAt desc) {
      _id, title, "slug": slug.current, videoType, season, episodeNumber,
      youtubeUrl, youtubeId, thumbnail, description,
      "featuredCharacters": featuredCharacters[]->{ name, "slug": slug.current, portrait },
      publishedAt, duration, featured, seoTitle, seoDescription
    }
  `);
}

export async function getFeaturedEpisodes() {
  return client.fetch(`
    *[_type == "episode" && featured == true] | order(publishedAt desc)[0...4] {
      _id, title, "slug": slug.current, videoType, youtubeUrl, youtubeId,
      thumbnail, description, publishedAt, duration
    }
  `);
}

// ─── Blog Posts (Alleyway Gazette) ────────────────────────────
export async function getAllBlogPosts() {
  return client.fetch(`
    *[_type == "blogPost"] | order(publishedAt desc) {
      _id, title, "slug": slug.current, category, excerpt, body, featuredImage,
      "relatedCharacters": relatedCharacters[]->{ name, "slug": slug.current },
      publishedAt, seoTitle, seoDescription
    }
  `);
}

export async function getBlogPostBySlug(slug: string) {
  return client.fetch(`
    *[_type == "blogPost" && slug.current == $slug][0] {
      _id, title, "slug": slug.current, category, excerpt, body, featuredImage,
      "relatedCharacters": relatedCharacters[]->{ name, "slug": slug.current, portrait },
      publishedAt, seoTitle, seoDescription
    }
  `, { slug });
}

// ─── Products ─────────────────────────────────────────────────
export async function getAllProducts() {
  return client.fetch(`
    *[_type == "product"] | order(name asc) {
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
    *[_type == "product" && slug.current == $slug][0] {
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
    *[_type == "product" && featured == true] | order(name asc)[0...6] {
      _id, name, "slug": slug.current, price, images,
      "category": category->{ title, "slug": slug.current }
    }
  `);
}

// ─── Categories ───────────────────────────────────────────────
export async function getAllCategories() {
  return client.fetch(`
    *[_type == "category"] | order(sortOrder asc) {
      _id, title, "slug": slug.current, description, image, sortOrder
    }
  `);
}

export async function getProductsByCategory(categorySlug: string) {
  return client.fetch(`
    *[_type == "product" && category->slug.current == $categorySlug] | order(name asc) {
      _id, name, "slug": slug.current, price, compareAtPrice, images, featured
    }
  `, { categorySlug });
}

// ─── FAQs ─────────────────────────────────────────────────────
export async function getAllFaqs() {
  return client.fetch(`*[_type == "faq"] | order(order asc) { _id, question, answer, category, order }`);
}

// ─── Pages ────────────────────────────────────────────────────
export async function getPageBySlug(slug: string) {
  return client.fetch(`
    *[_type == "page" && slug.current == $slug][0] {
      _id, title, "slug": slug.current, body, noIndex, seoTitle, seoDescription
    }
  `, { slug });
}

// ─── Site Settings ────────────────────────────────────────────
export async function getSiteSettings() {
  return client.fetch(`
    *[_type == "siteSettings"][0] {
      siteName, tagline, siteDescription, contactEmail, youtubeChannel,
      socialLinks, announcementBar, logo, footerLogo, footerText,
      newsletterHeadline, newsletterSubtext
    }
  `);
}
