import { useState } from 'react'
import { Chip, shareInputClass } from '@/components/posts/share-ui'

type Course = { id: string; code: string; name: string; yearLevel?: number | null }

const FALLBACK_COURSES = 6
const SEARCH_RESULTS = 12

/** Chips for the student's courses, plus a search box behind "Other course…". */
export function ShareCourseField({
  courses,
  yearLevel,
  value,
  loading,
  suggestions = [],
  matching = false,
  suggestionsUnavailable = false,
  onSelect,
}: {
  courses: Course[]
  yearLevel?: number | null
  value: string
  loading: boolean
  suggestions?: Course[]
  matching?: boolean
  suggestionsUnavailable?: boolean
  onSelect: (courseId: string) => void
}) {
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')

  const mine = yearLevel
    ? courses.filter((c) => c.yearLevel === yearLevel)
    : courses.slice(0, FALLBACK_COURSES)
  const selected = courses.find((c) => c.id === value)
  const chips = selected && !mine.includes(selected) ? [...mine, selected] : mine

  const text = query.trim().toLowerCase()
  const results = text
    ? courses
        .filter((c) => `${c.code} ${c.name}`.toLowerCase().includes(text))
        .slice(0, SEARCH_RESULTS)
    : []

  function pick(courseId: string) {
    onSelect(courseId)
    setSearching(false)
    setQuery('')
  }

  return (
    <>
      {(suggestions.length > 0 || matching || suggestionsUnavailable) && (
        <div className="grid gap-2" aria-label="Course suggestions">
          <p className="m-0 text-[13px] font-medium text-muted-foreground">Suggested courses</p>
          {suggestions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestions.map((course) => (
                <Chip
                  key={course.id}
                  ariaLabel={`Suggested course ${course.code} ${course.name}`}
                  pressed={value === course.id}
                  onClick={() => onSelect(course.id)}
                >
                  {course.code}{' '}
                  <small className="text-xs font-normal opacity-75">{course.name}</small>
                </Chip>
              ))}
            </div>
          ) : matching ? (
            <p role="status" className="m-0 text-[13px] text-muted-foreground">
              Checking your files…
            </p>
          ) : (
            <p role="status" className="m-0 text-[13px] text-muted-foreground">
              Suggestions aren&apos;t available. You can choose a course below.
            </p>
          )}
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        {chips.map((c) => (
          <Chip key={c.id} pressed={value === c.id} onClick={() => onSelect(c.id)}>
            {c.code} <small className="text-xs font-normal opacity-75">{c.name}</small>
          </Chip>
        ))}
        <Chip pressed={false} expanded={searching} onClick={() => setSearching((open) => !open)}>
          Other course…
        </Chip>
      </div>
      {!loading && chips.length === 0 && !searching && (
        <p className="m-0 text-[13px] text-muted-foreground">No courses found.</p>
      )}
      {searching && (
        <div className="grid gap-2">
          <label htmlFor="sh-course-q" className="sr-only">
            Find a course
          </label>
          <input
            id="sh-course-q"
            autoFocus
            className={shareInputClass}
            placeholder="Search by code or name"
            autoComplete="off"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {results.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {results.map((c) => (
                <Chip key={c.id} pressed={value === c.id} onClick={() => pick(c.id)}>
                  {c.code} <small className="text-xs font-normal opacity-75">{c.name}</small>
                </Chip>
              ))}
            </div>
          )}
          {text && results.length === 0 && (
            <p className="m-0 text-[13px] text-muted-foreground">No courses found.</p>
          )}
        </div>
      )}
    </>
  )
}
