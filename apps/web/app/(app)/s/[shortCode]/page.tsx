import { redirect, notFound } from 'next/navigation'
import { headers } from 'next/headers'

type ApiEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

function getBaseUrl(requestHeaders: Headers) {
  const apiUrl = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL
  if (apiUrl) return apiUrl

  const host = requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host')
  const proto = requestHeaders.get('x-forwarded-proto') ?? 'http'

  if (!host) return 'http://localhost:3000'
  return `${proto}://${host}`
}

export default async function SharedPostPage({
  params,
}: {
  params: Promise<{ shortCode: string }>
}) {
  const { shortCode } = await params

  const h = await headers()
  const baseUrl = getBaseUrl(h)

  const res = await fetch(new URL(`/api/posts/s/${shortCode}`, baseUrl), {
    cache: 'no-store',
    headers: {
      cookie: h.get('cookie') ?? '',
    },
  })

  if (!res.ok) notFound()

  const json = (await res.json()) as ApiEnvelope<{ id: string }>
  if (!json?.data?.id) notFound()

  redirect(`/posts/${json.data.id}`)
}
