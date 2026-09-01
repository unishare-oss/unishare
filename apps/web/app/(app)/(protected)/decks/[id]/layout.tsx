import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Deck',
  description: 'Preview, edit and download a generated slide deck.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
