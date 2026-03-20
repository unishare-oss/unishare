import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Canvas',
}

export default function CanvasLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
