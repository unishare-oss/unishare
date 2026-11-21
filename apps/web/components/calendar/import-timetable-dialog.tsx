'use client'

import { useRef, useState } from 'react'
import { Clock3, FileText, UploadCloud } from 'lucide-react'
import { toast } from 'sonner'
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
  useExamsControllerBulkCreate,
  useExamsControllerParseImport,
  getExamsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/exams/exams'
import { type BulkCreateExamsDto } from '@/src/lib/api/generated/unishareAPI.schemas'
import { useQueryClient } from '@tanstack/react-query'
import { ImportTimetableReview } from './import-timetable-review'
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
  if (row.matchStatus !== 'matched' || !row.courseId || !row.title.trim()) return null

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
      <DialogContent className="flex max-h-[90vh] w-[calc(100vw-24px)] max-w-none flex-col overflow-hidden rounded-2xl p-0 max-[639px]:h-[100dvh] max-[639px]:max-h-none max-[639px]:w-screen max-[639px]:rounded-none sm:max-w-[940px]">
        {open && <ImportTimetableDialogContent onClose={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  )
}

function ImportTimetableDialogContent({ onClose }: { onClose: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const [step, setStep] = useState<Step>('upload')
  const [rows, setRows] = useState<ReviewRow[]>([])
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { mutateAsync: parseImport, isPending: parsing } = useExamsControllerParseImport()
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
      const parsed = await parseImport({ data: { file: selectedFile } })
      setRows(parsed.data.rows.map((row, rowId) => ({ ...row, rowId })))
      setStep('review')
    } catch {
      toast.error('Could not read this timetable. Please try again.')
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
                ? `Ready to publish ${rows.length} exams.`
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
              {publishing ? 'Publishing…' : `Publish ${rows.length} exams`}
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
              disabled={!selectedFile}
              onClick={() => void readTimetable()}
            >
              Read timetable
            </Button>
          )}
        </DialogFooter>
      )}

      {step === 'done' && (
        <div className="px-5 py-10 text-center sm:px-7">
          <h3 className="font-display text-2xl font-bold text-ink">Timetable published</h3>
          <p className="mt-2 text-text-muted">
            {bulkCreateResult?.data.length ?? 0} exams added to the calendar.
          </p>
          <DialogFooter className="mt-8">
            <Button type="button" variant="brand" onClick={onClose}>
              Done
            </Button>
          </DialogFooter>
        </div>
      )}
    </>
  )
}
