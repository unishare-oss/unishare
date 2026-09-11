import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Decks',
  description: 'Generate, edit and download slide decks for your coursework.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
