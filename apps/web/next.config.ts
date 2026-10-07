import path from 'node:path';
import type { NextConfig } from 'next';

const root = path.resolve(process.cwd(), '../..');

// NEXT_PUBLIC_* values are baked in at build time. On Vercel, a missing socket URL would ship a site that
// silently tries localhost:4000, so fail the build instead.
if (process.env.VERCEL && !process.env.NEXT_PUBLIC_SOCKET_URL) {
  throw new Error('NEXT_PUBLIC_SOCKET_URL is not set. Add it in Vercel > Settings > Environment Variables, then redeploy.');
}

const nextConfig: NextConfig = {
  transpilePackages: ['@ojt/game'],
  outputFileTracingRoot: root,
  turbopack: { root },
  // The dev server blocks dev resources for hosts other than localhost. Phones on the LAN need this.
  allowedDevOrigins: (process.env.DEV_LAN_HOSTS ?? '127.0.0.1').split(',').map((h) => h.trim()).filter(Boolean),
};

export default nextConfig;
