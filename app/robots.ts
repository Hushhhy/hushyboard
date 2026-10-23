import type { MetadataRoute } from 'next';

// Private app: nothing to index, for any crawler.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: '*', disallow: '/' } };
}
