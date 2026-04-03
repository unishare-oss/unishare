'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { AcademicProfileModal } from '@/components/academic-profile-modal'
import { BackgroundUploadManager } from '@/components/shared/background-upload-manager'
import { useAuth } from '@/contexts/auth-context'
import { useUIStore } from '@/lib/store'
import { useNotificationStream } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()
  const pathname = usePathname()
  const isChat = pathname.startsWith('/chat')
  const isChatRoom = /^\/chat\/.+/.test(pathname)

  const collapsed = useUIStore((s) => s.sidebarCollapsed)

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
        <AppSidebar />
      </div>
      <main
        className={cn(
          showLoader ? 'invisible pointer-events-none' : '',
          'transition-[margin] duration-300',
          isChat
            ? cn('h-screen overflow-hidden', collapsed ? 'md:ml-15' : 'md:ml-68')
            : cn('min-h-screen pb-16 md:pb-0', collapsed ? 'md:ml-15' : 'md:ml-68'),
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
