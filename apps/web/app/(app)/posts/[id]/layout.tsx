import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'
const APP_URL = process.env.APP_URL ?? 'https://share.psstee.dev'

async function getPost(id: string): Promise<PostDetailEntity | null> {
  try {
    const res = await fetch(`${API_URL}/api/posts/${id}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const json = await res.json()
    return json.data ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const post = await getPost(id)

  if (!post) return { title: 'Post' }

  const title = post.title ?? `${post.course.code} — ${post.course.name}`
  const description = post.description
    ? post.description.slice(0, 160)
    : `${post.course.code} · ${post.course.name}${post.examYear ? ` · ${post.examYear}` : ''}`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/og-image.png'],
    },
  }
}

export default async function Layout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const post = await getPost(id)

  const title = post ? (post.title ?? `${post.course.code} — ${post.course.name}`) : 'Post'
  const description = post?.description?.slice(0, 160) ?? ''

  const jsonLd = post
    ? {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        url: `${APP_URL}/posts/${id}`,
        image: `${APP_URL}/og-image.png`,
        datePublished: post.createdAt,
        dateModified: post.updatedAt ?? post.createdAt,
        author: {
          '@type': 'Person',
          name: post.author?.name ?? 'Student',
        },
        publisher: {
          '@type': 'Organization',
          name: 'Unishare',
          url: APP_URL,
        },
      }
    : null

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      {children}
    </>
  )
}
