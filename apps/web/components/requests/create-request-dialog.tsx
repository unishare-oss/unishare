'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import {
  usePostRequestsControllerCreate,
  getPostRequestsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/post-requests/post-requests'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { MessageSquarePlus } from 'lucide-react'
import { toast } from 'sonner'

const ALL = '__all__'
const YEARS = [1, 2, 3, 4, 5, 6]

interface FormValues {
  title: string
  description: string
  courseId: string
}

export function CreateRequestDialog() {
  const [open, setOpen] = useState(false)
  const [dept, setDept] = useState(ALL)
  const [year, setYear] = useState(ALL)
  const qc = useQueryClient()

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormValues>()

  const { data: depts } = useDepartmentsControllerFindAll({ query: { select: (r) => r.data } })

  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100 },
    { query: { select: (r) => r.data } },
  )
  const allCourses = coursesData?.items ?? []
  const filteredCourses = allCourses.filter((c) => {
    const deptOk = dept === ALL || c.departmentId === dept
    const yearOk = year === ALL || c.yearLevel === Number(year)
    return deptOk && yearOk
  })

  const create = usePostRequestsControllerCreate({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getPostRequestsControllerFindAllQueryKey() })
        toast.success('Request posted!')
        reset()
        setDept(ALL)
        setYear(ALL)
        setOpen(false)
      },
      onError: () => toast.error('Failed to post request'),
    },
  })

  const onSubmit = (data: FormValues) => {
    create.mutate({
      data: {
        title: data.title,
        description: data.description || undefined,
        courseId: data.courseId,
      },
    })
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <MessageSquarePlus className="size-4" strokeWidth={1.5} />
          New Request
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>New Resource Request</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">What do you need?</Label>
            <Input
              id="title"
              placeholder="e.g. Data Structures midterm notes"
              {...register('title', {
                required: 'Title is required',
                maxLength: { value: 200, message: 'Max 200 characters' },
              })}
            />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>

          {/* Dept + Year narrow down the course list */}
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
              <Label>Department</Label>
              <Select
                value={dept}
                onValueChange={(v) => {
                  setDept(v)
                  setValue('courseId', '')
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All depts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All depts</SelectItem>
                  {(depts ?? []).map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Year</Label>
              <Select
                value={year}
                onValueChange={(v) => {
                  setYear(v)
                  setValue('courseId', '')
                }}
              >
                <SelectTrigger className="text-xs h-9">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All years</SelectItem>
                  {YEARS.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Year {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="course">Course</Label>
            <Select onValueChange={(v) => setValue('courseId', v, { shouldValidate: true })}>
              <SelectTrigger id="course">
                <SelectValue placeholder="Select a course" />
              </SelectTrigger>
              <SelectContent>
                {filteredCourses.length === 0 && (
                  <SelectItem value="__none__" disabled>
                    No courses match
                  </SelectItem>
                )}
                {filteredCourses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.courseId && <p className="text-xs text-destructive">Course is required</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">
              Details <span className="text-text-muted">(optional)</span>
            </Label>
            <Textarea
              id="description"
              placeholder="Add more context — which chapter, what semester, etc."
              rows={3}
              className="resize-none"
              {...register('description', {
                maxLength: { value: 2000, message: 'Max 2000 characters' },
              })}
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? 'Posting…' : 'Post Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
