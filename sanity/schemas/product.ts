import { defineType, defineField } from 'sanity';

/**
 * Cats On Crack — NESTED product schema.
 *
 * One product document = one DESIGN, holding a variants[] array where each
 * entry is a garment type with its own basePrice + per-size sizePrices[]
 * ladder, colours, printfulVariants[] (the size×colour×syncVariantId matrix),
 * and colourImages[]. This matches what sync-products.mjs writes and what the
 * Wyrmfuel storefront proved in production.
 *
 * Editorial extras kept from COC's previous (flat) schema so the front end and
 * Arc's workflow stay intact: featuredCharacter, designStory, category, SEO.
 *
 * DEPLOY: this is a Studio schema. COC has a local Studio, so drop this in
 * schemaTypes/ (replacing the old flat product.ts), then `npx sanity@latest
 * schema deploy` (or it deploys on the next Studio build). Do NOT use the MCP
 * deploy_schema tool — it refuses Studio-managed workspaces, and using it would
 * diverge the deployed schema from your source.
 */
export default defineType({
  name: 'product',
  title: 'Product (Design)',
  type: 'document',
  icon: () => '🐱',
  fields: [
    defineField({ name: 'name', title: 'Design Name', type: 'string', validation: (r) => r.required() }),
    defineField({
      name: 'slug', title: 'Slug', type: 'slug',
      options: { source: 'name', maxLength: 96 }, validation: (r) => r.required(),
    }),
    defineField({
      name: 'heroImage', title: 'Hero Image', type: 'image', options: { hotspot: true },
      description: 'Primary design artwork (t-shirt mockup by default)',
    }),
    defineField({
      name: 'accent', title: 'Accent Colour', type: 'string',
      description: 'Hex colour for UI accents, e.g. #FF2D9B',
      validation: (r) => r.regex(/^#[0-9a-fA-F]{6}$/, { name: 'hex colour' }),
    }),
    defineField({ name: 'tagline', title: 'Tagline', type: 'string' }),
    defineField({ name: 'backstory', title: 'Backstory', type: 'text', rows: 3 }),
    defineField({ name: 'care', title: 'Care Instructions', type: 'string' }),

    /* ── COC editorial extras (carried over from the flat schema) ── */
    defineField({
      name: 'designStory', title: 'Design Story', type: 'text', rows: 4,
      description: 'Longer narrative for the PDP',
    }),
    defineField({
      name: 'featuredCharacter', title: 'Featured Character', type: 'reference',
      to: [{ type: 'character' }],
    }),
    defineField({
      name: 'category', title: 'Category', type: 'reference',
      to: [{ type: 'merchCategory' }],
      description: 'Optional primary category grouping',
    }),

    /* ── Variants (garment types) ── */
    defineField({
      name: 'variants', title: 'Product Variants', type: 'array',
      of: [
        {
          type: 'object', name: 'variant', title: 'Variant',
          fields: [
            defineField({
              name: 'productType', title: 'Product Type', type: 'string',
              options: {
                list: [
                  { title: 'T-Shirt', value: 'tshirt' },
                  { title: 'Hoodie', value: 'hoodie' },
                  { title: 'Vest Tank', value: 'tank' },
                  { title: 'Long Sleeve', value: 'longsleeve' },
                  { title: 'Socks', value: 'socks' },
                  { title: '20oz Tumbler', value: 'tumbler' },
                  { title: '16oz Can Glass', value: 'glass' },
                  { title: 'Cap', value: 'cap' },
                  { title: 'Mug', value: 'mug' },
                ],
              },
              validation: (r) => r.required(),
            }),
            defineField({ name: 'label', title: 'Display Label', type: 'string' }),
            defineField({ name: 'thumbnail', title: 'Mockup Image', type: 'image', options: { hotspot: true } }),
            defineField({ name: 'printfulImageUrl', title: 'Printful CDN URL', type: 'url', description: 'Default mockup (first colour)' }),
            defineField({ name: 'basePrice', title: 'Base Price (£)', type: 'number', validation: (r) => r.required().positive() }),
            defineField({
              name: 'sizes', title: 'Available Sizes', type: 'array', of: [{ type: 'string' }],
              options: { list: ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL', 'One Size', '16 oz', '16 oz With Lid & Straw', '20 oz', '11 oz', '15 oz'] },
            }),
            defineField({ name: 'colours', title: 'Available Colours', type: 'array', of: [{ type: 'string' }] }),
            defineField({
              name: 'sizePrices', title: 'Size-based Pricing', type: 'array',
              description: 'Per-size pricing (larger sizes cost more)',
              of: [{
                type: 'object', name: 'sizePrice',
                fields: [
                  defineField({ name: 'size', title: 'Size', type: 'string' }),
                  defineField({ name: 'price', title: 'Price (£)', type: 'number' }),
                ],
                preview: { select: { title: 'size', subtitle: 'price' }, prepare: ({ title, subtitle }) => ({ title, subtitle: `£${subtitle}` }) },
              }],
            }),
            defineField({ name: 'backImageUrl', title: 'Back Mockup URL', type: 'url' }),
            defineField({
              name: 'colourImages', title: 'Colour Mockup Images', type: 'array',
              of: [{
                type: 'object', name: 'colourImage',
                fields: [
                  defineField({ name: 'colour', title: 'Colour Name', type: 'string' }),
                  defineField({ name: 'imageUrl', title: 'Mockup URL', type: 'url' }),
                  defineField({ name: 'backImageUrl', title: 'Back Mockup URL', type: 'url' }),
                ],
                preview: { select: { title: 'colour', subtitle: 'imageUrl' } },
              }],
            }),
            defineField({ name: 'stripePriceId', title: 'Stripe Price ID', type: 'string', description: 'Vestigial — checkout uses ad-hoc price_data, not Price IDs. Leave blank.' }),
            defineField({ name: 'printfulVariantId', title: 'Printful Variant ID', type: 'string' }),
            defineField({
              name: 'printfulVariants', title: 'Printful Variant Matrix', type: 'array',
              description: 'size × colour × syncVariantId — written by the sync script; drives fulfilment',
              of: [{
                type: 'object', name: 'printfulVariant',
                fields: [
                  defineField({ name: 'size', title: 'Size', type: 'string' }),
                  defineField({ name: 'colour', title: 'Colour', type: 'string' }),
                  defineField({ name: 'syncVariantId', title: 'Printful Sync Variant ID', type: 'string' }),
                ],
                preview: { select: { title: 'colour', subtitle: 'size' } },
              }],
            }),
          ],
          preview: { select: { title: 'label', subtitle: 'productType', media: 'thumbnail' } },
        },
      ],
    }),

    defineField({ name: 'printfulProductId', title: 'Printful Product ID', type: 'string' }),
    defineField({ name: 'active', title: 'Active', type: 'boolean', initialValue: true }),
    defineField({ name: 'sortOrder', title: 'Sort Order', type: 'number', initialValue: 0 }),
    defineField({ name: 'seoTitle', title: 'SEO Title', type: 'string' }),
    defineField({ name: 'seoDescription', title: 'SEO Description', type: 'text', rows: 2 }),
  ],
  orderings: [
    { title: 'Sort Order', name: 'sortOrder', by: [{ field: 'sortOrder', direction: 'asc' }] },
    { title: 'Name A-Z', name: 'nameAsc', by: [{ field: 'name', direction: 'asc' }] },
  ],
  preview: { select: { title: 'name', subtitle: 'tagline', media: 'heroImage' } },
});
