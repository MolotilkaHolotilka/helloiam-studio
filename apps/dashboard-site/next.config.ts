import type { NextConfig } from 'next';

import path from 'node:path';

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  basePath: '/ideas',
  experimental: {
    devtoolSegmentExplorer: false,
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        ...config.watchOptions,
        ignored: [
          '**/node_modules/**',
          '**/.git/**',
          '**/.next/**',
          '**/pagefile.sys',
          '**/swapfile.sys',
          '**/DumpStack.log.tmp',
        ],
      };
    }

    return config;
  },
};

export default nextConfig;

