import type { NextConfig } from 'next'
import { imageHosts } from './lib/image-hosts'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['127.0.0.1'],
  output: 'standalone',
  compress: false,
  images: {
    remotePatterns: imageHosts.map((hostname) => ({ protocol: 'https' as const, hostname })),
  },
  async rewrites() {
    return [
      { source: '/api/:slug*', destination: `${API_URL}/api/:slug*` },
      { source: '/mcp', destination: `${API_URL}/mcp` },
      { source: '/mcp/:slug*', destination: `${API_URL}/mcp/:slug*` },
      { source: '/.well-known/:slug*', destination: `${API_URL}/.well-known/:slug*` },
    ]
  },
}

export default nextConfig
