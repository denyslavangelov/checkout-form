import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    // Make environment variables available to the client
    NODE_ENV: process.env.NODE_ENV,
    VERCEL_ENV: process.env.VERCEL_ENV,
  },
  
  // Environment-specific configurations
  ...(process.env.NODE_ENV === 'staging' && {
    // Staging-specific settings
    experimental: {
      // Enable additional logging for staging
      logging: {
        level: 'verbose',
      },
    },
  }),
  
  ...(process.env.NODE_ENV === 'production' && {
    // Production-specific settings
    output: 'standalone',
    compress: true,
  }),
};

export default nextConfig;
