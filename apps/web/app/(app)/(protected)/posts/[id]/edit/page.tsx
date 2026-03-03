'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { toast } from 'sonner'
import { PageHeader } from '@/components/shared/page-header'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { DetailsStep } from '@/components/posts/details-step'
import { FilesStep } from '@/components/posts/files-step'
import type { CreatePostFormValues } from '@/lib/posts/form-types'
import { uploadPostFile } from '@/lib/posts/upload-post-file'
import {
  addExamYearIssueIfPresent,
  examYearSchema,
  externalUrlSchema,
  moduleNumberSchema,
  semesterSchema,
  yearSchema,
} from '@/lib/posts/form-schema'
import {
  type PostDetailEntity,
  PresignedUploadDtoPurpose,
  PresignedUploadDtoUploadType,
  type PresignedUploadEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import {
  getPostsControllerFindAllQueryKey,
  getPostsControllerFindOneQueryKey,
  usePostsControllerFindOne,
  usePostsControllerUpdate,
} from '@/src/lib/api/generated/posts/posts'
import {
  useFilesControllerConfirmUpload,
  useFilesControllerRemove,
} from '@/src/lib/api/generated/files/files'

const baseEditPostSchema = z
  .object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters'),
    description: z.string().trim().min(1, 'Description is required'),
    year: yearSchema,
    semester: semesterSchema,
    moduleNum: moduleNumberSchema,
    examYear: z.string(),
    externalUrl: externalUrlSchema,
  })
  .superRefine((values, ctx) => {
    addExamYearIssueIfPresent(values.examYear, ctx)
  })

const emptyValues: CreatePostFormValues = {
  postType: null,
  selectedDept: '',
  selectedCourse: '',
  title: '',
  description: '',
  year: '',
  semester: '',
  moduleNum: '',
  examYear: '',
  externalUrl: '',
  files: [],
}

