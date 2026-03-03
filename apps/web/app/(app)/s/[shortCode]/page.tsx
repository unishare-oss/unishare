import { redirect, notFound } from 'next/navigation'
import { postsControllerFindByShortCode } from '@/src/lib/api/generated/posts/posts'

export default async function SharedPostPage({
  params,
}: {
  params: Promise<{ shortCode: string }>
}) {
  const { shortCode } = await params

  let id: string

  try {
    const res = await postsControllerFindByShortCode(shortCode)
    id = res.data.id
  } catch {
    notFound()
  }

  redirect(`/posts/${id!}`)
}
