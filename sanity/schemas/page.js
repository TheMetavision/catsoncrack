import {defineType, defineField} from 'sanity'
import {DocumentIcon} from '@sanity/icons'

export default defineType({
  name: 'page',
  title: 'Page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Page Title',
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
      name: 'pageType',
      type: 'string',
      options: {
        list: [
          {title: 'Home', value: 'home'},
          {title: 'Characters', value: 'characters'},
          {title: 'Media', value: 'media'},
          {title: 'Merch', value: 'merch'},
          {title: 'Blog', value: 'blog'},
          {title: 'Contact', value: 'contact'},
          {title: 'About / World', value: 'about'},
          {title: 'Legal', value: 'legal'},
        ],
      },
    }),
    defineField({
      name: 'heroImage',
      title: 'Hero / Banner Image',
      type: 'image',
      options: {hotspot: true},
      description: 'Main hero image at the top of the page',
    }),
    defineField({
      name: 'heroTitle',
      type: 'string',
      description: 'Override the default page title in the hero section',
    }),
    defineField({
      name: 'heroSubtitle',
      type: 'string',
    }),
    defineField({
      name: 'introText',
      type: 'text',
      rows: 3,
      description: 'Paragraph below the hero heading',
    }),
    defineField({
      name: 'sectionImages',
      type: 'array',
      description:
        'Additional images for specific page sections. Use the section ID to map to template slots.',
      of: [
        {
          type: 'object',
          fields: [
            {
              name: 'sectionId',
              title: 'Section Identifier',
              type: 'string',
              description: 'e.g. "world-map", "book-promo", "characters-promo"',
            },
            {name: 'image', type: 'image', options: {hotspot: true}},
            {name: 'alt', title: 'Alt Text', type: 'string'},
          ],
        },
      ],
    }),
    defineField({
      name: 'body',
      title: 'Page Body',
      type: 'array',
      description: 'Rich text body content (used for legal pages, about pages, etc.)',
      of: [
        {
          type: 'block',
          styles: [
            {title: 'Normal', value: 'normal'},
            {title: 'H2', value: 'h2'},
            {title: 'H3', value: 'h3'},
            {title: 'Quote', value: 'blockquote'},
          ],
          lists: [
            {title: 'Bulleted list', value: 'bullet'},
            {title: 'Numbered list', value: 'number'},
          ],
          marks: {
            decorators: [
              {title: 'Strong', value: 'strong'},
              {title: 'Italic', value: 'em'},
              {title: 'Code', value: 'code'},
              {title: 'Underline', value: 'underline'},
              {title: 'Strike', value: 'strike-through'},
            ],
            annotations: [
              {
                name: 'link',
                type: 'object',
                fields: [
                  {
                    name: 'href',
                    title: 'Link',
                    type: 'url',
                    description: 'A valid web, email, phone, or relative link.',
                    validation: (rule) =>
                      rule.uri({
                        scheme: ['http', 'https', 'tel', 'mailto'],
                        allowRelative: true,
                      }),
                  },
                ],
              },
            ],
          },
        },
        {type: 'image', options: {hotspot: true}},
      ],
    }),
    defineField({
      name: 'metaDescription',
      type: 'string',
      description: 'SEO meta description for this page',
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'pageType',
      media: 'heroImage',
    },
  },
})
