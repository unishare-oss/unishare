import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params

  try {
    const res = await fetch(`${API_URL}/api/rooms/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return { title: 'Canvas' }

    const { data: room } = await res.json()

    if (room?.visibility === 'PRIVATE') {
      return { title: 'Private Canvas' }
    }

    const title = room?.title ?? 'Untitled Canvas'
    const description = `A collaborative canvas on Unishare`

    return {
      title,
      description,
      openGraph: {
        title: `${title} | Unishare`,
        description,
        type: 'website',
      },
      twitter: {
        card: 'summary',
        title: `${title} | Unishare`,
        description,
      },
    }
  } catch {
    return { title: 'Canvas' }
  }
}

export default function CanvasLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
