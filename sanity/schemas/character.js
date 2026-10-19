import { defineType, defineField } from 'sanity'
import { UserIcon } from '@sanity/icons'

export default defineType({
  name: 'character',
  title: 'Character',
  type: 'document',
  icon: UserIcon,
  fields: [
    defineField({
      name: 'name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: { source: 'name', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'role',
      title: 'Role / Title',
      type: 'string',
      description: 'e.g. "The Chaos Agent", "Team Leader & Tactician"',
    }),
    defineField({
      name: 'age',
      type: 'string',
      description: 'e.g. "Age 13" — leave blank if not applicable',
    }),
    defineField({
      name: 'tagline',
      type: 'string',
      description: 'Short one-liner description',
    }),
    defineField({
      name: 'bio',
      title: 'Biography',
      type: 'text',
      rows: 4,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'quote',
      title: 'Signature Quote',
      type: 'string',
    }),
    defineField({
      name: 'traits',
      title: 'Character Traits',
      type: 'array',
      of: [{ type: 'string' }],
      description: 'e.g. ["Chaotic", "Magnetic", "Reckless"]',
    }),
    defineField({
      name: 'image',
      title: 'Character Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'characterSheet',
      title: 'Character Sheet / Turnaround',
      type: 'image',
      options: { hotspot: true },
      description:
        'Multi-angle turnaround or model sheet. Used alongside the character image to build this character\u2019s Higgsfield reference element. Production reference only: not shown on the site.',
    }),
    defineField({
      name: 'characterType',
      type: 'string',
      description: 'Used for filtering on characters page',
      options: {
        list: [
          { title: 'Hero', value: 'hero' },
          { title: 'Villain', value: 'villain' },
          { title: 'Creature', value: 'creature' },
          { title: 'Rival', value: 'rival' },
        ],
      },
    }),
    defineField({
      name: 'faction',
      type: 'string',
      description: 'Biker Babies: separates heroes from rivals',
      options: {
        list: [
          { title: 'Heroes', value: 'heroes' },
          { title: 'Villains', value: 'villains' },
        ],
      },
    }),
    defineField({
      name: 'coreSix',
      title: 'Core Character',
      type: 'boolean',
      description: 'Fuglys/COC: appears in hero carousel and core crew section',
      initialValue: false,
    }),
    defineField({
      name: 'accentColor',
      title: 'Accent Colour',
      type: 'string',
      description: 'COC: per-character hex colour e.g. "#ff8c00"',
    }),
    defineField({
      name: 'displayOrder',
      type: 'number',
      description: 'Controls sort order on characters page and carousels',
    }),

    // ─── Data-only fields (2026-10-20) ───────────────────────────────
    // On 20-21 character documents from the original import but in no deployed
    // schema. Declared so Studio shows them rather than as unknown fields.
    // /the-alley-squad still reads accent, initials, externalImageUrl and sortOrder.
    defineField({ name: 'accent', title: 'Accent (old field)', type: 'string', description: 'Legacy. /the-alley-squad uses Accent Colour first, then this.', hidden: false }),
    defineField({ name: 'initials', title: 'Initials', type: 'string', description: 'Legacy. Shown on /the-alley-squad when there is no image.', hidden: false }),
    defineField({ name: 'sortOrder', title: 'Sort Order (old field)', type: 'number', description: 'Legacy. /the-alley-squad sorts by this.', hidden: false }),
    defineField({ name: 'tag', title: 'Tag', type: 'string', description: 'Legacy', hidden: false }),
    defineField({ name: 'externalImageUrl', title: 'External Image URL', type: 'url', description: 'Legacy. /the-alley-squad uses it only when there is no Character Image.', hidden: false }),
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      media: 'image',
    },
  },
})