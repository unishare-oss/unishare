'use client'

import { useAuth } from '@/contexts/auth-context'
import type { CreatePostFormValues } from '@/lib/posts/form-types'
import { POST_TYPE_LABELS } from '@/lib/posts/share-defaults'
import { cn } from '@/lib/utils'

type SharePreviewProps = {
  values: Pick<
    CreatePostFormValues,
    'postType' | 'title' | 'moduleNum' | 'examYear' | 'isAnonymous'
  >
  courseCode: string
  fileCount: number
}

const TYPE_COLORS = {
  NOTE: { color: 'var(--brand-edge)', thumb: 'var(--brand)' },
  OLD_QUESTION: { color: 'var(--sky)', thumb: 'var(--sky)' },
  EXERCISE: { color: 'var(--ok)', thumb: 'var(--ok)' },
} as const

function Line({ short, grow }: { short?: boolean; grow?: boolean }) {
  return (
    <i
      className={cn('block h-[5px] rounded-[3px] bg-m0', grow && 'flex-1', short && 'w-[62%]')}
      style={short && grow ? { flex: '0 1 62%' } : undefined}
    />
  )
}

/** The demo's rail card: how the note will look in the course list. */
export function SharePreviewCard({ values, courseCode, fileCount }: SharePreviewProps) {
  const { user } = useAuth()
  const postType = values.postType ?? 'NOTE'
  const type = { ...TYPE_COLORS[postType], label: POST_TYPE_LABELS[postType] }
  const title = values.title.trim()
  const isExam = values.postType === 'OLD_QUESTION'
  const detail = isExam ? values.examYear : values.moduleNum ? `Module ${values.moduleNum}` : ''
  const author = values.isAnonymous ? 'A classmate' : (user?.name ?? 'You')
  const initials = (user?.name ?? 'You')
    .split(/\s+/)
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  const heading = `${courseCode || 'Course'} · ${type.label}${detail && !isExam ? ` · ${detail}` : ''}`

  return (
    <div
      className="pointer-events-none grid grid-rows-[auto_1fr] overflow-hidden rounded-(--r) border border-line bg-surface text-ink"
      data-testid="share-preview"
    >
      <span
        aria-hidden="true"
        className="relative block aspect-[16/7] max-w-full overflow-hidden"
        style={{ background: `color-mix(in srgb, ${type.thumb} 12%, var(--surface-2))` }}
      >
        <span className="absolute inset-x-[15%] top-[16%] -bottom-2 grid content-start gap-1.5 rounded-t-[7px] bg-surface p-3 pb-0 shadow-[0_1px_2px_rgba(20,33,61,0.12),0_6px_16px_rgba(20,33,61,0.06)]">
          <b className="line-clamp-2 text-[11px] leading-tight font-semibold">{heading}</b>
          {postType === 'NOTE' && (
            <span className="mt-0.5 flex items-center gap-[5px]">
              {[0, 1, 2].map((n) => (
                <em
                  key={n}
                  className="h-3 w-[18px] rounded-[3px] border-[1.5px] not-italic"
                  style={{
                    borderColor: type.thumb,
                    background: `color-mix(in srgb, ${type.thumb} 18%, transparent)`,
                  }}
                />
              ))}
            </span>
          )}
          {postType === 'OLD_QUESTION' ? (
            <>
              <span className="text-[9.5px] leading-[1.3] text-muted-foreground">
                1. ____________
              </span>
              <Line />
              <span className="text-[9.5px] leading-[1.3] text-muted-foreground">
                2. ____________
              </span>
              <Line short />
            </>
          ) : postType === 'EXERCISE' ? (
            [false, false, true].map((short, n) => (
              <span key={n} className="flex items-center gap-1.5">
                <u
                  className="size-[9px] flex-none rounded-[2px] border-[1.5px]"
                  style={{ borderColor: type.thumb }}
                />
                <Line short={short} grow />
              </span>
            ))
          ) : (
            <>
              <Line />
              <Line />
              <Line short />
            </>
          )}
        </span>
      </span>
      <span className="grid content-start gap-2 px-3.5 pt-3.5 pb-4">
        <span className="flex flex-wrap items-center gap-1.5">
          <span
            className="rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap"
            style={{
              color: type.color,
              background: `color-mix(in srgb, ${type.color} 14%, transparent)`,
            }}
          >
            {type.label}
          </span>
          {detail && <span className="font-mono text-[11px] text-muted-foreground">{detail}</span>}
        </span>
        <span
          className={cn(
            'line-clamp-2 text-[15.5px] leading-[1.35] font-semibold tracking-[-0.005em]',
            !title && 'font-medium text-muted-foreground',
          )}
        >
          {title || 'Your title shows here'}
        </span>
        <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
          <span
            aria-hidden="true"
            className="grid size-[22px] flex-none place-items-center rounded-full text-[9px] font-semibold text-white"
            style={{ background: values.isAnonymous ? '#5b6785' : 'var(--brand-edge)' }}
          >
            {values.isAnonymous ? '?' : initials}
          </span>
          {author} · {fileCount} {fileCount === 1 ? 'file' : 'files'}
        </span>
        <span className="flex gap-3 text-[12.5px] text-muted-foreground tabular-nums">
          <span>♥ 0</span>
          <span>0 saves</span>
          <span>Just now</span>
        </span>
      </span>
    </div>
  )
}
