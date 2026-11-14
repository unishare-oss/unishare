'use client'

import { useId, useState, type CSSProperties } from 'react'
import Link from 'next/link'
import { differenceInCalendarDays } from 'date-fns'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Skeleton } from '@/components/ui/skeleton'
import type { PostEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

export interface MaterialCounts {
  notes: number
  exams: number
  exercises: number
}

type Filter = 'all' | PostEntity['type']

const TYPES: Record<PostEntity['type'], { label: string; color: string }> = {
  NOTE: { label: 'Note', color: 'var(--type-note)' },
  OLD_QUESTION: { label: 'Old exam', color: 'var(--type-exam)' },
  EXERCISE: { label: 'Exercise', color: 'var(--type-exercise)' },
}

// The demo tints the paper preview with the plain brand colour, not the darker tag colour.
const PREVIEW_TINT: Record<PostEntity['type'], string> = {
  NOTE: 'var(--brand)',
  OLD_QUESTION: 'var(--sky)',
  EXERCISE: 'var(--ok)',
}

const PAGE_SIZE = 6

const sizes = {
  small: { page: 'gap-1.5 px-3 pt-3', title: 'text-[11px]', q: 'text-[9.5px]' },
  big: { page: 'gap-2 px-4 pt-4', title: 'text-[13px]', q: 'text-[11px]' },
}

function Lines() {
  return (
    <>
      <i className="block h-[5px] rounded-[3px] bg-m0" />
      <i className="block h-[5px] w-[62%] rounded-[3px] bg-m0" />
    </>
  )
}

/** The demo's preview(): the post title on a stack of pages tinted by type, with per-type art. */
function Preview({
  post,
  courseCode,
  big,
}: {
  post: PostEntity
  courseCode: string
  big?: boolean
}) {
  const size = sizes[big ? 'big' : 'small']
  const head =
    post.type === 'OLD_QUESTION'
      ? `${courseCode} · ${post.title}`
      : `${courseCode} · ${TYPES[post.type].label}${post.moduleNumber ? ` · Module ${post.moduleNumber}` : ''}`
  const q = cn('leading-[1.3] text-muted-foreground', size.q)
  return (
    <span
      aria-hidden
      style={{ '--c': PREVIEW_TINT[post.type] } as CSSProperties}
      className={cn(
        'relative block max-w-full overflow-hidden bg-[color-mix(in_srgb,var(--c)_12%,var(--surface-2))]',
        big ? 'min-h-[210px]' : 'aspect-[16/7]',
      )}
    >
      <span className="absolute inset-x-[15%] top-[16%] -bottom-2 translate-x-[-6px] translate-y-1.5 -rotate-[4deg] rounded-t-[7px] bg-surface opacity-70 shadow-sm" />
      {big && (
        <span className="absolute inset-x-[15%] top-[16%] -bottom-2 translate-x-2 translate-y-1 rotate-[3deg] rounded-t-[7px] bg-surface opacity-50 shadow-sm" />
      )}
      <span
        className={cn(
          'absolute -bottom-2 grid content-start rounded-t-[7px] bg-surface shadow-md transition-transform duration-200 ease-(--ease-out) group-hover:-translate-y-1 motion-reduce:transition-none',
          big ? 'inset-x-[12%]' : 'inset-x-[15%]',
          'top-[16%]',
          size.page,
        )}
      >
        <b className={cn('line-clamp-2 leading-tight font-semibold text-ink', size.title)}>
          {head}
        </b>
        {post.type === 'NOTE' && (
          <>
            <span className="mt-0.5 flex items-center gap-[5px]">
              {[0, 1, 2].map((i) => (
                <em
                  key={i}
                  className="h-3 w-[18px] rounded-[3px] border-[1.5px] border-(--c) bg-[color-mix(in_srgb,var(--c)_18%,transparent)]"
                />
              ))}
            </span>
            <Lines />
          </>
        )}
        {post.type === 'OLD_QUESTION' && (
          <>
            <span className={q}>1. ____________</span>
            <i className="block h-[5px] rounded-[3px] bg-m0" />
            <span className={q}>2. ____________</span>
            <i className="block h-[5px] w-[62%] rounded-[3px] bg-m0" />
          </>
        )}
        {post.type === 'EXERCISE' &&
          [false, false, true].map((short, i) => (
            <span key={i} className="flex items-center gap-1.5">
              <u className="size-[9px] shrink-0 rounded-[2px] border-[1.5px] border-(--c) no-underline" />
              <i
                className={cn('block h-[5px] flex-1 rounded-[3px] bg-m0', short && 'max-w-[62%]')}
              />
            </span>
          ))}
      </span>
    </span>
  )
}

function By({ post }: { post: PostEntity }) {
  const author = post.isAnonymous ? null : post.author
  return (
    <span className="flex items-center gap-2 text-[13px] text-muted-foreground">
      <UserAvatar
        name={author?.name ?? 'Anonymous'}
        image={author?.image}
        size="xs"
        className="size-[22px] shrink-0 rounded-full"
      />
      {author?.name ?? 'A classmate'}
    </span>
  )
}

function Stats({ post }: { post: PostEntity }) {
  const reactions = Object.values(post.reactionCounts ?? {}).reduce((sum, n) => sum + n, 0)
  const days = differenceInCalendarDays(new Date(), new Date(post.createdAt))
  return (
    <span className="flex gap-3 text-[12.5px] text-muted-foreground tabular-nums">
      <span>♥ {reactions}</span>
      <span>{post._count.savedBy} saves</span>
      <span>{days <= 0 ? 'Today' : `${days}d ago`}</span>
    </span>
  )
}

function TypeTag({ post }: { post: PostEntity }) {
  return (
    <span
      style={{ '--c': TYPES[post.type].color } as CSSProperties}
      className="w-fit rounded-full bg-[color-mix(in_srgb,var(--c)_14%,transparent)] px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap text-(--c)"
    >
      {TYPES[post.type].label}
    </span>
  )
}

function Top({ post }: { post: PostEntity }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <TypeTag post={post} />
      {!!post.moduleNumber && (
        <span className="font-mono text-[11px] text-muted-foreground">
          Module {post.moduleNumber}
        </span>
      )}
    </span>
  )
}

