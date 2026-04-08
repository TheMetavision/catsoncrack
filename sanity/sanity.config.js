import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { schemaTypes } from './schemas';

export default defineConfig({
  name: 'catsoncrack',
  title: 'Cats On Crack CMS',
  projectId: '8ksun996',
  dataset: 'production',
  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem().title('Site Settings').child(S.document().schemaType('siteSettings').documentId('siteSettings')),
            S.divider(),
            S.documentTypeListItem('character').title('Characters'),
            S.documentTypeListItem('episode').title('Episodes & Videos'),
            S.documentTypeListItem('blogPost').title('Blog Posts'),
            S.divider(),
            S.documentTypeListItem('product').title('Products'),
            S.documentTypeListItem('category').title('Categories'),
            S.divider(),
            S.documentTypeListItem('faq').title('FAQs'),
            S.documentTypeListItem('page').title('Pages'),
          ]),
    }),
  ],
  schema: { types: schemaTypes },
});
