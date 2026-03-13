'use client'

import { useState } from 'react'
import { keepPreviousData } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { useUsersControllerGetMe } from '@/src/lib/api/generated/users/users'
import {
  usePostsControllerFindAll,
  usePostsControllerGetSavedPosts,
} from '@/src/lib/api/generated/posts/posts'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { authClient } from '@/src/lib/auth/client'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileHeaderCard } from '@/components/profile/profile-header-card'
import { EditProfileForm } from '@/components/profile/edit-profile-form'
import { ChangePasswordForm } from '@/components/profile/change-password-form'
import { ConnectedAccountsCard } from '@/components/profile/connected-accounts-card'
import { AppearanceCard } from '@/components/profile/appearance-card'
import { DangerZoneCard } from '@/components/profile/danger-zone-card'
import { Button } from '@/components/ui/button'
import { ProfileTabs, type Tab } from '@/components/profile/profile-tabs'

function ProfileContent({ user }: { user: UserProfileEntity }) {
  const [activeTab, setActiveTab] = useState<Tab>('MY POSTS')

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
      <EditProfileForm user={user} />
      <ChangePasswordForm />
      <ConnectedAccountsCard />
      <AppearanceCard />
      <DangerZoneCard />
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
  const router = useRouter()

  async function handleSignOut() {
    await authClient.signOut()
    router.replace('/login')
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

export default function ProfilePage() {
  const { data: user } = useUsersControllerGetMe({
    query: { select: (res) => res.data },
  })

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Profile" action={<SignOutButton />} />
      <div className="flex-1 bg-card">
        <div className="max-w-[700px] mx-auto px-6 py-8">
          {user && <ProfileContent user={user} />}
        </div>
      </div>
    </div>
  )
}
