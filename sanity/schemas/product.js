import {defineType, defineField} from 'sanity'
import {BasketIcon} from '@sanity/icons'

export default defineType({
  name: 'product',
  title: 'Product',
  type: 'document',
  icon: BasketIcon,
  fields: [
    defineField({
      name: 'name',
      title: 'Product Name',
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
      name: 'description',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'price',
      type: 'number',
      description: 'Price in GBP',
    }),
    defineField({
      name: 'status',
      type: 'string',
      options: {
        list: [
          {title: 'Coming Soon', value: 'coming-soon'},
          {title: 'Available', value: 'available'},
          {title: 'Sold Out', value: 'sold-out'},
        ],
      },
      initialValue: 'coming-soon',
    }),
    defineField({
      name: 'displayOrder',
      type: 'number',
      description: 'Controls sort order on shop page (lower numbers first)',
    }),
  ],
  orderings: [
    {
      title: 'Display Order',
      name: 'displayOrderAsc',
      by: [{field: 'displayOrder', direction: 'asc'}],
    },
  ],
  preview: {
    select: {
      title: 'name',
      subtitle: 'status',
    },
  },
})
