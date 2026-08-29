import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // CRITICAL: Disable ALL caching to force fresh builds
  generateBuildId: async () => {
    // Force new build ID on every deployment
    return `build-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  },
  
  // Disable static optimization for POS page
  experimental: {
    staleTimes: {
      dynamic: 0,
      static: 0,
    },
  },
  
  // Image optimization (if needed in future)
  images: {
    domains: [],
  },
  
  // IMPORTANT: Standalone output for Vercel
  output: 'standalone',
  
  // Headers to prevent caching
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
