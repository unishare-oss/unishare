'use client'

import { useState } from 'react'
import { currentUser, posts } from '@/lib/mock-data'
import { useUIStore } from '@/lib/store'
import { PageHeader } from '@/components/shared/page-header'
import { ProfileHeaderCard } from '@/components/profile/profile-header-card'
import { EditProfileForm } from '@/components/profile/edit-profile-form'
import { ProfileTabs, type Tab } from '@/components/profile/profile-tabs'

export default function ProfilePage() {
  const [activeTab, setActiveTab] = useState<Tab>('MY POSTS')
  const [displayName, setDisplayName] = useState(currentUser.name)
  const [department, setDepartment] = useState('d1')
  const [enrollmentYear, setEnrollmentYear] = useState(String(currentUser.enrollmentYear))

  const savedPostIds = useUIStore((s) => s.savedPostIds)
  const myPosts = posts.filter((p) => p.author.id === currentUser.id)
  const savedPosts = posts.filter((p) => savedPostIds.includes(p.id))

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Profile" />

      <div className="flex-1 bg-card">
        <div className="max-w-[700px] mx-auto px-6 py-8">
          <ProfileHeaderCard user={currentUser} />
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
        </div>
      </div>
    </div>
  )
}
