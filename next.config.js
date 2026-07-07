/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    root: __dirname
  },
  generateBuildId: async () => `build-${Date.now()}`
};

module.exports = nextConfig;
