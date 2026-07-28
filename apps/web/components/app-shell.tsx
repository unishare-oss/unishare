'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AppRail } from '@/components/app-rail'
import { MobileNav } from '@/components/mobile-nav'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { AcademicProfileModal } from '@/components/academic-profile-modal'
import { BackgroundUploadManager } from '@/components/shared/background-upload-manager'
import { useAuth } from '@/contexts/auth-context'
import { useNotificationStream } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const isChat = pathname.startsWith('/chat')
  const isChatRoom = /^\/chat\/.+/.test(pathname)
  const sidebarCollapsed = useUIStore((state) => state.sidebarCollapsed)

  useNotificationStream(isAuthenticated)
  const [minimumLoaderElapsed, setMinimumLoaderElapsed] = useState(false)

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setMinimumLoaderElapsed(true)
    }, 1000)

    return () => window.clearTimeout(timeout)
  }, [])

  const showLoader = isLoading || !minimumLoaderElapsed

  const [profileModalDismissed, setProfileModalDismissed] = useState(false)
  const requiresDepartmentOnboarding = isAuthenticated && !!user && !user.department

  return (
    <div className="min-h-screen bg-background">
      <div className={showLoader ? 'invisible pointer-events-none' : ''}>
        <AppRail />
      </div>
      <main
        className={cn(
          showLoader ? 'invisible pointer-events-none' : '',
          'transition-[margin] duration-200 motion-reduce:transition-none',
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[232px]',
          isChat
            ? 'h-screen overflow-hidden'
            : // Bottom padding clears the floating mobile dock (h-16 + 12px inset + breathing room).
              'min-h-screen pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0',
        )}
        aria-hidden={showLoader}
      >
        {children}
      </main>
      <div className={showLoader ? 'invisible pointer-events-none' : ''}>
        {!isChatRoom && <MobileNav />}
      </div>

      {!showLoader && requiresDepartmentOnboarding && !profileModalDismissed && (
        <AcademicProfileModal requireDepartment onSkip={() => setProfileModalDismissed(true)} />
      )}

      <BackgroundUploadManager />

      {showLoader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <LoadingSpinner className="size-24" />
        </div>
      )}
    </div>
  )
}
