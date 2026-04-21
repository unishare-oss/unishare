import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Quiz',
  description: 'Take this quiz and test your knowledge.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
