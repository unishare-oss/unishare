import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Quizzes',
  description: 'Test your knowledge with community quizzes.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
