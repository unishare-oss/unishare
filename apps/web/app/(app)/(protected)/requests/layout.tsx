import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Requests',
  description: 'Browse and upvote content requests from the community.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
