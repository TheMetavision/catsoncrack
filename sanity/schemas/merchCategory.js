import {defineType, defineField} from 'sanity'
import {TagIcon} from '@sanity/icons'

export default defineType({
  name: 'merchCategory',
  title: 'Merch Category',
  type: 'document',
  icon: TagIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Category Name',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      type: 'slug',
      options: {source: 'title', maxLength: 96},
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'description',
      type: 'text',
      rows: 2,
    }),
    defineField({
      name: 'icon',
      title: 'Icon SVG',
      type: 'text',
      rows: 3,
      description: 'Optional inline SVG markup for category icon',
    }),
    defineField({
      name: 'displayOrder',
      type: 'number',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug.current',
    },
  },
})
