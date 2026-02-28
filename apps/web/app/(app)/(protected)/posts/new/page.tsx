'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePostsControllerCreate } from '@/src/lib/api/generated/posts/posts'
import { storageControllerGetPresignedUploadUrl } from '@/src/lib/api/generated/storage/storage'
import {
  PresignedUploadDtoPurpose,
  type PresignedUploadEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { filesControllerConfirmUpload } from '@/src/lib/api/generated/files/files'
import { PageHeader } from '@/components/shared/page-header'
import { StepIndicator } from '@/components/posts/step-indicator'
import { TypeStep, type PostType } from '@/components/posts/type-step'
import { CourseStep } from '@/components/posts/course-step'
import { DetailsStep } from '@/components/posts/details-step'
import { FilesStep } from '@/components/posts/files-step'
import { StepNav } from '@/components/posts/step-nav'

const steps = ['TYPE', 'COURSE', 'DETAILS', 'FILES'] as const

export default function CreatePostPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [postType, setPostType] = useState<PostType | null>(null)
  const [selectedDept, setSelectedDept] = useState('')
  const [selectedCourse, setSelectedCourse] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [year, setYear] = useState('')
  const [semester, setSemester] = useState('')
  const [moduleNum, setModuleNum] = useState('')
  const [examYear, setExamYear] = useState('')
  const [externalUrl, setExternalUrl] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [submitting, setSubmitting] = useState(false)

  const { mutateAsync: createPost } = usePostsControllerCreate()

  const canProceed =
    currentStep === 0
      ? postType !== null
      : currentStep === 1
        ? selectedDept !== '' && selectedCourse !== ''
        : currentStep === 2
          ? title.trim() !== ''
          : true

  async function handleSubmit() {
    if (!postType) return
    setSubmitting(true)
    try {
      const res = await createPost({
        data: {
          type: postType as unknown as Record<string, unknown>,
          courseId: selectedCourse,
          title: title.trim() || undefined,
          description: description.trim() || undefined,
          externalUrl: externalUrl.trim() || undefined,
          year: year ? Number(year) : undefined,
          semester: semester ? Number(semester) : undefined,
          moduleNumber: moduleNum ? Number(moduleNum) : undefined,
          examYear: examYear ? Number(examYear) : undefined,
        },
      })

      const post = (res as unknown as { data: { id: string } }).data

      for (const file of files) {
        const uploadType = file.type.startsWith('image/') ? 'image' : 'document'
        const presignedRes = await storageControllerGetPresignedUploadUrl({
          mimeType: file.type,
          uploadType: uploadType as unknown as Record<string, unknown>,
          purpose: PresignedUploadDtoPurpose['post-attachment'],
        })
        const { url, key } = presignedRes.data as PresignedUploadEntity

        await fetch(url, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        })

        await filesControllerConfirmUpload(post.id, {
          key,
          name: file.name,
          size: file.size,
          mimeType: file.type,
        })
      }

      router.push(`/posts/${post.id}`)
    } catch {
      setSubmitting(false)
    }
  }

  function handleNext() {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      handleSubmit()
    }
  }

  function handleBack() {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="New Post" />

      <div className="flex-1 bg-card">
        <div className="max-w-[640px] mx-auto px-6 py-8">
          <StepIndicator steps={steps} currentStep={currentStep} />

          {currentStep === 0 && <TypeStep postType={postType} onSelect={setPostType} />}

          {currentStep === 1 && (
            <CourseStep
              selectedDept={selectedDept}
              selectedCourse={selectedCourse}
              onDeptChange={setSelectedDept}
              onCourseChange={setSelectedCourse}
            />
          )}

          {currentStep === 2 && (
            <DetailsStep
              postType={postType}
              title={title}
              description={description}
              year={year}
              semester={semester}
              moduleNum={moduleNum}
              examYear={examYear}
              externalUrl={externalUrl}
              onTitleChange={setTitle}
              onDescriptionChange={setDescription}
              onYearChange={setYear}
              onSemesterChange={setSemester}
              onModuleNumChange={setModuleNum}
              onExamYearChange={setExamYear}
              onExternalUrlChange={setExternalUrl}
            />
          )}

          {currentStep === 3 && (
            <FilesStep
              files={files}
              onAddFiles={(picked) => setFiles((prev) => [...prev, ...picked])}
              onRemove={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))}
            />
          )}

          <StepNav
            currentStep={currentStep}
            totalSteps={steps.length}
            canProceed={canProceed}
            loading={submitting}
            onBack={handleBack}
            onNext={handleNext}
          />
        </div>
      </div>
    </div>
  )
}
