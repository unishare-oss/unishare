'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { PostType } from '@/lib/mock-data'
import { PageHeader } from '@/components/shared/page-header'
import { StepIndicator } from '@/components/posts/step-indicator'
import { TypeStep } from '@/components/posts/type-step'
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
  const [files, setFiles] = useState<{ id: string; name: string; size: string }[]>([])

  const canProceed =
    currentStep === 0
      ? postType !== null
      : currentStep === 1
        ? selectedDept !== '' && selectedCourse !== ''
        : currentStep === 2
          ? title.trim() !== ''
          : true

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1)
    } else {
      router.push('/')
    }
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const handleFileDrop = () => {
    setFiles((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: `Document_${prev.length + 1}.pdf`,
        size: `${(Math.random() * 5 + 0.5).toFixed(1)} MB`,
      },
    ])
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
              onAdd={handleFileDrop}
              onRemove={(i) => setFiles((prev) => prev.filter((_, j) => j !== i))}
            />
          )}

          <StepNav
            currentStep={currentStep}
            totalSteps={steps.length}
            canProceed={canProceed}
            onBack={handleBack}
            onNext={handleNext}
          />
        </div>
      </div>
    </div>
  )
}
