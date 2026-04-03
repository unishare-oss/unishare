'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Loader2, Upload, X, BookOpen, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { PageHeader } from '@/components/shared/page-header'
import { SearchSelect } from '@/components/ui/search-select'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import {
  useQuizzesControllerGenerateFromPost,
  useQuizzesControllerGenerateQuestions,
} from '@/src/lib/api/generated/quizzes/quizzes'
import { cn } from '@/lib/utils'

const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

type Source = 'file' | 'post'

export default function AdminGenerateQuizPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [source, setSource] = useState<Source>('file')
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [deptId, setDeptId] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [courseId, setCourseId] = useState('')
  const [questionCount, setQuestionCount] = useState(20)
  const [submitting, setSubmitting] = useState(false)

  // Post source state
  const [postSearch, setPostSearch] = useState('')
  const [selectedPostId, setSelectedPostId] = useState('')
  const [selectedPostLabel, setSelectedPostLabel] = useState('')

  const { data: departments } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100, ...(deptId ? { departmentId: deptId } : {}) },
    { query: { select: (r) => r.data } },
  )

  // Posts with summaries
  const { data: postsData } = usePostsControllerFindAll(
    { hasSummary: true, limit: 50 },
    { query: { select: (r) => r.data, enabled: source === 'post' } },
  )

  const { mutateAsync: generateFromPost } = useQuizzesControllerGenerateFromPost()

  const allCourses = coursesData?.items ?? []

  const courseOptions = useMemo(() => {
    const yearNum = Number(yearLevel)
    return allCourses
      .filter((c) => !yearLevel || c.yearLevel == null || c.yearLevel === yearNum)
      .map((c) => ({ value: c.id, label: `${c.code} — ${c.name}` }))
  }, [allCourses, yearLevel])

  const deptOptions = useMemo(
    () => (departments ?? []).map((d) => ({ value: d.id, label: d.name })),
    [departments],
  )

  const yearOptions = [1, 2, 3, 4, 5, 6].map((y) => ({
    value: String(y),
    label: `Year ${y}`,
  }))

  const postOptions = useMemo(() => {
    const posts = postsData?.items ?? []
    const q = postSearch.toLowerCase()
    return posts
      .filter(
        (p) =>
          !q ||
          p.title?.toLowerCase().includes(q) ||
          p.course?.code?.toLowerCase().includes(q) ||
          p.course?.name?.toLowerCase().includes(q),
      )
      .map((p) => ({
        value: p.id,
        label: p.title
          ? `${p.course?.code ?? ''} — ${p.title}`
          : `${p.course?.code ?? ''} — ${p.course?.name ?? 'Untitled'}`,
      }))
  }, [postsData, postSearch])

  function handlePickFile(picked: File[]) {
    const valid = picked.filter((f) => ACCEPTED_MIME_TYPES.has(f.type))
    if (picked.length > valid.length) toast.error('Only PDF and Word documents are accepted')
    if (valid.length > 0) setFile(valid[valid.length - 1])
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handlePickFile(Array.from(e.target.files ?? []))
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (!submitting) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (submitting) return
    handlePickFile(Array.from(e.dataTransfer.files))
  }

  const { mutateAsync: generateFromFile } = useQuizzesControllerGenerateQuestions()

  async function handleSubmit() {
    setSubmitting(true)
    try {
      let quizId: string

      if (source === 'file') {
        if (!file) {
          toast.error('Please upload a study material')
          setSubmitting(false)
          return
        }
        if (!courseId) {
          toast.error('Please select a course')
          setSubmitting(false)
          return
        }

        const formData = new FormData()
        formData.append('file', file)
        formData.append('courseId', courseId)
        formData.append('questionCount', String(questionCount))

        const res = await generateFromFile({ data: formData as never })
        quizId = res.data.quizId
      } else {
        if (!selectedPostId) {
          toast.error('Please select a post')
          setSubmitting(false)
          return
        }

        const res = await generateFromPost({ data: { postId: selectedPostId, questionCount } })
        quizId = res.data.quizId
      }

      toast.success('Quiz generated! Redirecting to preview…')
      router.push(`/quizzes/${quizId}`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit = source === 'file' ? !!file && !!courseId : !!selectedPostId

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Generate Quiz" />

      <div className="flex-1 bg-card">
        <div className="max-w-[640px] mx-auto px-6 py-8 space-y-8">
          {/* Source toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-[8px]">
            {(['file', 'post'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setSource(s)}
                disabled={submitting}
                className={cn(
                  'flex-1 flex items-center justify-center gap-2 py-2 text-sm rounded-[6px] transition-all duration-150 font-medium',
                  source === s
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {s === 'file' ? (
                  <Upload className="size-3.5" strokeWidth={1.5} />
                ) : (
                  <BookOpen className="size-3.5" strokeWidth={1.5} />
                )}
                {s === 'file' ? 'Upload File' : 'From Post'}
              </button>
            ))}
          </div>

          {source === 'file' ? (
            <>
              {/* File upload */}
              <section>
                <h2 className="text-[22px] font-semibold text-foreground mb-1">
                  Upload study material
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  PDF or Word document. One file per quiz.
                </p>

                <input
                  ref={inputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={submitting}
                  onChange={handleInputChange}
                />

                {!file ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={cn(
                      'w-full border-2 border-dashed rounded-[6px] py-10 flex flex-col items-center gap-3 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed',
                      isDragging
                        ? 'border-amber bg-amber/5 scale-[1.01]'
                        : 'border-border hover:border-amber hover:bg-amber/5',
                    )}
                  >
                    <Upload
                      className={cn(
                        'size-6 transition-colors',
                        isDragging ? 'text-amber' : 'text-muted-foreground',
                      )}
                      strokeWidth={1.5}
                    />
                    <p
                      className={cn('text-sm', isDragging ? 'text-amber' : 'text-muted-foreground')}
                    >
                      {isDragging ? 'Release to upload' : 'Drop file here or click to browse'}
                    </p>
                  </button>
                ) : (
                  <div className="flex items-center gap-3 border border-border rounded-[6px] px-4 py-3">
                    <FileText className="size-5 text-destructive shrink-0" strokeWidth={1.5} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatBytes(file.size)}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-xs"
                      disabled={submitting}
                      onClick={() => setFile(null)}
                    >
                      <X className="size-4 text-muted-foreground" strokeWidth={1.5} />
                    </Button>
                  </div>
                )}
              </section>

              {/* Course selection */}
              <section className="space-y-4">
                <h2 className="text-[22px] font-semibold text-foreground">
                  Which course is this for?
                </h2>
                <div className="flex flex-col gap-4">
                  <div>
                    <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Department
                    </label>
                    <SearchSelect
                      options={deptOptions}
                      value={deptId}
                      onChange={(v) => {
                        setDeptId(v)
                        setCourseId('')
                        setYearLevel('')
                      }}
                      placeholder="All departments"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Year Level
                    </label>
                    <SearchSelect
                      options={yearOptions}
                      value={yearLevel}
                      onChange={(v) => {
                        setYearLevel(v)
                        setCourseId('')
                      }}
                      placeholder="All years"
                      disabled={submitting}
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
                      Course
                    </label>
                    <SearchSelect
                      options={courseOptions}
                      value={courseId}
                      onChange={setCourseId}
                      placeholder={
                        courseOptions.length === 0 ? 'No courses found' : 'Select a course…'
                      }
                      disabledPlaceholder="Select a course…"
                      disabled={submitting || courseOptions.length === 0}
                    />
                  </div>
                </div>
              </section>
            </>
          ) : (
            /* Post selection */
            <section>
              <h2 className="text-[22px] font-semibold text-foreground mb-1">Select a post</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Only posts with an AI summary are shown. The course is inherited from the post.
              </p>

              <div className="space-y-3">
                <div className="relative">
                  <Search
                    className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
                    strokeWidth={1.5}
                  />
                  <input
                    type="text"
                    value={postSearch}
                    onChange={(e) => setPostSearch(e.target.value)}
                    placeholder="Search by title or course code…"
                    disabled={submitting}
                    className="w-full pl-9 pr-4 py-2 text-sm bg-muted border border-border rounded-[6px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-amber/50 disabled:opacity-50"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto rounded-[6px] border border-border divide-y divide-border">
                  {postOptions.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">
                      {postSearch ? 'No matching posts found' : 'No posts with summaries yet'}
                    </p>
                  ) : (
                    postOptions.map((p) => (
                      <button
                        key={p.value}
                        onClick={() => {
                          setSelectedPostId(p.value)
                          setSelectedPostLabel(p.label)
                        }}
                        disabled={submitting}
                        className={cn(
                          'w-full text-left px-4 py-3 text-sm transition-colors',
                          selectedPostId === p.value
                            ? 'bg-amber/10 text-amber'
                            : 'text-foreground hover:bg-muted',
                        )}
                      >
                        {p.label}
                      </button>
                    ))
                  )}
                </div>

                {selectedPostId && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="size-3.5 text-amber" strokeWidth={1.5} />
                    <span className="truncate">
                      Selected: <span className="text-foreground">{selectedPostLabel}</span>
                    </span>
                    <button
                      onClick={() => {
                        setSelectedPostId('')
                        setSelectedPostLabel('')
                      }}
                      className="ml-auto shrink-0 text-muted-foreground hover:text-foreground"
                    >
                      <X className="size-3.5" strokeWidth={1.5} />
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Question Count */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[22px] font-semibold text-foreground">Number of Questions</h2>
              <span className="font-mono text-sm text-muted-foreground">{questionCount}</span>
            </div>
            <Slider
              min={5}
              max={50}
              step={5}
              value={[questionCount]}
              onValueChange={([v]) => setQuestionCount(v)}
              disabled={submitting}
            />
            <div className="flex justify-between font-mono text-[11px] text-muted-foreground">
              <span>5</span>
              <span>50</span>
            </div>
          </section>

          <Button
            size="lg"
            className="w-full"
            disabled={!canSubmit || submitting}
            onClick={handleSubmit}
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 mr-2 animate-spin" />
                Generating…
              </>
            ) : (
              'Generate Quiz'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
