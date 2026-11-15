'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ChevronRight, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { TagInput } from '@/components/TagInput'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ModuleSelect } from '@/components/posts/module-select'
import { ShareCourseField } from '@/components/posts/share-course-field'
import { ShareFiles } from '@/components/posts/share-files'
import { Chip, shareInputClass } from '@/components/posts/share-ui'
import {
  externalUrlSchema,
  moduleNumberSchema,
  semesterSchema,
  yearSchema,
} from '@/lib/posts/form-schema'
import {
  POST_TYPES,
  POST_TYPE_LABELS,
  deriveSemester,
  guessFromFileName,
} from '@/lib/posts/share-defaults'
import { uploadPostFile } from '@/lib/posts/upload-post-file'
import { useUploadStore } from '@/lib/store'
import { cn } from '@/lib/utils'
import { usePostsControllerCreate } from '@/src/lib/api/generated/posts/posts'
import { filesControllerConfirmUpload } from '@/src/lib/api/generated/files/files'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'

const shareSchema = z.object({
  // Old exams are locked for now, so the form can never send them.
  postType: z.enum(['NOTE', 'EXERCISE']),
  selectedDept: z.string(),
  selectedCourse: z.string().min(1),
  title: z.string().trim().min(3, 'Give it a title of at least 3 letters.'),
  description: z.string(),
  isAnonymous: z.boolean(),
  year: yearSchema,
  semester: semesterSchema,
  moduleNum: moduleNumberSchema,
  examYear: z.string(),
  externalUrl: externalUrlSchema,
  files: z.array(z.instanceof(File)).min(1),
  tags: z.array(z.string()),
})

export type ShareValues = z.input<typeof shareSchema>
type TextField = 'selectedCourse' | 'moduleNum' | 'title'
type Guessable = TextField | 'postType'

// What the "Still needed" line calls each field, in the order it lists them.
const MISSING_LABELS: Partial<Record<keyof ShareValues, string>> = {
  files: 'a file',
  postType: 'a type',
  selectedCourse: 'a course',
  year: 'a year',
  moduleNum: 'a module',
  title: 'a title',
  externalUrl: 'a valid https link',
}

const MAX_FILE_SIZE = 50 * 1024 * 1024
const BG_THRESHOLD = 10 * 1024 * 1024
const FROM_FILE = 'from the file name'

const defaultValues: ShareValues = {
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
}

const labelClass = 'flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-sm font-semibold'

function Hint({ text }: { text?: string }) {
  if (!text) return null
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-sky before:size-1.5 before:rounded-full before:bg-current">
      {text}
    </span>
  )
}
export type SharePreview = {
  values: ShareValues
  courseCode: string
  fileCount: number
}

