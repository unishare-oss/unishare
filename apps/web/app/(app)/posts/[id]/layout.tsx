import type { Metadata } from 'next'
import type { ReactNode } from 'react'
import type { PostDetailEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

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
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
