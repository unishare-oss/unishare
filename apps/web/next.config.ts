import type { NextConfig } from 'next'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

const nextConfig: NextConfig = {
  output: 'standalone',
  compress: false,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: '*.windows.net' },
      { protocol: 'https', hostname: '*.r2.cloudflarestorage.com' },
      { protocol: 'https', hostname: '*.r2.dev' },
      { protocol: 'https', hostname: 'upload.wikimedia.org' },
    ],
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
