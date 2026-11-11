'use client'

import { Suspense, useEffect, useState, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { AppSidebar } from '@/components/app-sidebar'
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
      <div className={showLoader ? 'invisible pointer-events-none' : ''}>
        <WithCurrentTab>{(tab) => <AppSidebar tab={tab} />}</WithCurrentTab>
      </div>
      <main
        className={cn(
          showLoader ? 'invisible pointer-events-none' : '',
          'transition-[margin] duration-200 motion-reduce:transition-none',
          sidebarCollapsed ? 'md:ml-[72px]' : 'md:ml-[232px]',
          // Clears the glass top bar on phones and tells sticky headers where it ends; the chat room has none.
          !isChatRoom &&
            'pt-[calc(3.5rem+env(safe-area-inset-top))] md:pt-0 max-md:[--mobile-topbar-h:calc(3.5rem+env(safe-area-inset-top))]',
          isChat
            ? 'h-screen overflow-hidden'
            : // Bottom padding clears the floating mobile dock (h-16 + 12px inset + breathing room).
              'min-h-screen pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0',
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
      <div className={showLoader ? 'invisible pointer-events-none' : ''}>
        {!isChatRoom && <WithCurrentTab>{(tab) => <MobileNav tab={tab} />}</WithCurrentTab>}
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

function ReadCurrentTab({ children }: { children: (tab: string | null | undefined) => ReactNode }) {
  return <>{children(useSearchParams().get('tab'))}</>
}

/**
 * Reads ?tab= inside its own Suspense boundary. Until the client knows the tab (undefined), the
 * fallback renders the same nav with neither Today nor Campus marked active, so static pages
 * still send the navigation from the server and never mark the wrong item.
 */
function WithCurrentTab({ children }: { children: (tab: string | null | undefined) => ReactNode }) {
  return (
    <Suspense fallback={children(undefined)}>
      <ReadCurrentTab>{children}</ReadCurrentTab>
    </Suspense>
  )
}
