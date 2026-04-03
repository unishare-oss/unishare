'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Upload, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { PageHeader } from '@/components/shared/page-header'
import {
  useQuizzesControllerGenerateFromPost,
  useQuizzesControllerGenerateQuestions,
} from '@/src/lib/api/generated/quizzes/quizzes'
import { cn } from '@/lib/utils'
import { CourseSelector } from '@/components/quiz/admin/CourseSelector'
import { FileSource } from '@/components/quiz/admin/FileSource'
import { PostSource } from '@/components/quiz/admin/PostSource'

type Source = 'file' | 'post'

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

  const { mutateAsync: generateFromPost } = useQuizzesControllerGenerateFromPost()
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
          ) : (
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
