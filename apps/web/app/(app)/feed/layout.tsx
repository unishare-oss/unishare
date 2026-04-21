import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Feed',
  description: 'Browse the latest posts shared by the community.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
