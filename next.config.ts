import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Disable caching for fresh builds
  generateBuildId: async () => {
    // Force new build ID on every deployment
    return `build-${Date.now()}-${Math.random().toString(36).substring(7)}`;
  },
  
  // Image optimization (if needed in future)
  images: {
    domains: [],
  },
  
  // Output configuration for Vercel
  output: 'standalone',
};

export default nextConfig;
