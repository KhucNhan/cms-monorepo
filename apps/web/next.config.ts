import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  transpilePackages: ['@cms/block-registry'],
};

export default nextConfig;
