import path from 'node:path';
import type { NextConfig } from 'next';

const root = path.resolve(process.cwd(), '../..');

const nextConfig: NextConfig = {
  transpilePackages: ['@ojt/game'],
  outputFileTracingRoot: root,
  turbopack: { root },
  // The dev server blocks dev resources for hosts other than localhost. Phones on the LAN need this.
  allowedDevOrigins: (process.env.DEV_LAN_HOSTS ?? '127.0.0.1').split(',').map((h) => h.trim()).filter(Boolean),
};

export default nextConfig;
