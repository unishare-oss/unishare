'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Upload, BookOpen, ListChecks } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { PageHeader } from '@/components/shared/page-header'
import {
  useQuizzesControllerGenerateFromPost,
  useQuizzesControllerGenerateQuestions,
  useQuizzesControllerGenerateBulk,
} from '@/src/lib/api/generated/quizzes/quizzes'
import type { GenerateBulkResponseEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { cn } from '@/lib/utils'
import { CourseSelector } from '@/components/quiz/admin/CourseSelector'
import { FileSource } from '@/components/quiz/admin/FileSource'
import { PostSource } from '@/components/quiz/admin/PostSource'

type Source = 'file' | 'post' | 'course-outline'

export default function AdminGenerateQuizPage() {
  const router = useRouter()

  const [source, setSource] = useState<Source>('file')
  const [file, setFile] = useState<File | null>(null)
  const [deptId, setDeptId] = useState('')
  const [yearLevel, setYearLevel] = useState('')
  const [courseId, setCourseId] = useState('')
  const [questionCount, setQuestionCount] = useState(20)
  const [submitting, setSubmitting] = useState(false)

  // Post source state
  const [selectedPostId, setSelectedPostId] = useState('')
  const [selectedPostLabel, setSelectedPostLabel] = useState('')

  // Bulk-from-outline result
  const [bulkResult, setBulkResult] = useState<GenerateBulkResponseEntity | null>(null)

  const { mutateAsync: generateFromPost } = useQuizzesControllerGenerateFromPost()
  const { mutateAsync: generateFromFile } = useQuizzesControllerGenerateQuestions()
  const { mutateAsync: generateBulk } = useQuizzesControllerGenerateBulk()

  async function handleSubmit() {
    setSubmitting(true)
    try {
      if (source === 'course-outline') {
        if (!courseId) {
          toast.error('Please select a course')
          setSubmitting(false)
          return
        }
        const res = await generateBulk({ data: { courseId } })
        setBulkResult(res.data)
        toast.success(`Generated ${res.data.created.length} quiz(zes)`)
        return
      }

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

        const res = await generateFromFile({
          data: { file, courseId, questionCount },
        })
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

  const canSubmit =
    source === 'file' ? !!file && !!courseId : source === 'post' ? !!selectedPostId : !!courseId

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Generate Quiz" />

      <div className="flex-1 bg-card">
        <div className="max-w-[640px] mx-auto px-6 py-8 space-y-8">
          {/* Source toggle */}
          <div className="flex gap-2 p-1 bg-muted rounded-[8px]">
            {(['file', 'post', 'course-outline'] as const).map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSource(s)
                  setBulkResult(null)
                }}
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
                ) : s === 'post' ? (
                  <BookOpen className="size-3.5" strokeWidth={1.5} />
                ) : (
                  <ListChecks className="size-3.5" strokeWidth={1.5} />
                )}
                {s === 'file' ? 'Upload File' : s === 'post' ? 'From Post' : 'By Module'}
              </button>
            ))}
          </div>

          {source === 'file' ? (
            <>
              <FileSource file={file} onFileChange={setFile} disabled={submitting} />
              <CourseSelector
                deptId={deptId}
                yearLevel={yearLevel}
                courseId={courseId}
                onDeptChange={setDeptId}
                onYearChange={setYearLevel}
                onCourseChange={setCourseId}
                disabled={submitting}
              />
            </>
          ) : source === 'post' ? (
            <PostSource
              selectedPostId={selectedPostId}
              selectedPostLabel={selectedPostLabel}
              onSelect={(id, label) => {
                setSelectedPostId(id)
                setSelectedPostLabel(label)
              }}
              onClear={() => {
                setSelectedPostId('')
                setSelectedPostLabel('')
              }}
              disabled={submitting}
            />
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Generates one quiz per module in the course&apos;s outline (question count scales
                with each module&apos;s topic count). Modules with no outline entry are skipped —
                manage the outline from Departments &amp; Courses first.
              </p>
              <CourseSelector
                deptId={deptId}
                yearLevel={yearLevel}
                courseId={courseId}
                onDeptChange={setDeptId}
                onYearChange={setYearLevel}
                onCourseChange={setCourseId}
                disabled={submitting}
                onlyWithOutline
              />
            </>
          )}

          {source !== 'course-outline' && (
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
          )}

          {bulkResult && (
            <section className="space-y-2 border border-border rounded-[6px] p-4">
              <h3 className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                Results
              </h3>
              {bulkResult.created.map((c) => (
                <div key={c.quizId} className="flex items-center justify-between text-sm">
                  <span>
                    Module {c.moduleNumber} — {c.questionsCount} questions
                  </span>
                  <button
                    className="text-amber hover:underline"
                    onClick={() => router.push(`/quizzes/${c.quizId}`)}
                  >
                    View
                  </button>
                </div>
              ))}
              {bulkResult.failed.map((f) => (
                <div key={f.moduleNumber} className="text-sm text-destructive">
                  Module {f.moduleNumber} failed: {f.error}
                </div>
              ))}
            </section>
          )}

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
            ) : source === 'course-outline' ? (
              'Generate All Modules'
            ) : (
              'Generate Quiz'
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
