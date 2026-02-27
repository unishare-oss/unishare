'use client'

import { useState } from 'react'
import { posts } from '@/lib/mock-data'
import { useUsersControllerGetMe } from '@/src/lib/api/generated/users/users'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
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

export default function ProfilePage() {
  const { data: user } = useUsersControllerGetMe({
    query: { select: (res) => res.data },
  })

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Profile" />
      <div className="flex-1 bg-card">
        <div className="max-w-[700px] mx-auto px-6 py-8">
          {user && <ProfileContent user={user} />}
        </div>
      </div>
    </div>
  )
}
