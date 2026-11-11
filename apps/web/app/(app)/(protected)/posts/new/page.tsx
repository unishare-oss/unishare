import { Suspense } from 'react'
import { PageHeader } from '@/components/shared/page-header'
import { ShareForm } from '@/components/posts/share-form'

export default function CreatePostPage() {
  return (
    <div className="flex min-h-[calc(100dvh-var(--mobile-topbar-h,0px))] flex-col">
      <PageHeader
        title="Share a note"
        subtitle="Add a file. We fill in the rest from its name, then you check it and share."
      />
      <div className="flex-1 bg-card">
        <Suspense>
          <ShareForm />
        </Suspense>
      </div>
    </div>
  )
}
