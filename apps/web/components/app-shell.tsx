'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AppSidebar } from '@/components/app-sidebar'
import { MobileNav } from '@/components/mobile-nav'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { AcademicProfileModal } from '@/components/academic-profile-modal'
import { useAuth } from '@/contexts/auth-context'
import { useNotificationStream } from '@/hooks/use-notifications'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated } = useAuth()

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
        className={
          showLoader
            ? 'invisible pointer-events-none min-h-screen pb-16 md:ml-72 md:pb-0'
            : 'min-h-screen pb-16 md:ml-72 md:pb-0'
        }
        aria-hidden={showLoader}
      >
        {' '}
        {children}
      </main>
      <div className={showLoader ? 'invisible pointer-events-none' : ''}>
        <MobileNav />
      </div>

      {!showLoader && requiresDepartmentOnboarding && !profileModalDismissed && (
        <AcademicProfileModal requireDepartment onSkip={() => setProfileModalDismissed(true)} />
      )}

      {showLoader && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
          <LoadingSpinner className="size-24" />
        </div>
      )}
    </div>
  )
}
