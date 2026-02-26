import type { ReactNode } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileNav } from '@/components/mobile-nav'

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <main className="md:ml-60 min-h-screen pb-16 md:pb-0">{children}</main>
      <MobileNav />
    </div>
  )
}
