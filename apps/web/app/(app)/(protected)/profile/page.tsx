'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { LogOut } from 'lucide-react'
import { useUsersControllerGetMe } from '@/src/lib/api/generated/users/users'
import {
  usePostsControllerFindAll,
  usePostsControllerGetSavedPosts,
} from '@/src/lib/api/generated/posts/posts'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { signOut } from '@/src/lib/auth/sign-out'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileHeaderCard } from '@/components/profile/profile-header-card'
import { EditProfileForm } from '@/components/profile/edit-profile-form'
import { DangerZoneCard } from '@/components/profile/danger-zone-card'
import { YourStuff } from '@/components/profile/your-stuff'
import { UniauthAccountCard } from '@/components/profile/uniauth-account-card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { ProfileTabs, type Tab } from '@/components/profile/profile-tabs'
import { useAuth } from '@/contexts/auth-context'

function ProfileContent({ user }: { user: UserProfileEntity }) {
  const [activeTab, setActiveTab] = useState<Tab>('MY POSTS')
  const { isGuest } = useAuth()

  const { data: myPostsData, isLoading: myPostsLoading } = usePostsControllerFindAll(
    { authorId: user.id, limit: 100 },
    { query: { select: (r) => r.data, placeholderData: keepPreviousData } },
  )
  const { data: savedPostsData, isLoading: savedPostsLoading } = usePostsControllerGetSavedPosts(
    {},
    { query: { select: (r) => r.data, placeholderData: keepPreviousData } },
  )

  const myPosts = myPostsData?.items ?? []
  const savedPosts = savedPostsData?.items ?? []

  return (
    <>
      <ProfileHeaderCard user={user} />
      <EditProfileForm user={user} isGuest={isGuest} />
      {!isGuest && <YourStuff />}
      {/* A guest has no unicorp account, chat keys or account to delete: only the bio. */}
      {!isGuest && <UniauthAccountCard />}
      {!isGuest && <DangerZoneCard />}
      <ProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        posts={activeTab === 'MY POSTS' ? myPosts : savedPosts}
        loading={activeTab === 'MY POSTS' ? myPostsLoading : savedPostsLoading}
      />
    </>
  )
}

function SignOutButton() {
  async function handleSignOut() {
    await signOut()
  }

  return (
    <Button
      variant="ghost"
      onClick={handleSignOut}
      className="md:hidden text-text-muted hover:text-foreground"
    >
      <LogOut className="size-4" strokeWidth={1.5} />
      Sign out
    </Button>
  )
}

function ProfileSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="border border-border rounded-[6px] p-6 bg-card">
        <div className="flex items-start gap-5">
          <Skeleton className="size-16 rounded-full shrink-0" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-32 w-full rounded-[6px]" />
      ))}
    </div>
  )
}

export default function ProfilePage() {
  const { data: user, isLoading } = useUsersControllerGetMe({
    query: { select: (res) => res.data },
  })

  return (
    <div className="flex flex-col min-h-[calc(100dvh-var(--mobile-topbar-h,0px))]">
      <PageHeader title="Profile" action={<SignOutButton />} />
      <div className="flex-1 bg-card">
        <div className="max-w-[700px] mx-auto px-6 py-8">
          {isLoading ? <ProfileSkeleton /> : user && <ProfileContent user={user} />}
        </div>
      </div>
    </div>
  )
}