function postToFormValues(post: PostDetailEntity): CreatePostFormValues {
  return {
    postType: post.type,
    selectedDept: post.course.department.id,
    selectedCourse: post.course.id,
    title: post.title ?? '',
    description: post.description ?? '',
    year: post.year != null ? String(post.year) : '',
    semester: post.semester != null ? String(post.semester) : '',
    moduleNum: post.moduleNumber != null ? String(post.moduleNumber) : '',
    examYear: post.examYear != null ? String(post.examYear) : '',
    externalUrl: post.externalUrl ?? '',
    files: [],
  }
}

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [newFiles, setNewFiles] = useState<File[]>([])
  const [removedFileIds, setRemovedFileIds] = useState<Set<string>>(new Set())

  // Keep validation live so "Save changes" only enables when the current edited values are valid.
  const form = useForm<CreatePostFormValues>({ defaultValues: emptyValues, mode: 'onChange' })
  const { isDirty } = form.formState

  const { data: post, isLoading } = usePostsControllerFindOne(id, {
    query: {
      select: (response) => response.data,
    },
  })

  const postType = post?.type ?? null

  const { mutateAsync: updatePost, isPending: isUpdatingPost } = usePostsControllerUpdate()
  const { mutateAsync: confirmUpload, isPending: isConfirmingFile } =
    useFilesControllerConfirmUpload()
  const { mutateAsync: removeFile, isPending: isRemovingFile } = useFilesControllerRemove()

  useEffect(() => {
    if (post) {
      form.reset(postToFormValues(post))
      setNewFiles([])
      setRemovedFileIds(new Set())
    }
  }, [form, post])

  const canSubmit = baseEditPostSchema.safeParse(form.watch()).success
  const hasFileChanges = newFiles.length > 0 || removedFileIds.size > 0
  const hasChanges = isDirty || hasFileChanges
  const isSubmitting = isUpdatingPost || isConfirmingFile || isRemovingFile

  // Toggle staged removal for an existing file id.
  // First click marks it for deletion on save, second click would undo that mark.
  function toggleRemove(fileId: string) {
    setRemovedFileIds((prev) => {
      const next = new Set(prev)
      if (next.has(fileId)) {
        next.delete(fileId)
      } else {
        next.add(fileId)
      }
      return next
    })
  }

  async function handleSubmit() {
    if (!post) return

    const formValues = form.getValues()
    const parsed = baseEditPostSchema.safeParse(formValues)
    if (!parsed.success) {
      void form.trigger()
      return
    }

    try {
      await updatePost({
        id,
        data: {
          title: formValues.title.trim(),
          description: formValues.description.trim(),
          externalUrl: formValues.externalUrl?.trim() || undefined,
          year: Number(formValues.year),
          semester: Number(formValues.semester),
          moduleNumber: Number(formValues.moduleNum),
          examYear: formValues.examYear ? Number(formValues.examYear) : undefined,
        },
      })

      const filesToRemove = Array.from(removedFileIds)

      for (const fileId of filesToRemove) {
        await removeFile({ postId: id, fileId })
      }

      for (const file of newFiles) {
        const uploadedFile = await uploadPostFile(file)
        await confirmUpload({ postId: id, data: uploadedFile })
      }

      toast.success('Post updated')
      router.push(`/posts/${id}`)
    } catch {
      toast.error('Could not update post')
    }
  }

  if (isLoading || !post) {
    return (
      <div className="flex min-h-screen flex-col">
        <PageHeader title="Edit Post" />
        <div className="flex flex-1 items-center justify-center bg-card">
          <LoadingSpinner className="size-20" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <PageHeader title="Edit Post" />

      <div className="flex-1 bg-card">
        <div className="mx-auto max-w-[720px] px-6 py-8">
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[28px] font-semibold tracking-tight text-foreground">
                Edit post
              </h1>
              <p className="mt-2 text-sm text-text-muted">
                Type and course stay fixed after publishing. You can update details and attachments.
              </p>
            </div>
            <Link
              href={`/posts/${id}`}
              className="inline-flex h-9 items-center rounded-[6px] px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
            >
              Cancel
            </Link>
          </div>

          <div className="mb-8 grid gap-4 rounded-[6px] border border-border bg-background px-4 py-4 sm:grid-cols-2">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Type</p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {post.type === 'NOTE' ? 'Lecture Note' : 'Past Exam'}
              </p>
            </div>
            <div>
              <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Course
              </p>
              <p className="mt-1 text-sm font-medium text-foreground">
                {post.course.code} · {post.course.name}
              </p>
            </div>
          </div>

          <DetailsStep form={form} postType={postType} />

          <FilesStep
            items={[
              ...post.files
                .filter((file) => !removedFileIds.has(file.id))
                .map((file) => ({
                  id: `existing:${file.id}`,
                  name: file.name,
                  size: file.size,
                  mimeType: file.mimeType,
                })),
              ...newFiles.map((file, index) => ({
                id: `new:${index}`,
                name: file.name,
                size: file.size,
                mimeType: file.type,
              })),
            ]}
            disabled={isSubmitting}
            onAddFiles={(files) => {
              setNewFiles((prev) => [...prev, ...files])
            }}
            onRemove={(itemId) => {
              if (itemId.startsWith('existing:')) {
                toggleRemove(itemId.replace('existing:', ''))
                return
              }
              const fileIndex = Number(itemId.replace('new:', ''))
              setNewFiles((prev) => prev.filter((_, index) => index !== fileIndex))
            }}
          />

          <div className="mt-10 flex items-center justify-end gap-3 border-t border-border pt-6">
            <Link
              href={`/posts/${id}`}
              className="inline-flex h-9 items-center rounded-[6px] px-4 text-sm font-medium text-foreground transition-colors duration-150 hover:bg-muted"
            >
              Cancel
            </Link>
            <button
              type="button"
              disabled={!canSubmit || !hasChanges || isSubmitting}
              onClick={() => void handleSubmit()}
              className={`inline-flex h-9 items-center rounded-[6px] px-4 text-sm font-medium transition-colors duration-150 ${
                !canSubmit || !hasChanges || isSubmitting
                  ? 'cursor-not-allowed bg-muted text-text-muted'
                  : 'bg-amber text-primary-foreground hover:bg-amber-hover'
              }`}
            >
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
