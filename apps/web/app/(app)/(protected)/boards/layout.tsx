import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Boards',
  description: 'Browse curated content boards.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
