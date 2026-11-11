'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm, useWatch } from 'react-hook-form'
import { ChevronRight, Sparkles, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { filesControllerConfirmUpload } from '@/src/lib/api/generated/files/files'
import {
  postsControllerRemove,
  usePostsControllerCreate,
  usePostsControllerFindAll,
} from '@/src/lib/api/generated/posts/posts'
import { TagInput } from '@/components/TagInput'
import { getTypeMeta } from '@/components/feed/feed-card-meta'
import {
  ACCEPTED_FILE_TYPES,
  FileRow,
  SnippetPaster,
  isFileAccepted,
} from '@/components/posts/files-step'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SearchSelect } from '@/components/ui/search-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { createPostFormSchema } from '@/lib/posts/form-schema'
import type { CreatePostFormValues, PostType } from '@/lib/posts/form-types'
import {
  deriveSemester,
  guessFromFileName,
  missingFields,
  newestWeekWithNotes,
} from '@/lib/posts/share-defaults'
import { uploadPostFile } from '@/lib/posts/upload-post-file'
import { useUploadStore } from '@/lib/store'

const MAX_FILE_BYTES = 50 * 1024 * 1024
const BG_THRESHOLD = 10 * 1024 * 1024 // files above this upload in the background after Share
const WEEKS = Array.from({ length: 15 }, (_, i) => i + 1)
// Past exam stays switched off until it is decided; see the US-59 SPEC.
const TYPE_CHOICES: { value: PostType; label: string; disabled?: boolean }[] = [
  { value: 'NOTE', label: 'Note' },
  { value: 'OLD_QUESTION', label: 'Past exam (unavailable)', disabled: true },
  { value: 'EXERCISE', label: 'Exercise' },
]

type Uploaded = Awaited<ReturnType<typeof uploadPostFile>>
interface FileEntry {
  id: string
  file: File
  status: 'uploading' | 'ready' | 'error' | 'rejected'
  uploaded?: Uploaded
  reason?: string
}

const FROM_FILE = 'from the file name'
const NEWEST_WEEK = 'newest week with notes'

function Hint({ text }: { text?: string }) {
  if (!text) return null
  return (
    <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-sky">
      <span className="size-1.5 rounded-full bg-sky" aria-hidden />
      {text}
    </span>
  )
}

function Chip({
  pressed,
  disabled,
  onClick,
  children,
}: {
  pressed: boolean
  disabled?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'relative rounded-full border-[1.5px] px-3.5 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        pressed
          ? 'border-brand bg-brand-soft font-semibold text-ink'
          : 'border-line bg-surface text-ink hover:bg-surface-2',
      )}
    >
      {children}
    </button>
  )
}

function Label({
  children,
  hint,
  htmlFor,
}: {
  children: React.ReactNode
  hint?: string
  htmlFor?: string
}) {
  const Tag = htmlFor ? 'label' : 'p'
  return (
    <Tag htmlFor={htmlFor} className="mb-2 block text-sm font-semibold text-ink">
      {children}
      <Hint text={hint} />
    </Tag>
  )
}

