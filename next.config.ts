import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    allowedDevOrigins: [
      '9004-idx-studio-1744378905575.cluster-ikxjzjhlifcwuroomfkjrx437g.cloudworkstations.dev',
    ],
  },
};

export default nextConfig;
