import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  cacheComponents: true,
  poweredByHeader: false,
  // Security headers on every response. Framing is allowed for our own pages only (the CV
  // preview shows its PDF in an iframe).
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self'; base-uri 'self'",
          },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
    ];
  },
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