export function ShareForm({
  initialCourseId,
  onPreviewChange,
}: {
  initialCourseId?: string
  onPreviewChange?: (preview: SharePreview) => void
}) {
  const router = useRouter()
  const { user: me } = useAuth()
  const enqueueUploads = useUploadStore((s) => s.enqueue)
  const { mutateAsync: createPost } = usePostsControllerCreate()
  const form = useForm<ShareValues, unknown, z.output<typeof shareSchema>>({
    resolver: zodResolver(shareSchema),
    mode: 'onTouched',
    defaultValues,
  })
  const { register } = form
  const { errors } = form.formState
  const values = form.watch()

  const [hints, setHints] = useState<Partial<Record<Guessable, string>>>({})
  const [submitting, setSubmitting] = useState(false)
  const [editSemester, setEditSemester] = useState(false)
  const [showLockedNote, setShowLockedNote] = useState(false)
  const [dragging, setDragging] = useState(false)
  // Fields the student, or an earlier guess, already filled. A later file never overwrites them.
  const touched = useRef(new Set<Guessable>())
  // The file the guess ran on, so it can run again once the courses arrive.
  const guessedFile = useRef<File | null>(null)

  const { data: coursesData, isLoading: coursesLoading } = useCoursesControllerFindAll(
    { departmentId: me?.department?.id, limit: 100 },
    { query: { enabled: !!me?.department?.id, select: (r) => r.data } },
  )
  const courses = useMemo(() => coursesData?.items ?? [], [coursesData])
  const course = courses.find((c) => c.id === values.selectedCourse)

  const markFilled = useCallback((field: Guessable, hint: string) => {
    touched.current.add(field)
    setHints((h) => ({ ...h, [field]: hint }))
  }, [])

  const setText = useCallback(
    (field: TextField, value: string, hint = '') => {
      form.setValue(field, value, { shouldDirty: true })
      markFilled(field, hint)
    },
    [form, markFilled],
  )

  function setType(type: ShareValues['postType'], hint = '') {
    form.setValue('postType', type, { shouldDirty: true })
    markFilled('postType', hint)
  }

  function touch(field: Guessable) {
    markFilled(field, '')
  }

  function guessText(field: TextField, value?: string) {
    if (value === undefined || touched.current.has(field)) return
    setText(field, value, FROM_FILE)
  }

  // The course comes from the course page, or from the file name once the courses have loaded.
  useEffect(() => {
    if (touched.current.has('selectedCourse')) return
    const fromPage = !!initialCourseId && courses.some((c) => c.id === initialCourseId)
    const fromFile = guessedFile.current
      ? guessFromFileName(guessedFile.current.name, courses).courseId
      : undefined
    if (fromPage) setText('selectedCourse', initialCourseId, 'from the course page')
    else if (fromFile) setText('selectedCourse', fromFile, FROM_FILE)
  }, [courses, initialCourseId, setText])

  // The year comes from the course, or from the student when the course has none.
  const derivedYear = String(course?.yearLevel ?? me?.yearLevel ?? '')
  useEffect(() => {
    form.setValue('year', derivedYear)
  }, [form, derivedYear])

  function addFiles(picked: File[]) {
    const ok = picked.filter((file) => file.size <= MAX_FILE_SIZE)
    if (ok.length < picked.length) toast.error('Files can be up to 50 MB.')
    if (ok.length === 0) return
    const current = form.getValues('files')
    form.setValue('files', [...current, ...ok], { shouldDirty: true })
    if (current.length === 0) {
      guessedFile.current = ok[0]!
      applyGuess(ok[0]!)
    }
  }

  function applyGuess(file: File) {
    const guess = guessFromFileName(file.name, courses)
    guessText('selectedCourse', guess.courseId)
    guessText('moduleNum', guess.moduleNumber?.toString())
    guessText('title', guess.title)
    if (guess.type === 'EXERCISE' && !touched.current.has('postType'))
      setType('EXERCISE', FROM_FILE)
  }

  // A board image exported from the canvas becomes the first file.
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
      // Ignore malformed export data.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // The rail preview follows every form change.
  useEffect(() => {
    function emit() {
      const current = form.getValues()
      onPreviewChange?.({
        values: current,
        courseCode: courses.find((c) => c.id === current.selectedCourse)?.code ?? '',
        fileCount: current.files.length,
      })
    }
    emit()
    const subscription = form.watch(emit)
    return () => subscription.unsubscribe()
  }, [form, courses, onPreviewChange])

  const issueFields = new Set(shareSchema.safeParse(values).error?.issues.map((i) => i.path[0]))
  if (!values.selectedCourse) issueFields.delete('year')
  const missing = Object.entries(MISSING_LABELS)
    .filter(([field]) => issueFields.has(field))
    .map(([, label]) => label)
  const missingText =
    missing.length > 1 ? `${missing.slice(0, -1).join(', ')} and ${missing.at(-1)}` : missing[0]

  async function onSubmit(data: z.output<typeof shareSchema>) {
    if (submitting) return
    setSubmitting(true)
    const post = await createPost({
      data: {
        type: data.postType,
        courseId: data.selectedCourse,
        title: data.title,
        description: data.description.trim(),
        isAnonymous: data.isAnonymous,
        externalUrl: data.externalUrl?.trim() || undefined,
        tags: data.tags.length > 0 ? data.tags : undefined,
        year: Number(data.year),
        semester: Number(data.semester),
        moduleNumber: Number(data.moduleNum),
      },
    })
      .then((res) => res.data)
      .catch(() => null)
    if (!post) {
      toast.error('Could not share your note. Try again.')
      setSubmitting(false)
      return
    }

    // The post exists now, so a failed upload must not offer a retry that would duplicate it.
    const small = data.files.filter((f) => f.size <= BG_THRESHOLD)
    const large = data.files.filter((f) => f.size > BG_THRESHOLD)
    const results = await Promise.allSettled(
      small.map(async (file) => {
        const uploaded = await uploadPostFile(file)
        await filesControllerConfirmUpload(post.id, uploaded)
      }),
    )
    if (large.length > 0) enqueueUploads(post.id, large)
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      toast.warning(
        `Shared. ${failed} ${failed === 1 ? 'file' : 'files'} didn't upload. Add them from Edit.`,
      )
    }
    router.push(`/posts/${post.id}`)
  }

  const needsYear = !!course && !course.yearLevel && !me?.yearLevel
  const linkInvalid = issueFields.has('externalUrl')
  const firstFile = values.files[0]
  const filled = Object.values(hints).filter((hint) => hint === FROM_FILE).length
  const semesterLabel = { '1': 'Semester 1', '2': 'Semester 2', '3': 'Summer' }[values.semester]
  return (
    <div
      className="grid min-w-0 gap-[22px]"
      onDragEnter={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        addFiles(Array.from(e.dataTransfer.files))
      }}
    >
      <ShareFiles
        files={values.files}
        dragging={dragging}
        onAdd={addFiles}
        onRemove={(index) =>
          form.setValue(
            'files',
            values.files.filter((_, i) => i !== index),
            { shouldDirty: true },
          )
        }
      />

      {firstFile && (
        <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="grid gap-[22px]">
          <p className="m-0 flex items-start gap-2.5 rounded-(--r-s) bg-sky-soft px-3 py-2.5 text-[13.5px]">
            <span aria-hidden="true" className="mt-px size-[18px] text-sky">
              ✦
            </span>
            <span>
              {filled
                ? `We filled in ${filled === 1 ? 'one thing' : `${filled} things`} from "${firstFile.name}". Check them, then share.`
                : `We couldn't tell much from "${firstFile.name}", so pick the course and module below.`}
            </span>
          </p>

          <fieldset className="m-0 grid min-w-0 gap-2.5 border-0 p-0">
            <legend className={cn(labelClass, 'p-0')}>
              What is it? <Hint text={hints.postType} />
            </legend>
            <div className="flex flex-wrap gap-2">
              {POST_TYPES.map((type) =>
                type === 'OLD_QUESTION' ? (
                  <Chip
                    key={type}
                    locked
                    pressed={false}
                    title="Old exams are locked for now."
                    onClick={() => setShowLockedNote(true)}
                    onPointerDown={() => setShowLockedNote(true)}
                    onFocus={() => setShowLockedNote(true)}
                  >
                    <Lock aria-hidden="true" className="size-3.5" />
                    {POST_TYPE_LABELS[type]}
                  </Chip>
                ) : (
                  <Chip key={type} pressed={values.postType === type} onClick={() => setType(type)}>
                    {POST_TYPE_LABELS[type]}
                  </Chip>
                ),
              )}
            </div>
            {showLockedNote && (
              <p className="m-0 text-[13px] text-muted-foreground">Old exams are locked for now.</p>
            )}
          </fieldset>

          <fieldset className="m-0 grid min-w-0 gap-2.5 border-0 p-0">
            <legend className={cn(labelClass, 'p-0')}>
              Course <Hint text={hints.selectedCourse} />
            </legend>
            <ShareCourseField
              courses={courses}
              yearLevel={me?.yearLevel}
              value={values.selectedCourse}
              loading={coursesLoading}
              onSelect={(id) => setText('selectedCourse', id)}
            />
            {course && values.year && (
              <p className="m-0 text-[13px] text-muted-foreground">
                Year {values.year} · {semesterLabel}. Set from the course and today&apos;s date.{' '}
                <button
                  type="button"
                  className="p-0 text-[13px] text-sky hover:underline"
                  onClick={() => setEditSemester(true)}
                >
                  Change
                </button>
              </p>
            )}
            {(editSemester || needsYear) && (
              <div className="flex flex-wrap gap-3">
                {needsYear && (
                  <div className="grid gap-1">
                    <label htmlFor="sh-year" className="sr-only">
                      Year
                    </label>
                    <Select
                      value={values.year}
                      onValueChange={(year) => form.setValue('year', year)}
                    >
                      <SelectTrigger id="sh-year" className="w-full max-w-[220px]">
                        <SelectValue placeholder="Year…" />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6].map((year) => (
                          <SelectItem key={year} value={String(year)}>
                            Year {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {editSemester && (
                  <div className="grid gap-1">
                    <label htmlFor="sh-sem" className="sr-only">
                      Semester
                    </label>
                    <Select
                      value={values.semester}
                      onValueChange={(semester) => form.setValue('semester', semester)}
                    >
                      <SelectTrigger id="sh-sem" className="w-full max-w-[220px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Semester 1</SelectItem>
                        <SelectItem value="2">Semester 2</SelectItem>
                        <SelectItem value="3">Summer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            )}
          </fieldset>

          <div className="grid min-w-0 gap-2.5">
            <label htmlFor="sh-mod" className={labelClass}>
              Module <Hint text={hints.moduleNum} />
            </label>
            <ModuleSelect
              id="sh-mod"
              value={values.moduleNum}
              onChange={(moduleNum) => setText('moduleNum', moduleNum)}
            />
          </div>

          <div className="grid min-w-0 gap-2.5">
            <label htmlFor="sh-title" className={labelClass}>
              Title <Hint text={hints.title} />
            </label>
            <input
              id="sh-title"
              maxLength={200}
              autoComplete="off"
              placeholder="e.g. Heaps and priority queues"
              aria-invalid={!!errors.title}
              aria-describedby="sh-title-err"
              className={shareInputClass}
              {...register('title', { onChange: () => touch('title') })}
            />
            {errors.title && (
              <p id="sh-title-err" className="m-0 text-[12.5px] text-bad">
                {errors.title.message}
              </p>
            )}
          </div>

          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              role="switch"
              className="peer sr-only"
              {...register('isAnonymous')}
            />
            <span
              aria-hidden="true"
              className="relative h-6 w-10 flex-none rounded-full bg-edge transition-[background-color] duration-160 peer-checked:bg-ink peer-focus-visible:outline-3 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-sky after:absolute after:top-[3px] after:left-[3px] after:size-[18px] after:rounded-full after:bg-white after:shadow-[0_1px_2px_rgba(0,0,0,0.2)] after:transition-transform after:duration-200 peer-checked:after:translate-x-4"
            />
            <span className="grid leading-[1.35]">
              <b className="text-sm font-semibold">Post anonymously</b>
              <small className="text-[12.5px] text-muted-foreground">
                Classmates see &quot;A classmate&quot; instead of your name.
              </small>
            </span>
          </label>

          <details className="group border-t border-line pt-3.5">
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <ChevronRight className="size-4 transition-transform duration-200 group-open:rotate-90" />
              More details{' '}
              <span className="text-xs font-medium text-muted-foreground">
                description, tags, link (all optional)
              </span>
            </summary>
            <div className="grid gap-4 pt-3.5">
              <div className="grid gap-2.5">
                <label htmlFor="sh-desc" className={labelClass}>
                  Description
                </label>
                <textarea
                  id="sh-desc"
                  maxLength={2000}
                  placeholder="What's in it, and what's it good for?"
                  className={cn(shareInputClass, 'min-h-[84px] resize-y text-sm')}
                  {...register('description')}
                />
              </div>
              <div className="grid gap-2.5">
                <span className={labelClass}>
                  Tags <span className="text-xs font-medium text-muted-foreground">up to 5</span>
                </span>
                <TagInput
                  value={values.tags}
                  onChange={(tags) => form.setValue('tags', tags)}
                  maxTags={5}
                />
              </div>
              <div className="grid gap-2.5">
                <label htmlFor="sh-link" className={labelClass}>
                  Link
                </label>
                <input
                  id="sh-link"
                  type="url"
                  inputMode="url"
                  placeholder="https://"
                  aria-invalid={linkInvalid}
                  className={shareInputClass}
                  {...register('externalUrl')}
                />
                {linkInvalid && (
                  <p className="m-0 text-[12.5px] text-bad">The link must start with https://</p>
                )}
              </div>
            </div>
          </details>

          <div className="sticky bottom-0 z-[4] -mx-4 flex items-center justify-end gap-3.5 border-t border-line bg-glass px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom,0px))] backdrop-blur-[16px] backdrop-saturate-[170%] max-[760px]:bottom-[calc(58px+env(safe-area-inset-bottom,0px))] max-[760px]:pb-3">
            <p
              aria-live="polite"
              className="m-0 mr-auto min-w-0 text-[13.5px] text-muted-foreground"
            >
              {missing.length > 0 ? (
                <>Still needed: {missingText}.</>
              ) : (
                <>
                  Shares to <b className="font-semibold text-ink">{course?.code}</b> · Module{' '}
                  {values.moduleNum}
                  {values.isAnonymous ? ' · anonymously' : ''}
                </>
              )}
            </p>
            <Button type="submit" variant="brand" disabled={missing.length > 0 || submitting}>
              {submitting ? 'Sharing…' : 'Share'}
            </Button>
          </div>
        </form>
      )}
    </div>
  )
}
