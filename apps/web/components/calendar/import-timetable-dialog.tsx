'use client'

import { useRef, useState } from 'react'
import { Clock3, FileText, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
import { useAuth } from '@/contexts/auth-context'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUniversitiesControllerFindAll } from '@/src/lib/api/generated/universities/universities'
import {
  useExamsControllerBulkCreate,
  useExamsControllerParseImport,
  getExamsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/exams/exams'
import { ApiError } from '@/src/lib/api/fetcher'
import { reportServerError } from '@/src/lib/api/report-server-error'
import { type BulkCreateExamsDto } from '@/src/lib/api/generated/unishareAPI.schemas'
import { useQueryClient } from '@tanstack/react-query'
import { ImportTimetableReview } from './import-timetable-review'
import { formatExamDateTime, isResolved } from './import-timetable-rows'
import type { ReviewRow } from './import-timetable.types'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const
const STEPS = ['upload', 'review', 'done'] as const

function isSupportedMimeType(mimeType: string): boolean {
  return MIME_TYPES.includes(mimeType as (typeof MIME_TYPES)[number])
}

type Step = (typeof STEPS)[number]

const WARNING_NOTE_CLASS = 'm-0 shrink-0 bg-warn-soft px-5 py-2 text-sm text-warn sm:px-7'
const PARSE_ERROR_FALLBACK = 'Could not read this timetable. Please try again.'

function showParseError(error: unknown) {
  // Any 4xx (no text, too large, wrong type, permissions), 502 and 503 (AI off or busy) carry clear
  // server messages.
  const clearStatus = (status: number) =>
    (status >= 400 && status < 500) || [502, 503].includes(status)
  if (error instanceof ApiError && clearStatus(error.status) && error.message) {
    toast.error(error.message)
  } else if (error instanceof ApiError && error.status >= 500 && error.traceId) {
    reportServerError(error)
  } else {
    toast.error(PARSE_ERROR_FALLBACK)
  }
}

function pluralLabel(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural
}

function examLabel(count: number, includeCount = true): string {
  const label = pluralLabel(count, 'exam', 'exams')
  return includeCount ? `${count} ${label}` : label
}

interface ImportTimetableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function toLocalIso(date: string, time: string): string | null {
  if (!date || !time) return null
  const value = new Date(`${date}T${time}:00`)
  return Number.isNaN(value.getTime()) ? null : value.toISOString()
}

function toExam(row: ReviewRow): BulkCreateExamsDto['exams'][number] | null {
  if (!isResolved(row) || !row.courseId || !row.title.trim()) {
    return null
  }

  const startsAt = toLocalIso(row.date, row.startsAt)
  if (!startsAt) return null

  let endsAt: string | null = null
  if (row.endsAt) {
    endsAt = toLocalIso(row.date, row.endsAt)
    if (!endsAt || endsAt <= startsAt) return null
  }

  return {
    courseId: row.courseId,
    title: row.title.trim(),
    startsAt,
    ...(endsAt ? { endsAt } : {}),
    ...(row.examRoom?.trim() ? { examRoom: row.examRoom.trim() } : {}),
  }
}

function formatFileSize(size: number): string {
  if (size < 1024) return `${size} bytes`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

function getTimezoneLabel(): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const offsetMinutes = -new Date().getTimezoneOffset()
  const sign = offsetMinutes < 0 ? '-' : '+'
  const hours = String(Math.floor(Math.abs(offsetMinutes) / 60)).padStart(2, '0')
  const minutes = String(Math.abs(offsetMinutes) % 60).padStart(2, '0')
  return `${timeZone} (UTC${sign}${hours}:${minutes})`
}

export function ImportTimetableDialog({ open, onOpenChange }: ImportTimetableDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-24px)] max-w-none flex-col overflow-visible rounded-2xl p-0 max-[639px]:h-[100dvh] max-[639px]:max-h-none max-[639px]:w-screen max-[639px]:rounded-none sm:max-w-[940px]">
        {open && <ImportTimetableDialogContent onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ImportTimetableDialogContent({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [universityId, setUniversityId] = useState('')
  const { data: universities } = useUniversitiesControllerFindAll({
    query: { select: (response) => response.data, enabled: isAdmin },
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [droppedCount, setDroppedCount] = useState(0)
  const [unreadableChunkCount, setUnreadableChunkCount] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { mutateAsync: parseImport, isPending: parsing } = useExamsControllerParseImport({
    mutation: { meta: { reportServerError: false } },
  })
  const {
    mutateAsync: bulkCreate,
    isPending: publishing,
    data: bulkCreateResult,
  } = useExamsControllerBulkCreate()

  function selectFile(file?: File) {
    if (!file) return
    if (!isSupportedMimeType(file.type)) {
      toast.error('Choose a PDF or Word document')
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error('The file must be 10 MB or smaller')
      return
    }

    setSelectedFile(file)
  }

  async function readTimetable() {
    if (!selectedFile) return
    try {
      const parsed = await parseImport({
        data: { file: selectedFile, ...(isAdmin ? { universityId } : {}) },
      })
      setRows(parsed.data.rows.map((row, rowId) => ({ ...row, rowId })))
      setDroppedCount(parsed.data.droppedCount)
      setUnreadableChunkCount(parsed.data.unreadableChunkCount)
      setStep('review')
    } catch (error) {
      showParseError(error)
    } finally {
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  function updateRow(rowId: number, update: Partial<ReviewRow>) {
    setRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, ...update } : row)))
  }

  async function publish() {
    const exams = rows.flatMap((row) => {
      const exam = toExam(row)
      return exam ? [exam] : []
    })
    if (exams.length !== rows.length || exams.length === 0) return

    try {
      await bulkCreate({ data: { exams } })
      setStep('done')
      await queryClient.invalidateQueries({ queryKey: getExamsControllerFindAllQueryKey() })
    } catch {
      toast.error('Could not publish these exams. Please try again.')
    }
  }

  const canPublish = rows.length > 0 && rows.every((row) => toExam(row) !== null)
  const publishResult = bulkCreateResult?.data
  const skipped = publishResult?.skipped ?? []
  const existingSkipped = skipped.filter(({ reason }) => reason === 'existing').length
  const duplicateSkipped = skipped.filter(({ reason }) => reason === 'duplicate_in_request').length
  const skippedDetails = [
    existingSkipped > 0 ? `${existingSkipped} already on the calendar` : null,
    duplicateSkipped > 0
      ? `${duplicateSkipped} ${pluralLabel(duplicateSkipped, 'duplicate row', 'duplicate rows')} in this file`
      : null,
  ].filter((detail) => detail !== null)
  const skippedDescription = skippedDetails.length > 0 ? skippedDetails.join(' · ') : 'skipped'

  const timezone = getTimezoneLabel()

  return (
    <>
      <DialogHeader className="shrink-0 gap-3 border-b border-line px-5 pt-5 sm:px-7">
        <div className="pr-10 text-left">
          <DialogTitle className="font-display text-2xl text-ink">
            Import exam timetable
          </DialogTitle>
          <DialogDescription className="mt-1 text-sm text-text-muted">
            Upload the official timetable, check the rows, then publish them to the calendar.
          </DialogDescription>
        </div>
        <nav className="flex gap-6" aria-label="Import steps">
          {STEPS.map((name, index) => {
            const current = step === name
            const complete = STEPS.indexOf(step) > index
            return (
              <span
                key={name}
                aria-current={current ? 'step' : undefined}
                className={`relative inline-flex items-center gap-2 px-0 pb-2 pt-1 text-sm ${
                  current ? 'font-semibold text-ink' : 'text-text-muted'
                }`}
              >
                {current && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-[-1px] h-[3px] rounded-t bg-brand-edge"
                  />
                )}
                <span
                  className={`grid size-5 place-items-center rounded-full text-[11px] font-semibold ${
                    complete
                      ? 'bg-ok text-white'
                      : current
                        ? 'bg-ink text-surface'
                        : 'bg-surface-2 text-text-muted'
                  }`}
                >
                  {index + 1}
                </span>
                {name[0].toUpperCase() + name.slice(1)}
              </span>
            )
          })}
        </nav>
      </DialogHeader>

      {step === 'upload' && !parsing && (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="sr-only"
            aria-label="Choose exam timetable file"
            onChange={(event) => selectFile(event.currentTarget.files?.[0])}
          />
          {isAdmin && (
            <div className="mb-4 grid gap-2">
              <label htmlFor="import-university" className="text-sm font-medium text-ink">
                University
              </label>
              <Select value={universityId} onValueChange={setUniversityId}>
                <SelectTrigger id="import-university" aria-label="University" className="w-full">
                  <SelectValue placeholder="Choose a university" />
                </SelectTrigger>
                <SelectContent>
                  {universities?.map((university) => (
                    <SelectItem key={university.id} value={university.id}>
                      {university.name} ({university.shortName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault()
              selectFile(event.dataTransfer.files[0])
            }}
            className="grid min-h-64 justify-items-center gap-3 rounded-2xl border-2 border-dashed border-edge bg-surface-2 px-6 py-7 text-center"
          >
            <UploadCloud className="size-9 text-brand-edge" aria-hidden="true" />
            <p className="m-0 font-semibold text-ink">Drop the timetable here or choose a file</p>
            <p className="m-0 max-w-[46ch] text-sm text-text-muted">
              PDF or Word with selectable text, up to 10 MB and about 500 exams. Scanned timetables
              aren&apos;t supported yet.
            </p>
            <Button type="button" variant="quiet" onClick={() => inputRef.current?.click()}>
              Choose file
            </Button>
          </div>
          {selectedFile && (
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-line bg-surface px-3 py-2.5">
              <FileText className="size-5 shrink-0 text-text-muted" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{selectedFile.name}</span>
              <span className="shrink-0 text-xs text-text-muted">
                {formatFileSize(selectedFile.size)}
              </span>
            </div>
          )}
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink">
            <Clock3 className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden="true" />
            <span>
              Times are read as printed and use your timezone: <strong>{timezone}</strong>.
            </span>
          </div>
        </div>
      )}

      {parsing && (
        <div className="grid min-h-64 flex-1 place-items-center px-5 py-9 text-center sm:px-7">
          <div className="grid justify-items-center gap-3">
            <strong className="text-ink">Reading your timetable</strong>
            <div
              role="progressbar"
              aria-label="Reading timetable"
              className="h-2 w-[min(320px,80vw)] overflow-hidden rounded-full bg-surface-2"
            >
              <div className="h-full w-2/5 animate-pulse rounded-full bg-brand motion-reduce:animate-none" />
            </div>
            <p className="m-0 text-sm text-text-muted">
              This can take up to a minute. Nothing is published until you confirm.
            </p>
          </div>
        </div>
      )}

      {step === 'review' && (
        <>
          {unreadableChunkCount > 0 && (
            <p className={WARNING_NOTE_CLASS}>
              Part of this file couldn&apos;t be read. Some exams may be missing. Check the list or
              try again.
            </p>
          )}
          {droppedCount > 0 && (
            <p className={WARNING_NOTE_CLASS}>
              {droppedCount} {pluralLabel(droppedCount, "row couldn't", "rows couldn't")} be read
            </p>
          )}
          <ImportTimetableReview
            rows={rows}
            timezone={timezone}
            onUpdate={updateRow}
            onRemove={(rowId) =>
              setRows((current) => current.filter((item) => item.rowId !== rowId))
            }
          />
          <DialogFooter className="shrink-0 border-t border-line px-5 py-3 sm:flex-row sm:items-center sm:px-7">
            <span className="text-left text-sm text-text-muted sm:mr-auto">
              {canPublish
                ? `Ready to publish ${examLabel(rows.length)}.`
                : 'Resolve course matches and invalid details before publishing.'}
            </span>
            <Button type="button" variant="quiet" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              disabled={!canPublish || publishing}
              onClick={() => void publish()}
            >
              {publishing ? 'Publishing…' : `Publish ${examLabel(rows.length)}`}
            </Button>
          </DialogFooter>
        </>
      )}

      {(step === 'upload' || parsing) && (
        <DialogFooter className="shrink-0 border-t border-line px-5 py-3 sm:flex-row sm:items-center sm:px-7">
          <span className="text-left text-sm text-text-muted sm:mr-auto">
            {parsing
              ? 'You can keep this dialog open while it reads.'
              : 'Nothing is saved until you publish. The file is read and never stored.'}
          </span>
          <Button type="button" variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          {step === 'upload' && !parsing && (
            <Button
              type="button"
              variant="brand"
              disabled={!selectedFile || (isAdmin && !universityId)}
              onClick={() => void readTimetable()}
            >
              Read timetable
            </Button>
          )}
        </DialogFooter>
      )}

      {step === 'done' && (
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6 sm:px-7">
          <div className="grid justify-items-start gap-4">
            <Badge className="gap-1.5 border-transparent bg-ok-soft text-ok" variant="outline">
              <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
              Published
            </Badge>
            <h3 className="font-display text-3xl font-extrabold text-ink">
              Exams added to the calendar
            </h3>
            <div className="flex flex-wrap gap-3" aria-label="Publish results">
              <div
                role="group"
                aria-label={`${examLabel(publishResult?.created.length ?? 0)} created`}
                className="grid min-w-[150px] gap-1 rounded-xl border border-line px-4 py-3"
              >
                <strong className="font-display text-3xl font-extrabold leading-none tabular-nums text-ink">
                  {publishResult?.created.length ?? 0}
                </strong>
                <span className="text-sm text-text-muted">
                  {examLabel(publishResult?.created.length ?? 0, false)} created
                </span>
              </div>
              <div
                role="group"
                aria-label={`${skipped.length} skipped`}
                className="grid min-w-[150px] gap-1 rounded-xl border border-line px-4 py-3"
              >
                <strong className="font-display text-3xl font-extrabold leading-none tabular-nums text-ink">
                  {skipped.length}
                </strong>
                <span className="text-sm text-text-muted">{skippedDescription}</span>
              </div>
            </div>
            {skipped.length > 0 && (
              <section className="grid gap-2" aria-labelledby="skipped-exams-heading">
                <h4
                  id="skipped-exams-heading"
                  className="font-mono text-[11px] uppercase tracking-wide text-text-muted"
                >
                  Skipped
                </h4>
                <ul className="m-0 grid list-none gap-1 p-0 text-sm text-text-muted">
                  {skipped.map(({ index, reason }) => {
                    const row = rows[index]
                    if (!row) return null
                    const dateTime = formatExamDateTime(`${row.date}T${row.startsAt}:00`)

                    return (
                      <li key={`${index}-${reason}`} className="flex items-baseline gap-3">
                        <span className="font-mono text-[12.5px] font-medium text-ink">
                          {row.courseCode}
                        </span>
                        <span>
                          {row.courseName ?? 'Course not matched'} · {dateTime}
                          {reason === 'existing'
                            ? ' · already on the calendar'
                            : ' · duplicate row in this file'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}
            <div className="flex items-start gap-2 rounded-xl bg-surface-2 px-3 py-2.5 text-sm text-ink">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-sky" aria-hidden="true" />
              <span>
                Exams starting within 14 days are reminded as soon as they&apos;re published.
              </span>
            </div>
            <DialogFooter className="w-full">
              <Button type="button" variant="brand" onClick={onClose}>
                Done
              </Button>
            </DialogFooter>
          </div>
        </div>
      )}
    </>
  )
}
