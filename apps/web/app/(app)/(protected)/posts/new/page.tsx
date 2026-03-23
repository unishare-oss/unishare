'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { type FieldPath, type FieldPathValue, useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { useAuth } from '@/contexts/auth-context'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { TriangleAlert } from 'lucide-react'

const steps = ['TYPE', 'COURSE', 'DETAILS', 'FILES'] as const

const postTypeSchema = z.enum(['NOTE', 'OLD_QUESTION', 'ASSIGNMENT'])
type PostCreateType = z.infer<typeof postTypeSchema>

const createPostFormSchema = z
  .object({
    postType: postTypeSchema.nullable().refine((value) => value !== null, 'Post type is required'),
    selectedDept: z.string(),
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
    if (
      values.postType === 'NOTE' ||
      values.postType === 'OLD_QUESTION' ||
      values.postType === 'ASSIGNMENT'
    ) {
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
  isAnonymous: false,
  year: '',
  semester: '',
  moduleNum: '',
  examYear: '',
  externalUrl: '',
  files: [],
  tags: [],
}

function getInvalidStep(values: CreatePostFormValues) {
  if (!postTypeSchema.nullable().safeParse(values.postType).success || !values.postType) {
    return 0
  }

  const yearValid = yearSchema.safeParse(values.year).success
  if (!yearValid || !values.selectedCourse) {
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
  const [showOldQuestionWarning, setShowOldQuestionWarning] = useState(false)

  // Keep validation live so step gating and field feedback stay in sync as the user fills each stage.
  const form = useForm<CreatePostFormValues>({ defaultValues, mode: 'onChange' })
  const { mutateAsync: createPost } = usePostsControllerCreate()
  const { user: me, isLoading: mePending } = useAuth()
  const values = useWatch({
    control: form.control,
    defaultValue: defaultValues,
  }) as CreatePostFormValues

  const yearDirty = !!form.formState.dirtyFields.year

  useEffect(() => {
    if (!me?.yearLevel) return
    if (values.year) return
    if (yearDirty) return

    form.setValue('year', String(me.yearLevel), { shouldDirty: false, shouldTouch: false })
  }, [form, me?.yearLevel, values.year, yearDirty])

  // Pre-fill exported board image from canvas "Post to UniShare" flow
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
      const file = new File([arr], filename, { type: mime })
      form.setValue('files', [file])
    } catch {
      // Silently ignore malformed sessionStorage data
    }
  }, [form])

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
        ? yearSchema.safeParse(values.year).success && !!values.selectedCourse
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
          isAnonymous: formValues.isAnonymous,
          externalUrl: formValues.externalUrl?.trim() || undefined,
          tags: formValues.tags.length > 0 ? formValues.tags : undefined,
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
                if (type === 'OLD_QUESTION') {
                  setShowOldQuestionWarning(true)
                } else {
                  updateField('postType', type)
                }
              }}
            />
          )}

          {currentStep === 1 && (
            <CourseStep
              selectedYear={values.year}
              onYearChange={(year) => {
                updateField('year', year)
                updateField('selectedCourse', '')
              }}
              selectedCourse={values.selectedCourse}
              departmentId={me?.department?.id ?? undefined}
              meLoading={mePending}
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
      <AlertDialog open={showOldQuestionWarning} onOpenChange={setShowOldQuestionWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogMedia className="bg-destructive/10">
              <TriangleAlert className="size-8 text-destructive" strokeWidth={1.5} />
            </AlertDialogMedia>
            <AlertDialogTitle className="text-destructive">
              Sharing past exam papers
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  By uploading past exam papers or question banks, you confirm that you have the
                  right to share this material.
                </p>
                <p>
                  You are <span className="font-bold text-destructive">solely responsible</span> for
                  ensuring it does not violate your institution&apos;s{' '}
                  <span className="font-bold text-destructive">academic integrity policies</span> or
                  any applicable <span className="font-bold text-destructive">copyright laws</span>.
                </p>
                <p>
                  UniShare is <span className="font-bold text-destructive">not liable</span> for any
                  consequences arising from sharing restricted materials.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => updateField('postType', null)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                updateField('postType', 'OLD_QUESTION')
                setShowOldQuestionWarning(false)
              }}
            >
              I understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
