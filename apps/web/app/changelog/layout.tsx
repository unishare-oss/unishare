import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'See what is new in Unishare.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
