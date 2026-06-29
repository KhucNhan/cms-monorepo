import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@cms/block-registry'],
  async rewrites() {
    const apiUrl = process.env.API_URL ?? 'http://localhost:3001';
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiUrl}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
