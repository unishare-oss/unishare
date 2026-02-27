'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LogOut } from 'lucide-react'
import { posts } from '@/lib/mock-data'
import { useUsersControllerGetMe } from '@/src/lib/api/generated/users/users'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { authClient } from '@/src/lib/auth/client'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileHeaderCard } from '@/components/profile/profile-header-card'
import { EditProfileForm } from '@/components/profile/edit-profile-form'
import { ProfileTabs, type Tab } from '@/components/profile/profile-tabs'

function ProfileContent({ user }: { user: UserProfileEntity }) {
  const [activeTab, setActiveTab] = useState<Tab>('MY POSTS')
  const [displayName, setDisplayName] = useState(user.name)
  const [department, setDepartment] = useState(user.departmentId ?? '')
  const [enrollmentYear, setEnrollmentYear] = useState(
    user.enrollmentYear != null ? String(user.enrollmentYear) : '',
  )

  const myPosts = posts.filter((p) => p.author.id === user.id)
  const savedPosts = posts.filter((p) => p.savedByUser)

  return (
    <>
      <ProfileHeaderCard user={user} />
      <EditProfileForm
        displayName={displayName}
        department={department}
        enrollmentYear={enrollmentYear}
        onDisplayNameChange={setDisplayName}
        onDepartmentChange={setDepartment}
        onEnrollmentYearChange={setEnrollmentYear}
      />
      <ProfileTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        posts={activeTab === 'MY POSTS' ? myPosts : savedPosts}
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
    <button
      onClick={handleSignOut}
      className="md:hidden flex items-center gap-2 px-3 py-1.5 text-sm text-text-muted hover:text-foreground hover:bg-muted rounded-[6px] transition-colors duration-150"
    >
      <LogOut className="size-4" strokeWidth={1.5} />
      Sign out
    </button>
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
