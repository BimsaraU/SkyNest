import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  // Don't fail production builds on ESLint errors; we'll address linting separately.
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Allow production builds to succeed even if there are TypeScript errors.
  // We'll tighten this back up after refactors.
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'plus.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      // Add other common image hosts if needed
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
    ],
  },
};

export default nextConfig;







