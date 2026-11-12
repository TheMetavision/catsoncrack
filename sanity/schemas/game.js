import { defineType, defineField } from 'sanity'
import { PlayIcon } from '@sanity/icons'

/**
 * game
 * ------------------------------------------------------------------
 * Private record of a brand game and its art. Studio only: never
 * queried, rendered or listed in the sitemap on the public website.
 * ------------------------------------------------------------------
 */
export default defineType({
  name: 'game',
  title: 'Game',
  type: 'document',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'e.g. "Junkyard Racers"',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Game URL',
      type: 'url',
      description: 'The live game page',
    }),
    defineField({
      name: 'characters',
      title: 'Characters',
      type: 'array',
      of: [{ type: 'reference', to: [{ type: 'character' }] }],
      validation: (rule) => rule.unique(),
    }),
    defineField({
      name: 'gameArt',
      title: 'Game art (private)',
      type: 'array',
      description: 'Working and promo images for this game. Not shown on the website.',
      of: [{ type: 'galleryImage' }],
      options: { layout: 'grid' },
    }),
  ],
  preview: {
    select: { title: 'title', subtitle: 'url', media: 'gameArt.0.asset' },
  },
})