export function ShareForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: me, isLoading: authLoading } = useAuth()
  const enqueueUploads = useUploadStore((s) => s.enqueue)
  const { mutateAsync: createPost } = usePostsControllerCreate()
  const inputRef = useRef<HTMLInputElement>(null)

  const form = useForm<CreatePostFormValues>({
    mode: 'onChange',
    defaultValues: {
      postType: 'NOTE',
      selectedDept: '',
      selectedCourse: '',
      title: '',
      description: '',
      isAnonymous: false,
      year: '',
      semester: String(deriveSemester(new Date())),
      moduleNum: '',
      examYear: '',
      externalUrl: '',
      files: [],
      tags: [],
      homeworkConfirmed: false,
    },
  })
  const values = useWatch({ control: form.control }) as CreatePostFormValues

  const [entries, setEntries] = useState<FileEntry[]>([])
  const [hints, setHints] = useState<Record<string, string>>({})
  const [filledCount, setFilledCount] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [editingYear, setEditingYear] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const edited = useRef(new Set<string>()) // fields the student changed themselves
  const guessDone = useRef(false)

  const departmentId = me?.department?.id ?? undefined
  const { data: coursesData, isLoading: coursesLoading } = useCoursesControllerFindAll(
    { departmentId, limit: 100 },
    { query: { enabled: !!departmentId, select: (r) => r.data } },
  )
  const courses = useMemo(() => coursesData?.items ?? [], [coursesData])
  const course = courses.find((c) => c.id === values.selectedCourse)

  const { data: notesData } = usePostsControllerFindAll(
    { courseId: values.selectedCourse, type: 'NOTE' },
    { query: { enabled: !!values.selectedCourse, select: (r) => r.data } },
  )
  const newestWeek = newestWeekWithNotes(notesData?.items ?? [])

  const counted = entries.filter((e) => e.status === 'ready')
  const uploading = entries.filter((e) => e.status === 'uploading')
  const previewFileCount = entries.filter((e) => e.status !== 'rejected').length
  const firstFile = entries.find((e) => e.status !== 'rejected')?.file

  // --- field helpers -------------------------------------------------------------------------
  function guess(field: keyof CreatePostFormValues, value: string | undefined, hint: string) {
    if (!value || edited.current.has(field)) return false
    form.setValue(field, value as never, { shouldDirty: false })
    setHints((h) => ({ ...h, [field]: hint }))
    return true
  }

  function change<K extends keyof CreatePostFormValues>(field: K, value: CreatePostFormValues[K]) {
    edited.current.add(field)
    setHints((h) => {
      const rest = { ...h }
      delete rest[field]
      return rest
    })
    form.setValue(field, value as never, { shouldDirty: true })
  }

  // --- defaults ------------------------------------------------------------------------------
  // Board export from the canvas counts as the first file.
  useEffect(() => {
    const raw = sessionStorage.getItem('pending-board-export')
    if (!raw) return
    sessionStorage.removeItem('pending-board-export')
    try {
      const { dataUrl, filename } = JSON.parse(raw) as { dataUrl: string; filename: string }
      const [header, base64] = dataUrl.split(',')
      const mime = header?.match(/:(.*?);/)?.[1] ?? 'image/png'
      const bytes = atob(base64!)
      const arr = new Uint8Array(bytes.length)
      for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i)
      addFiles([new File([arr], filename, { type: mime })])
    } catch {
      // Ignore malformed sessionStorage data
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ?courseId= from the course page.
  const courseIdParam = searchParams.get('courseId')
  useEffect(() => {
    if (courseIdParam && courses.some((c) => c.id === courseIdParam) && !values.selectedCourse) {
      guess('selectedCourse', courseIdParam, 'from the course page')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseIdParam, courses])

  // Guess from the first file's name, once, when the courses are known.
  useEffect(() => {
    if (guessDone.current || !firstFile || authLoading || coursesLoading) return
    guessDone.current = true
    const g = guessFromFileName(firstFile.name, courses)
    let filled = 0
    if (guess('selectedCourse', g.courseId, FROM_FILE)) filled++
    if (guess('moduleNum', g.moduleNumber ? String(g.moduleNumber) : undefined, FROM_FILE)) filled++
    if (guess('title', g.title, FROM_FILE)) filled++
    // A past-exam guess is ignored while Past exam is off.
    if (g.type === 'EXERCISE' && guess('postType', g.type, FROM_FILE)) filled++
    setFilledCount(filled)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstFile, authLoading, coursesLoading, courses])

  // Week defaults to the newest week with notes when the file name gave none.
  useEffect(() => {
    if (!newestWeek || edited.current.has('moduleNum')) return
    if (!values.moduleNum || hints.moduleNum === NEWEST_WEEK) {
      guess('moduleNum', String(newestWeek), NEWEST_WEEK)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newestWeek, values.selectedCourse])

  // Year follows the course (or the student's own year) until the student sets it.
  const yearDefault = course?.yearLevel ?? me?.yearLevel ?? 1
  useEffect(() => {
    if (!edited.current.has('year')) form.setValue('year', String(yearDefault))
  }, [form, yearDefault])

  // --- files ---------------------------------------------------------------------------------
  function patchEntry(id: string, patch: Partial<FileEntry>) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))
  }

  async function startUpload(id: string, file: File) {
    patchEntry(id, { status: 'uploading', reason: undefined })
    try {
      patchEntry(id, { status: 'ready', uploaded: await uploadPostFile(file) })
    } catch {
      patchEntry(id, { status: 'error', reason: 'Upload failed' })
    }
  }

  function addFiles(files: File[]) {
    const added = files.map<FileEntry>((file) => {
      const id = crypto.randomUUID()
      if (file.size > MAX_FILE_BYTES) {
        return { id, file, status: 'rejected', reason: 'Over 50 MB' }
      }
      if (!isFileAccepted(file)) {
        return { id, file, status: 'rejected', reason: "We can't open this file type" }
      }
      return { id, file, status: file.size > BG_THRESHOLD ? 'ready' : 'uploading' }
    })
    setEntries((prev) => [...prev, ...added])
    for (const entry of added) {
      if (entry.status === 'uploading') void startUpload(entry.id, entry.file)
    }
  }

  function removeEntry(id: string) {
    const rest = entries.filter((e) => e.id !== id)
    setEntries(rest)
    if (rest.every((e) => e.status === 'rejected')) {
      // Last file gone: hide the form and drop the guesses the student didn't change.
      for (const field of Object.keys(hints)) {
        const blank = field === 'postType' ? 'NOTE' : ''
        form.setValue(field as keyof CreatePostFormValues, blank as never, { shouldDirty: false })
      }
      setHints({})
      // The course from the course page isn't a file-name guess: put it back.
      if (courseIdParam && courses.some((c) => c.id === courseIdParam)) {
        guess('selectedCourse', courseIdParam, 'from the course page')
      }
      setFilledCount(0)
      guessDone.current = false
    }
  }

  // --- submit --------------------------------------------------------------------------------
  const submitValues = { ...values, files: counted.map((e) => e.file) }
  const schemaResult = createPostFormSchema.safeParse(submitValues)
  const issueFor = (field: string) =>
    schemaResult.success
      ? undefined
      : schemaResult.error.issues.find((issue) => issue.path[0] === field)?.message
  const missing = missingFields(values, counted.length + uploading.length)
  const problem = schemaResult.success ? undefined : schemaResult.error.issues[0]
  const problemInMoreDetails =
    problem?.path[0] === 'externalUrl' || problem?.path[0] === 'description'
  const problemText =
    problem?.path[0] === 'externalUrl'
      ? 'Fix the link in More details'
      : problem?.path[0] === 'description'
        ? 'Shorten the description in More details'
        : problem?.message
  const canShare =
    missing.length === 0 && uploading.length === 0 && schemaResult.success && !!departmentId

  async function handleShare() {
    if (!canShare || !course) return
    setSubmitting(true)
    try {
      const res = await createPost({
        data: {
          type: values.postType as PostType,
          courseId: values.selectedCourse,
          title: values.title.trim(),
          description: values.description.trim(),
          isAnonymous: values.isAnonymous,
          externalUrl: values.externalUrl?.trim() || undefined,
          tags: values.tags.length > 0 ? values.tags : undefined,
          year: Number(values.year),
          semester: Number(values.semester),
          moduleNumber: Number(values.moduleNum),
        },
      })
      const post = res.data

      const small = counted.filter((e) => e.uploaded)
      await Promise.all(small.map((e) => filesControllerConfirmUpload(post.id, e.uploaded!)))
      const large = counted.filter((e) => !e.uploaded).map((e) => e.file)
      if (large.length > 0) enqueueUploads(post.id, large)

      router.push(`/posts/${post.id}`)
      toast.success(`Shared to ${course.code}. Classmates can see it now.`, {
        action: { label: 'Undo', onClick: () => void undo(post.id, course.id) },
      })
    } catch {
      toast.error("Couldn't share this note. Try again.")
      setSubmitting(false)
    }
  }

  async function undo(postId: string, courseId: string) {
    try {
      await postsControllerRemove(postId)
      router.push(`/posts/new?courseId=${courseId}`)
      toast('Post removed')
    } catch {
      toast.error("Couldn't remove the post")
    }
  }

  // --- render --------------------------------------------------------------------------------
  const hasFiles = entries.length > 0
  const typeMeta = getTypeMeta(values.postType ?? 'NOTE')
  const footerLine = !departmentId ? (
    'Set your department to share'
  ) : missing.length > 0 ? (
    `Still needed: ${missing.join(', ')}`
  ) : uploading.length > 0 ? (
    'Uploading… you can share when it finishes.'
  ) : problemText ? (
    problemText
  ) : (
    <>
      Shares to <b>{course?.code}</b> · Week {values.moduleNum}
      {values.isAnonymous && ' · anonymously'}
    </>
  )

  return (
    <div className="mx-auto grid max-w-[1000px] gap-8 px-6 py-8 min-[1180px]:max-w-[1100px] min-[1180px]:grid-cols-[minmax(0,640px)_320px]">
      <div className="min-w-0">
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_FILE_TYPES}
          className="hidden"
          onChange={(e) => {
            const picked = Array.from(e.target.files ?? [])
            if (picked.length > 0) addFiles(picked)
            e.target.value = ''
          }}
        />

        <section
          aria-label="Add files"
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
          }}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            addFiles(Array.from(e.dataTransfer.files))
          }}
          className={cn(
            'rounded-xl border-2 border-dashed text-center transition-colors duration-150',
            isDragging ? 'border-brand bg-brand-soft' : 'border-edge bg-surface',
            hasFiles ? 'flex items-center justify-between gap-3 px-4 py-3 text-left' : 'px-6 py-12',
          )}
        >
          {hasFiles ? (
            <p className="text-sm text-ink">
              <b>Add more files</b>{' '}
              <span className="text-text-muted">· They go into the same post</span>
            </p>
          ) : (
            <>
              <Upload className="mx-auto mb-3 size-7 text-brand-edge" strokeWidth={1.5} />
              <p className="text-base font-semibold text-ink">Drop your file here</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-text-muted">
                PDF, slides, Word, spreadsheets, photos, code, zip or video, up to 50 MB each
              </p>
            </>
          )}
          <Button
            type="button"
            variant="quiet"
            size="sm"
            className={hasFiles ? '' : 'mt-4'}
            onClick={() => inputRef.current?.click()}
          >
            Choose files
          </Button>
        </section>

        {hasFiles && (
          <div className="mt-3 flex flex-col gap-2">
            {entries.map((entry) => (
              <FileRow
                key={entry.id}
                name={entry.file.name}
                size={entry.file.size}
                mimeType={entry.file.type}
                disabled={submitting}
                onRemove={() => removeEntry(entry.id)}
                status={
                  entry.status === 'uploading'
                    ? { kind: 'uploading', text: 'Uploading…' }
                    : entry.status === 'error'
                      ? {
                          kind: 'error',
                          text: entry.reason ?? 'Upload failed',
                          onRetry: () => void startUpload(entry.id, entry.file),
                        }
                      : entry.status === 'rejected'
                        ? { kind: 'error', text: entry.reason ?? '' }
                        : undefined
                }
              />
            ))}
          </div>
        )}

        {hasFiles && firstFile && (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void handleShare()
            }}
            className="mt-6 flex flex-col gap-6"
          >
            <p className="flex items-start gap-2 rounded-lg bg-sky-soft px-3 py-2.5 text-sm text-ink">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden />
              <span>
                {filledCount > 0 ? (
                  <>
                    We filled in {filledCount} {filledCount === 1 ? 'thing' : 'things'} from “
                    <b>{firstFile.name}</b>”. Check them, then share.
                  </>
                ) : (
                  <>
                    We couldn’t tell much from “<b>{firstFile.name}</b>”, so pick the course and
                    week below.
                  </>
                )}
              </span>
            </p>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink">
                What is it?
                <Hint text={hints.postType} />
              </legend>
              <div className="flex flex-wrap gap-2">
                {TYPE_CHOICES.map((choice) => (
                  <Chip
                    key={choice.value}
                    pressed={values.postType === choice.value}
                    disabled={choice.disabled}
                    onClick={() => change('postType', choice.value)}
                  >
                    {choice.label}
                  </Chip>
                ))}
              </div>
              {values.postType === 'EXERCISE' && (
                <label className="mt-3 flex items-start gap-2.5 rounded-lg bg-surface-2 px-3 py-2.5 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="mt-0.5 shrink-0 accent-brand"
                    checked={!!values.homeworkConfirmed}
                    onChange={(e) => change('homeworkConfirmed', e.target.checked)}
                  />
                  This isn&apos;t homework that&apos;s still being graded, and I&apos;m allowed to
                  share it.
                </label>
              )}
            </fieldset>

            <div>
              <Label htmlFor="share-course" hint={hints.selectedCourse}>
                Course
              </Label>
              {!departmentId ? (
                <p className="text-sm text-text-muted">
                  Please{' '}
                  <a href="/profile" className="text-sky underline underline-offset-2">
                    set your department
                  </a>{' '}
                  in your profile to select a course.
                </p>
              ) : coursesLoading ? (
                <div className="h-[42px] animate-pulse rounded-md bg-surface-2" />
              ) : (
                <SearchSelect
                  id="share-course"
                  options={courses.map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))}
                  value={values.selectedCourse}
                  onChange={(id) => change('selectedCourse', id)}
                  placeholder="Search your department's courses…"
                />
              )}
              <p className="mt-2 text-xs text-text-muted">
                Year {values.year} · Semester {values.semester}. Set from the course and
                today&apos;s date.{' '}
                <button
                  type="button"
                  className="text-sky underline underline-offset-2"
                  onClick={() => setEditingYear((v) => !v)}
                >
                  Change
                </button>
              </p>
              {editingYear && (
                <div className="mt-2 flex gap-3">
                  <Select value={values.year} onValueChange={(v) => change('year', v)}>
                    <SelectTrigger aria-label="Year" className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5, 6].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          Year {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={values.semester} onValueChange={(v) => change('semester', v)}>
                    <SelectTrigger aria-label="Semester" className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3].map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-ink">
                Week
                <Hint text={hints.moduleNum} />
              </legend>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                {WEEKS.map((week) => (
                  <Chip
                    key={week}
                    pressed={values.moduleNum === String(week)}
                    onClick={() => change('moduleNum', String(week))}
                  >
                    {week}
                    {week === newestWeek && (
                      <span
                        className="absolute top-1 right-1.5 size-1.5 rounded-full bg-brand"
                        title="Newest week with notes"
                      />
                    )}
                  </Chip>
                ))}
              </div>
            </fieldset>

            <div>
              <Label htmlFor="share-title" hint={hints.title}>
                Title
              </Label>
              <Input
                id="share-title"
                maxLength={200}
                value={values.title}
                placeholder="e.g. Week 10 Heaps"
                onChange={(e) => change('title', e.target.value)}
                onBlur={() => form.trigger('title')}
              />
              {values.title.length > 0 && values.title.trim().length < 3 && (
                <p className="mt-1 text-xs text-bad">Give it a title of at least 3 letters.</p>
              )}
            </div>

            <label className="flex items-center justify-between gap-4">
              <span>
                <b className="block text-sm text-ink">Post anonymously</b>
                <span className="text-xs text-text-muted">
                  Classmates see &quot;A classmate&quot; instead of your name.
                </span>
              </span>
              <Switch
                aria-label="Post anonymously"
                checked={values.isAnonymous}
                onCheckedChange={(v) => change('isAnonymous', v)}
              />
            </label>

            <details
              open={moreOpen || problemInMoreDetails}
              onToggle={(e) => setMoreOpen(e.currentTarget.open)}
              className="group rounded-lg border border-line bg-surface"
            >
              <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-semibold text-ink">
                <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
                More details
                <span className="text-xs font-normal text-text-muted">
                  description, tags, link (all optional)
                </span>
              </summary>
              <div className="flex flex-col gap-4 px-3 pb-3">
                <div>
                  <Label htmlFor="share-description">Description</Label>
                  <Textarea
                    id="share-description"
                    rows={3}
                    value={values.description}
                    onChange={(e) => change('description', e.target.value)}
                    placeholder="Describe what you're sharing…"
                  />
                  {issueFor('description') && (
                    <p className="mt-1 text-xs text-bad">{issueFor('description')}</p>
                  )}
                </div>
                <div>
                  <Label>Tags</Label>
                  <TagInput value={values.tags} onChange={(t) => change('tags', t)} maxTags={5} />
                </div>
                <div>
                  <Label htmlFor="share-link">Link</Label>
                  <Input
                    id="share-link"
                    type="url"
                    value={values.externalUrl ?? ''}
                    onChange={(e) => change('externalUrl', e.target.value)}
                    placeholder="https://…"
                  />
                  {values.externalUrl && issueFor('externalUrl') && (
                    <p className="mt-1 text-xs text-bad">{issueFor('externalUrl')}</p>
                  )}
                </div>
                <SnippetPaster onAddFiles={addFiles} />
              </div>
            </details>

            <div className="sticky bottom-0 z-10 -mx-2 flex items-center justify-between gap-3 rounded-xl border border-line bg-card/90 px-4 py-3 backdrop-blur max-md:bottom-24">
              <p className="min-w-0 text-sm text-ink" role="status">
                {footerLine}
              </p>
              <Button type="submit" variant="brand" disabled={!canShare || submitting}>
                Share
              </Button>
            </div>
          </form>
        )}
      </div>

      {hasFiles && (
        <aside>
          <div className="flex flex-col gap-6 min-[1180px]:sticky min-[1180px]:top-24">
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">How classmates will see it</p>
              <div className="rounded-xl border border-line bg-surface p-4">
                <p className={cn('text-xs font-semibold uppercase', typeMeta.text)}>
                  {typeMeta.label}
                </p>
                <p className="mt-1 line-clamp-2 font-semibold text-ink">
                  {values.title.trim() || 'Your title'}
                </p>
                <p className="mt-1 text-xs text-text-muted">
                  {course ? course.code : 'Course'}
                  {values.moduleNum && ` · Week ${values.moduleNum}`} ·{' '}
                  {values.isAnonymous ? 'A classmate' : (me?.name ?? 'You')}
                </p>
                <p className="mt-2 text-xs text-text-muted">
                  {previewFileCount} {previewFileCount === 1 ? 'file' : 'files'}
                </p>
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-ink">Good to know</p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-text-muted">
                <li>It shows up under the course for your classmates.</li>
                <li>You can edit or delete it later.</li>
                <li>Anonymous posts hide your name; moderators can still review them.</li>
              </ul>
            </div>
          </div>
        </aside>
      )}
    </div>
  )
}
