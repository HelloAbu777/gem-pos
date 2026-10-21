import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  compress:        true,
  poweredByHeader: false,
  output:          'standalone',

  images: { domains: [] },

  // Cache strategiyasi: statik assetlar — doimiy, API — hech qachon kesh emas
  async headers() {
    return [
      // Statik JS/CSS/rasmlar — 1 yilga kesh (immutable)
      {
        source: '/_next/static/(.*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // API route'lari — kesh yo'q (real vaqt ma'lumot)
      {
        source: '/api/(.*)',
        headers: [{ key: 'Cache-Control', value: 'no-store, no-cache' }],
      },
      // Sahifalar — 10 soniya stale-while-revalidate (tezkor yuklash)
      {
        source: '/((?!api|_next/static|_next/image|favicon).*)',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }],
      },
    ];
  },
};

export default nextConfig;
