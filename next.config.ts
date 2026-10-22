import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // The PDF routes read the brand fonts from disk: ship them with those functions.
  outputFileTracingIncludes: {
    '/api/**': ['./public/fonts/**/*.ttf'],
  },
  experimental: {
    serverActions: {
      // CV PDF import (4 MB max, Vercel refuses bodies over 4.5 MB).
      bodySizeLimit: '4.5mb',
    },
  },
  turbopack: {
    rules: {
      '*.css': {
        loaders: ['@tailwindcss/turbopack'],
        as: '*.css',
      },
    },
  },
};

export default nextConfig;
