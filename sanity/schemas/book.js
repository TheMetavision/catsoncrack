import {defineType, defineField} from 'sanity'
import {BookIcon} from '@sanity/icons'

export default defineType({
  name: 'book',
  title: 'Book',
  type: 'document',
  icon: BookIcon,
  fields: [
    defineField({
      name: 'title',
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
      rows: 4,
    }),
    defineField({
      name: 'coverImage',
      type: 'image',
      options: {hotspot: true},
    }),
    defineField({
      name: 'seriesOrder',
      type: 'number',
      description: 'Position in the series (1, 2, 3...)',
    }),
    defineField({
      name: 'format',
      type: 'string',
      options: {
        list: [
          {title: 'Book', value: 'book'},
          {title: 'Comic', value: 'comic'},
          {title: 'Graphic Novel', value: 'graphic-novel'},
        ],
      },
      initialValue: 'book',
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: [
          {title: 'Available', value: 'available'},
          {title: 'Coming Soon', value: 'coming-soon'},
          {title: 'Pre-Order', value: 'pre-order'},
        ],
      },
      initialValue: 'available',
    }),
    defineField({
      name: 'orderUrl',
      title: 'Order URL',
      type: 'url',
      description: 'Link to Amazon, shop page, or other purchase URL',
      validation: (rule) => rule.uri({scheme: ['http', 'https']}),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published Date',
      type: 'datetime',
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'format',
      media: 'coverImage',
    },
  },
})
