'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type FieldPath, type FieldPathValue, useForm } from 'react-hook-form'
import { z } from 'zod'
import { usePostsControllerCreate } from '@/src/lib/api/generated/posts/posts'
import { filesControllerConfirmUpload } from '@/src/lib/api/generated/files/files'
import { PageHeader } from '@/components/shared/page-header'
import { StepIndicator } from '@/components/posts/step-indicator'
import { TypeStep, type PostType } from '@/components/posts/type-step'
import { CourseStep } from '@/components/posts/course-step'
import { DetailsStep } from '@/components/posts/details-step'
import { FilesStep } from '@/components/posts/files-step'
import type { CreatePostFormValues } from '@/lib/posts/form-types'
import { uploadPostFile } from '@/lib/posts/upload-post-file'
import {
  addExamYearIssueIfPresent,
  externalUrlSchema,
  moduleNumberSchema,
  semesterSchema,
  yearSchema,
} from '@/lib/posts/form-schema'
import { StepNav } from '@/components/posts/step-nav'

const steps = ['TYPE', 'COURSE', 'DETAILS', 'FILES'] as const

const postTypeSchema = z.enum(['NOTE', 'OLD_QUESTION'])
type PostCreateType = z.infer<typeof postTypeSchema>

const createPostFormSchema = z
  .object({
    postType: postTypeSchema.nullable().refine((value) => value !== null, 'Post type is required'),
    selectedDept: z.string().min(1, 'Department is required'),
    selectedCourse: z.string().min(1, 'Course is required'),
    title: z.string().trim().min(3, 'Title must be at least 3 characters'),
    description: z.string().trim().min(1, 'Description is required'),
    year: yearSchema,
    semester: semesterSchema,
    moduleNum: z.string(),
    examYear: z.string(),
    externalUrl: externalUrlSchema,
    files: z.array(z.custom<File>((value) => value instanceof File)),
  })
  .superRefine((values, ctx) => {
    // Keep type-specific errors attached to the matching field after merging step validation into one schema.
    if (values.postType === 'NOTE' || values.postType === 'OLD_QUESTION') {
      const moduleResult = moduleNumberSchema.safeParse(values.moduleNum)
      if (!moduleResult.success) {
        for (const issue of moduleResult.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ['moduleNum'],
          })
        }
      }
    }

    if (values.postType === 'OLD_QUESTION') {
      addExamYearIssueIfPresent(values.examYear, ctx)
    }
  })

const defaultValues: CreatePostFormValues = {
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

function getInvalidStep(values: CreatePostFormValues) {
  if (!postTypeSchema.nullable().safeParse(values.postType).success || !values.postType) {
    return 0
  }

  if (!values.selectedDept || !values.selectedCourse) {
    return 1
  }

  if (!createPostFormSchema.safeParse(values).success) {
    return 2
  }

  return null
}

export default function CreatePostPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Keep validation live so step gating and field feedback stay in sync as the user fills each stage.
  const form = useForm<CreatePostFormValues>({ defaultValues, mode: 'onChange' })
  const { mutateAsync: createPost } = usePostsControllerCreate()
  const values = form.watch()

  function updateField<K extends FieldPath<CreatePostFormValues>>(
    field: K,
    value: FieldPathValue<CreatePostFormValues, K>,
  ) {
    form.setValue(field, value)
  }

  const canProceed =
    currentStep === 0
      ? !!values.postType
      : currentStep === 1
        ? !!values.selectedDept && !!values.selectedCourse
        : currentStep === 2
          ? createPostFormSchema.safeParse(values).success
          : true

  async function handleSubmit() {
    const formValues = form.getValues()

    const invalidStep = getInvalidStep(formValues)

    if (invalidStep !== null) {
      setCurrentStep(invalidStep)
      return
    }

    if (!formValues.postType) return

    setSubmitting(true)
    try {
      const res = await createPost({
        data: {
          type: formValues.postType as PostCreateType,
          courseId: formValues.selectedCourse,
          title: formValues.title.trim(),
          description: formValues.description.trim(),
          externalUrl: formValues.externalUrl?.trim() || undefined,
          year: Number(formValues.year),
          semester: Number(formValues.semester),
          moduleNumber: Number(formValues.moduleNum),
          examYear: formValues.examYear ? Number(formValues.examYear) : undefined,
        },
      })

      const post = res.data

      for (const file of formValues.files) {
        const uploadedFile = await uploadPostFile(file)
        await filesControllerConfirmUpload(post.id, uploadedFile)
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
      void handleSubmit()
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

          {currentStep === 0 && (
            <TypeStep
              postType={values.postType as PostType | null}
              onSelect={(type) => {
                updateField('postType', type)
              }}
            />
          )}

          {currentStep === 1 && (
            <CourseStep
              selectedDept={values.selectedDept}
              selectedCourse={values.selectedCourse}
              onDeptChange={(dept) => {
                updateField('selectedDept', dept)
                updateField('selectedCourse', '')
              }}
              onCourseChange={(course) => {
                updateField('selectedCourse', course)
              }}
            />
          )}

          {currentStep === 2 && (
            <DetailsStep form={form} postType={values.postType as PostType | null} />
          )}

          {currentStep === 3 && (
            <FilesStep
              items={values.files.map((file, index) => ({
                id: String(index),
                name: file.name,
                size: file.size,
                mimeType: file.type,
              }))}
              onAddFiles={(picked) => {
                updateField('files', [...form.getValues('files'), ...picked])
              }}
              onRemove={(fileId) => {
                updateField(
                  'files',
                  form
                    .getValues('files')
                    .filter((_, currentIndex) => String(currentIndex) !== fileId),
                )
              }}
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
