// src/lib/merchant-site.ts — this site's details for src/lib/merchant-feed.mjs
// (the Merchant Center feed and the product pages' structured data).
import { SITE } from './url';

export const MERCHANT_SITE = {
  brand: 'Cats On Crack',
  url: SITE,
  productPath: '/product/',
  returnsUrl: `${SITE}/legal/returns-refunds/`,
};
