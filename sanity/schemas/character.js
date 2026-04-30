import {defineType, defineField} from 'sanity'
import {UserIcon} from '@sanity/icons'

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
      options: {source: 'name', maxLength: 96},
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
      of: [{type: 'string'}],
      description: 'e.g. ["Chaotic", "Magnetic", "Reckless"]',
    }),
    defineField({
      name: 'image',
      title: 'Character Image',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'characterType',
      type: 'string',
      description: 'Used for filtering on characters page',
      options: {
        list: [
          {title: 'Hero', value: 'hero'},
          {title: 'Villain', value: 'villain'},
          {title: 'Creature', value: 'creature'},
          {title: 'Rival', value: 'rival'},
        ],
      },
    }),
    defineField({
      name: 'faction',
      type: 'string',
      description: 'Biker Babies: separates heroes from rivals',
      options: {
        list: [
          {title: 'Heroes', value: 'heroes'},
          {title: 'Villains', value: 'villains'},
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
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'role',
      media: 'image',
    },
  },
})
