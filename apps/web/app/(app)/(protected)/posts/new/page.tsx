'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { PageRail } from '@/components/page-rail'
import { ShareForm, type SharePreview } from '@/components/posts/share-form'
import { SharePreviewCard } from '@/components/posts/share-preview-card'

const TIPS = [
  'Everyone in the course can see what you share.',
  'The module puts your note under the right topic on the course page.',
  "Don't share homework that's still being graded.",
]

export default function CreatePostPage({
  searchParams,
}: {
  searchParams: Promise<{ courseId?: string }>
}) {
  const { courseId } = use(searchParams)
  const [preview, setPreview] = useState<SharePreview | null>(null)

  return (
    <PageRail
      rail={
        <>
          <section aria-labelledby="pv-h" className="grid gap-2.5 py-1">
            <span
              id="pv-h"
              className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase"
            >
              How classmates will see it
            </span>
            {preview && (
              <SharePreviewCard
                values={preview.values}
                courseCode={preview.courseCode}
                fileCount={preview.fileCount}
              />
            )}
          </section>
          <section aria-labelledby="tip-h" className="grid gap-2.5 py-1">
            <span
              id="tip-h"
              className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground uppercase"
            >
              Good to know
            </span>
            <ul className="m-0 list-disc space-y-2 pl-[18px] text-[13.5px] text-muted-foreground">
              {TIPS.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </section>
        </>
      }
    >
      <nav
        aria-label="Breadcrumb"
        className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground"
      >
        <Link href="/feed" className="font-medium text-sky hover:underline">
          Today
        </Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Share a note</span>
      </nav>
      <header className="grid gap-1.5">
        <h1 className="text-[clamp(28px,4vw,38px)] leading-[1.08] font-semibold tracking-[-0.024em]">
          Share a note
        </h1>
        <p className="m-0 text-sm text-muted-foreground">
          Add a file. We fill in the rest from its name, then you check it and share.
        </p>
      </header>
      <ShareForm initialCourseId={courseId} onPreviewChange={setPreview} />
    </PageRail>
  )
}
