import type { MetadataRoute } from 'next'

const APP_URL = process.env.APP_URL ?? 'https://share.psstee.dev'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/feed', '/departments/', '/posts/', '/users/', '/canvas/', '/privacy', '/terms'],
        disallow: [
          '/api/',
          '/saved',
          '/chat',
          '/my-posts',
          '/notifications',
          '/requests',
          '/boards',
          '/profile',
          '/admin/',
          '/login',
        ],
      },
    ],
    sitemap: `${APP_URL}/sitemap.xml`,
  }
}
