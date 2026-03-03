'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { type FieldPath, type FieldPathValue, useForm } from 'react-hook-form'
import { z } from 'zod'
import { usePostsControllerCreate } from '@/src/lib/api/generated/posts/posts'
import { storageControllerGetPresignedUploadUrl } from '@/src/lib/api/generated/storage/storage'
import {
  PresignedUploadDtoPurpose,
  PresignedUploadDtoUploadType,
  type PresignedUploadEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { filesControllerConfirmUpload } from '@/src/lib/api/generated/files/files'
import { PageHeader } from '@/components/shared/page-header'
import { StepIndicator } from '@/components/posts/step-indicator'
import { TypeStep, type PostType } from '@/components/posts/type-step'
import { CourseStep } from '@/components/posts/course-step'
import { DetailsStep } from '@/components/posts/details-step'
import type { CreatePostFormValues } from '@/components/posts/create-post-form.types'
import { FilesStep } from '@/components/posts/files-step'
import { StepNav } from '@/components/posts/step-nav'

const steps = ['TYPE', 'COURSE', 'DETAILS', 'FILES'] as const

const postTypeSchema = z.enum(['NOTE', 'OLD_QUESTION'])
type PostCreateType = z.infer<typeof postTypeSchema>

const yearSchema = z.string().refine((value) => {
  const yearNumber = Number(value)
  return value !== '' && !Number.isNaN(yearNumber) && yearNumber >= 1 && yearNumber <= 6
}, 'Year must be between 1 and 6')

const semesterSchema = z.string().refine((value) => {
  const semesterNumber = Number(value)
  return value !== '' && !Number.isNaN(semesterNumber) && semesterNumber >= 1 && semesterNumber <= 3
}, 'Semester must be between 1 and 3')

const moduleNumberSchema = z.string().refine((value) => {
  const moduleNumber = Number(value)
  return value !== '' && !Number.isNaN(moduleNumber) && moduleNumber >= 1 && moduleNumber <= 20
}, 'Module number must be between 1 and 20')

const examYearSchema = z.string().refine((value) => {
  const parsedExamYear = Number(value)
  return (
    value !== '' &&
    !Number.isNaN(parsedExamYear) &&
    parsedExamYear >= 1900 &&
    parsedExamYear <= 2100
  )
}, 'Exam year must be between 1900 and 2100')

const externalUrlSchema = z
  .union([
    z.literal(''),
    z
      .string()
      .trim()
      .url('External URL must be a valid URL')
      .refine((value) => {
        return value.startsWith('https://')
      }, 'External URL must be a valid URL'),
  ])
  .optional()

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
      const examYearResult = examYearSchema.safeParse(values.examYear)
      if (!examYearResult.success) {
        for (const issue of examYearResult.error.issues) {
          ctx.addIssue({
            ...issue,
            path: ['examYear'],
          })
        }
      }
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
        const uploadType = file.type.startsWith('image/')
          ? PresignedUploadDtoUploadType.image
          : PresignedUploadDtoUploadType.document
        const presignedRes = await storageControllerGetPresignedUploadUrl({
          mimeType: file.type,
          uploadType,
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
              files={values.files}
              onAddFiles={(picked) => {
                updateField('files', [...form.getValues('files'), ...picked])
              }}
              onRemove={(index) => {
                updateField(
                  'files',
                  form.getValues('files').filter((_, currentIndex) => currentIndex !== index),
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