const cardClass =
  'group grid overflow-hidden rounded-(--r) border border-line bg-surface text-ink no-underline transition-[transform,box-shadow,border-color] duration-200 active:scale-[0.985] motion-reduce:transition-none motion-reduce:active:transform-none [@media(hover:hover)_and_(pointer:fine)]:hover:-translate-y-0.5 [@media(hover:hover)_and_(pointer:fine)]:hover:border-edge [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-[0_10px_28px_rgba(20,33,61,0.10)]'

interface MaterialsShelfProps {
  /** Undefined while page 1 loads. */
  posts: PostEntity[] | undefined
  courseCode: string
  /** Undefined while the totals load. */
  counts: MaterialCounts | undefined
}

export function MaterialsShelf({ posts, courseCode, counts }: MaterialsShelfProps) {
  const headingId = useId()
  const [filter, setFilter] = useState<Filter>('all')
  const [showAll, setShowAll] = useState(false)

  const chips: { value: Filter; label: string; count: number | undefined }[] = [
    {
      value: 'all',
      label: 'All',
      count: counts && counts.notes + counts.exams + counts.exercises,
    },
    { value: 'NOTE', label: 'Notes', count: counts?.notes },
    { value: 'OLD_QUESTION', label: 'Old exams', count: counts?.exams },
    { value: 'EXERCISE', label: 'Exercises', count: counts?.exercises },
  ]
  const loaded = posts ?? []
  const filtered = loaded.filter((post) => filter === 'all' || post.type === filter)
  const featured =
    filter === 'all' || filter === 'OLD_QUESTION'
      ? loaded.find((post) => post.type === 'OLD_QUESTION')
      : undefined
  const rest = filtered.filter((post) => post !== featured)
  const shown = showAll ? rest : rest.slice(0, PAGE_SIZE)

  function pick(value: Filter) {
    setFilter(value)
    setShowAll(false)
  }

  return (
    <section aria-labelledby={headingId} className="grid min-w-0 gap-4">
      <div>
        <h2 id={headingId} className="text-[22px] font-semibold tracking-[-0.015em]">
          Course materials
        </h2>
        <p className="mt-0.5 text-sm text-muted-foreground">
          Notes, old exams and exercises shared by your classmates
        </p>
      </div>
      <div role="group" aria-label="Type" className="flex flex-wrap gap-2">
        {chips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            aria-pressed={filter === chip.value}
            onClick={() => pick(chip.value)}
            className="inline-flex items-center gap-1.5 rounded-full border-[1.5px] border-line bg-surface px-3.5 py-1.5 text-sm font-medium text-muted-foreground transition-[background-color,color,border-color,transform] duration-150 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 active:scale-[0.97] aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-background [@media(hover:hover)_and_(pointer:fine)]:hover:not-aria-pressed:border-muted-foreground [@media(hover:hover)_and_(pointer:fine)]:hover:not-aria-pressed:text-ink"
          >
            {chip.label}
            {chip.count !== undefined && (
              <span className="text-xs tabular-nums opacity-80">{chip.count}</span>
            )}
          </button>
        ))}
      </div>

      {featured && (
        <Link
          href={`/posts/${featured.id}`}
          className={cn(
            cardClass,
            'grid-cols-1 min-[621px]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]',
          )}
        >
          <Preview post={featured} courseCode={courseCode} big />
          <span className="grid content-center gap-2.5 p-4 min-[621px]:p-[22px]">
            <span className="font-mono text-[11px] tracking-[0.08em] text-brand-edge uppercase">
              Newest old exam
            </span>
            <span className="text-[19px] leading-tight font-semibold tracking-[-0.015em] text-balance min-[621px]:text-[22px]">
              {featured.title}
            </span>
            <Top post={featured} />
            <By post={featured} />
            <Stats post={featured} />
          </span>
        </Link>
      )}

      {!posts ? (
        <div
          aria-busy="true"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,228px),1fr))] gap-4"
        >
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nothing here yet.</p>
      ) : (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(100%,228px),1fr))] gap-4 p-0">
          {shown.map((post) => (
            <li key={post.id} className="grid">
              <Link href={`/posts/${post.id}`} className={cn(cardClass, 'grid-rows-[auto_1fr]')}>
                <Preview post={post} courseCode={courseCode} />
                <span className="grid content-start gap-2 px-3.5 pt-3.5 pb-4">
                  <Top post={post} />
                  <span className="line-clamp-2 text-[15.5px] leading-[1.35] font-semibold tracking-[-0.005em]">
                    {post.title}
                  </span>
                  <By post={post} />
                  <Stats post={post} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {!showAll && rest.length > PAGE_SIZE && (
        <Button size="sm" className="justify-self-center" onClick={() => setShowAll(true)}>
          Show all
        </Button>
      )}
    </section>
  )
}
