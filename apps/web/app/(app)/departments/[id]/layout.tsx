import type { Metadata } from 'next'
import type { ReactNode } from 'react'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'

async function getDepartment(id: string) {
  try {
    const res = await fetch(`${API_URL}/api/departments/${id}`, { next: { revalidate: 3600 } })
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
  const dept = await getDepartment(id)

  if (!dept) return { title: 'Department' }

  const title = dept.name
  const description = `Browse courses and study resources for the ${dept.name} department on Unishare.`

  return {
    title,
    description,
    openGraph: {
      title: `${title} | Unishare`,
      description,
      type: 'website',
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | Unishare`,
      description,
      images: ['/og-image.png'],
    },
  }
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
