import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Departments',
  description:
    'Browse university departments and discover course-specific study resources on Unishare.',
}

export default function Layout({ children }: { children: ReactNode }) {
  return children
}
