import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Request',
  description: 'View details and suggestions for this content request.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
