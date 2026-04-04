'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { X } from 'lucide-react'

interface Department {
  id: string
  name: string
}

interface Course {
  id: string
  code: string
  name: string
}

interface QuizBrowseFiltersProps {
  departmentId: string
  courseId: string
  departments: Department[]
  courses: Course[]
  onDepartmentChange: (v: string) => void
  onCourseChange: (v: string) => void
  onClear: () => void
}

export function QuizBrowseFilters({
  departmentId,
  courseId,
  departments,
  courses,
  onDepartmentChange,
  onCourseChange,
  onClear,
}: QuizBrowseFiltersProps) {
  const hasFilters = !!departmentId || !!courseId

  return (
    <div className="flex items-center gap-2">
      <Select value={departmentId} onValueChange={onDepartmentChange}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder="All departments" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((d) => (
            <SelectItem key={d.id} value={d.id}>
              {d.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={courseId} onValueChange={onCourseChange} disabled={!departmentId}>
        <SelectTrigger className="flex-1">
          <SelectValue placeholder={departmentId ? 'All courses' : 'Select dept first'} />
        </SelectTrigger>
        <SelectContent>
          {courses.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.code} — {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onClear}
          className="shrink-0"
          title="Clear filters"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </div>
  )
}
