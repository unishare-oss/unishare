'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { AppRail } from '@/components/app-rail'
import { MobileNav } from '@/components/mobile-nav'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { AcademicProfileModal } from '@/components/academic-profile-modal'
import { NoUniversityNotice } from '@/components/no-university-notice'
import { GuestUniversityPicker } from '@/components/guest-university-picker'
import { BackgroundUploadManager } from '@/components/shared/background-upload-manager'
import { useAuth } from '@/contexts/auth-context'
import { useNotificationStream } from '@/hooks/use-notifications'
import { cn } from '@/lib/utils'
import { useUIStore } from '@/lib/store'

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isLoading, isAuthenticated, isGuest } = useAuth()
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

  // A member's university comes only from uniauth; a guest picks the one it browses here.
  const isAdmin = user?.role === 'ADMIN'
  const needsUniversity = !!user && !isGuest && !isAdmin && !user.university
  const guestNeedsUniversity = !!user && isGuest && !user.university

  const requiresDepartmentOnboarding =
    isAuthenticated && !!user && !user.department && !needsUniversity

  return (
    <div className="min-h-screen bg-background">
      {/* The demo's shell: a centred grid, sidebar column on the left (76px icons below 1180px). */}
      <div
        className={cn(
          'mx-auto grid max-w-[1320px] gap-7 px-4 md:items-start',
          sidebarCollapsed
            ? 'md:grid-cols-[76px_minmax(0,1fr)]'
            : 'md:grid-cols-[236px_minmax(0,1fr)]',
          'max-[1180px]:md:grid-cols-[76px_minmax(0,1fr)]',
          showLoader && 'invisible pointer-events-none',
        )}
      >
        <AppRail />
        <main
          className={cn(
            'min-w-0',
            isChat ? 'h-screen overflow-hidden' : 'min-h-screen',
            // Phones: clear the glass top bar and the bottom tab bar (hidden inside a chat room).
            !isChatRoom &&
              'pt-[calc(60px+env(safe-area-inset-top))] pb-[calc(96px+env(safe-area-inset-bottom))] md:pt-0 md:pb-0',
          )}
          aria-hidden={showLoader}
        >
          {needsUniversity ? (
            <NoUniversityNotice />
          ) : guestNeedsUniversity ? (
            <GuestUniversityPicker />
          ) : (
            children
          )}
        </main>
      </div>
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
