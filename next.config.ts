import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // This project sits inside a parent directory that also has a lockfile. Pinning the root stops
  // Turbopack inferring the wrong one.
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
