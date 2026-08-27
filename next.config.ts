import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  
  // Image optimization (if needed in future)
  images: {
    domains: [],
  },
  
  // Output configuration for Vercel
  output: 'standalone',
};

export default nextConfig;
