'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import {
  getMyCoursesControllerGetMineQueryKey,
  useMyCoursesControllerSaveMine,
} from '@/src/lib/api/generated/users/users'
import type { MyCourseEntity, MyCoursesEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatAcademicYear, pluralize } from '@/lib/utils'

// The department list is capped at the endpoint's supported page size.
const DEPARTMENT_COURSE_LIMIT = 100

function yearLabel(course: MyCourseEntity): string {
  return course.yearLevel ? `Year ${course.yearLevel}` : 'Any year'
}

function courseCount(count: number): string {
  return `${count} ${pluralize(count, 'course')}`
}

interface MyCoursesDialogProps {
  courses: MyCoursesEntity
  departmentId: string
  onOpenChange: (open: boolean) => void
}

export function MyCoursesDialog({ courses, departmentId, onOpenChange }: MyCoursesDialogProps) {
  const [draft, setDraft] = useState(() => new Set(courses.final.map((course) => course.id)))
  const [search, setSearch] = useState('')
  const searchRef = useRef<HTMLInputElement>(null)
  const saveRef = useRef<HTMLButtonElement>(null)
  const queryClient = useQueryClient()
  const {
    data: departmentCourses,
    isPending: coursesPending,
    isError: coursesError,
  } = useCoursesControllerFindAll(
    { departmentId, limit: DEPARTMENT_COURSE_LIMIT },
    { query: { select: (response) => response.data } },
  )
  const save = useMyCoursesControllerSaveMine({
    mutation: {
      onSuccess: () => {
        void queryClient.invalidateQueries({ queryKey: getMyCoursesControllerGetMineQueryKey() })
        onOpenChange(false)
        toast.success(`Saved. Reminders follow your ${courseCount(draft.size)} this year.`)
      },
      onError: () => toast.error('Failed to save courses'),
    },
  })

  const automaticIds = new Set(courses.automatic.map((course) => course.id))
  const query = search.trim().toLowerCase()
  const others = (departmentCourses?.items ?? []).filter(
    (course) =>
      !automaticIds.has(course.id) &&
      (!query || `${course.code} ${course.name}`.toLowerCase().includes(query)),
  )

  function toggle(id: string) {
    setDraft((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function courseRow(course: MyCourseEntity, { showYear = false }: { showYear?: boolean } = {}) {
    return (
      <label
        key={course.id}
        className="flex cursor-pointer items-center gap-[12px] rounded-(--r-s) p-[8px] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2"
      >
        <input
          type="checkbox"
          aria-label={`${course.code} ${course.name}${showYear ? ` ${yearLabel(course)}` : ''}`}
          checked={draft.has(course.id)}
          onChange={() => toggle(course.id)}
          className="size-[18px] shrink-0 accent-brand-edge"
        />
        <span className="grid min-w-0 flex-1 leading-[1.3]">
          <b className="text-[14px] leading-[1.3]">{course.code}</b>
          <small className="truncate text-[12px] leading-[1.3] text-muted-foreground">
            {course.name}
          </small>
        </span>
        {showYear && (
          <em className="font-mono text-[11px] whitespace-nowrap not-italic text-muted-foreground">
            {yearLabel(course)}
          </em>
        )}
      </label>
    )
  }

  return (
    <Dialog defaultOpen onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          if (courses.automatic.length === 0) searchRef.current?.focus({ preventScroll: true })
          else saveRef.current?.focus({ preventScroll: true })
        }}
        className="max-h-[min(660px,calc(100vh-2rem))] w-[min(460px,calc(100%-2rem))] max-w-none gap-[14px] overflow-y-auto rounded-(--r-l) border-0 bg-surface p-[22px]"
      >
        <DialogHeader className="gap-2 text-left">
          <DialogTitle className="font-display text-[22px] leading-tight">
            Your courses for {formatAcademicYear(courses.academicYear)}
          </DialogTitle>
          <DialogDescription className="text-sm">
            {courses.automatic.length === 0
              ? 'We found no courses for your year. Add the ones you take from your department.'
              : "We picked these from your department and year. Untick any you're not taking."}
          </DialogDescription>
        </DialogHeader>

        {courses.automatic.length > 0 && (
          <div className="grid gap-0.5">{courses.automatic.map((course) => courseRow(course))}</div>
        )}

        <div className="grid gap-1.5 border-t border-line pt-3">
          <b className="text-sm">Add from your department</b>
          <label className="sr-only" htmlFor="my-courses-search">
            Search department courses
          </label>
          <Input
            ref={searchRef}
            id="my-courses-search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by code or name"
            autoComplete="off"
            className="border-[1.5px] border-line bg-surface text-sm shadow-none focus-visible:border-sky focus-visible:ring-0"
          />
          <div className="grid max-h-[210px] gap-0.5 overflow-y-auto">
            {coursesPending ? (
              <p className="m-1 text-[13px] text-muted-foreground">Loading courses…</p>
            ) : coursesError ? (
              <p className="m-1 text-[13px] text-muted-foreground">
                Could not load department courses.
              </p>
            ) : others.length > 0 ? (
              others.map((course) => courseRow(course, { showYear: true }))
            ) : (
              <p className="m-1 text-[13px] text-muted-foreground">
                No course in your department matches.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row flex-wrap justify-end gap-2.5">
          <Button type="button" variant="quiet" size="sm" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            ref={saveRef}
            type="button"
            variant="brand"
            size="sm"
            disabled={save.isPending}
            onClick={() => save.mutate({ data: { courseIds: [...draft] } })}
          >
            Save {courseCount(draft.size)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
