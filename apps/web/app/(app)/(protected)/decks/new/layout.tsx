import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'New Deck',
  description: 'Describe a topic and generate a slide deck.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
