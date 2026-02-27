import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Sign In',
  description: 'Sign in to Unishare to share and discover student resources.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
