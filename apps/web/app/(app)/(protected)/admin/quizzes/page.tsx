'use client'

import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FileText, Loader2, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { PageHeader } from '@/components/shared/page-header'
import { SearchSelect } from '@/components/ui/search-select'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
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

export default function AdminGenerateQuizPage() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [deptId, setDeptId] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [courseId, setCourseId] = useState('')
  const [questionCount, setQuestionCount] = useState(20)
  const [submitting, setSubmitting] = useState(false)

  // Fetch departments
  const { data: departments } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data },
  })

  // Fetch courses filtered by department
  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100, ...(deptId ? { departmentId: deptId } : {}) },
    { query: { select: (r) => r.data } },
  )

  const allCourses = coursesData?.items ?? []

  // Filter by year level then map to SearchSelect options
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

  // Only allow PDF/Word — one file per quiz
  function handlePickFile(picked: File[]) {
    const valid = picked.filter((f) => ACCEPTED_MIME_TYPES.has(f.type))
    if (picked.length > valid.length) {
      toast.error('Only PDF and Word documents are accepted')
    }
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

  async function handleSubmit() {
    if (!file) {
      toast.error('Please upload a study material (PDF or Word)')
      return
    }
    if (!courseId) {
      toast.error('Please select a course')
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('courseId', courseId)
      formData.append('questionCount', String(questionCount))

      const res = await fetch('/api/quizzes/generate', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || 'Failed to generate quiz')
      }

      const json = await res.json()
      const quizId: string = json.data?.quizId ?? json.quizId

      toast.success('Quiz generated! Redirecting to preview…')
      router.push(`/quizzes/${quizId}`)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Generate Quiz" />

      <div className="flex-1 bg-card">
        <div className="max-w-[640px] mx-auto px-6 py-8 space-y-8">
          {/* Study Material Upload */}
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
                  'w-full border-2 border-dashed rounded-[6px] py-10 flex flex-col items-center gap-3 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent',
                  isDragging
                    ? 'border-amber bg-amber/5 scale-[1.01]'
                    : 'border-border hover:border-amber hover:bg-amber/5',
                )}
              >
                <Upload
                  className={cn(
                    'size-6 transition-colors duration-150',
                    isDragging ? 'text-amber' : 'text-muted-foreground',
                  )}
                  strokeWidth={1.5}
                />
                <p
                  className={cn(
                    'text-sm transition-colors duration-150',
                    isDragging ? 'text-amber' : 'text-muted-foreground',
                  )}
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
                  aria-label="Remove file"
                >
                  <X className="size-4 text-muted-foreground" strokeWidth={1.5} />
                </Button>
              </div>
            )}
          </section>

          {/* Course Selection */}
          <section className="space-y-4">
            <h2 className="text-[22px] font-semibold text-foreground">Which course is this for?</h2>

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
                  placeholder={courseOptions.length === 0 ? 'No courses found' : 'Select a course…'}
                  disabledPlaceholder="Select a course…"
                  disabled={submitting || courseOptions.length === 0}
                />
              </div>
            </div>
          </section>

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

          {/* Submit */}
          <Button
            size="lg"
            className="w-full"
            disabled={!file || !courseId || submitting}
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
