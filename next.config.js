/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // ESLint 9 flat-config incompatible options break `next build` lint step
    ignoreDuringBuilds: true
  }
};

module.exports = nextConfig;
