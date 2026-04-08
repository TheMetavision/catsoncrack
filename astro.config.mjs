import { defineConfig } from 'astro/config';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://catsoncrack.co.uk',
  output: 'static',
  adapter: netlify(),
  integrations: [react(), sitemap()],
  vite: {
    ssr: {
      noExternal: ['@sanity/client', '@sanity/image-url'],
    },
  },
});
