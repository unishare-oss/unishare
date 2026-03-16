'use client'

import { useState } from 'react'
import { keepPreviousData, useQueryClient } from '@tanstack/react-query'
import {
  usePostRequestsControllerFindAll,
  getPostRequestsControllerFindAllQueryKey,
  usePostRequestsControllerUpvote,
  usePostRequestsControllerRemove,
  type postRequestsControllerFindAllResponse,
} from '@/src/lib/api/generated/post-requests/post-requests'
import type {
  PostRequestEntity,
  PostRequestsControllerFindAllParams,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/shared/page-header'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { UserAvatar } from '@/components/shared/user-avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import Link from 'next/link'
import { CreateRequestDialog } from '@/components/requests/create-request-dialog'
import { ChevronUp, Trash2, CheckCircle2, Clock } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

const ALL = '__all__'
const YEARS = [1, 2, 3, 4, 5, 6]

export default function RequestsPage() {
  const { session, isAuthenticated } = useAuth()
  const userId = session?.user?.id
  const qc = useQueryClient()

  const [statusFilter, setStatusFilter] = useState<string>(ALL)
  const [deptFilter, setDeptFilter] = useState<string>(ALL)
  const [yearFilter, setYearFilter] = useState<string>(ALL)
  const [courseFilter, setCourseFilter] = useState<string>(ALL)
  const [page, setPage] = useState(1)

  const { data: depts } = useDepartmentsControllerFindAll({ query: { select: (r) => r.data } })
  const { data: coursesData } = useCoursesControllerFindAll(
    { limit: 100 },
    { query: { select: (r) => r.data } },
  )
  const allCourses = coursesData?.items ?? []

  const filteredCourses = allCourses.filter((c) => {
    const deptOk = deptFilter === ALL || c.department.id === deptFilter
    const yearOk = yearFilter === ALL || c.yearLevel === Number(yearFilter)
    return deptOk && yearOk
  })

  const params: PostRequestsControllerFindAllParams = {
    page,
    limit: 20,
    ...(statusFilter !== ALL && { status: statusFilter as 'OPEN' | 'FULFILLED' }),
    ...(courseFilter !== ALL && { courseId: courseFilter }),
    ...(deptFilter !== ALL && courseFilter === ALL && { departmentId: deptFilter }),
  }

  const { data, isLoading } = usePostRequestsControllerFindAll(params, {
    query: { select: (r) => r.data, placeholderData: keepPreviousData },
  })

  const upvote = usePostRequestsControllerUpvote({
    mutation: {
      onMutate: async ({ id: requestId }) => {
        await qc.cancelQueries({ queryKey: getPostRequestsControllerFindAllQueryKey() })
        const snapshots = qc.getQueriesData<postRequestsControllerFindAllResponse>({
          queryKey: getPostRequestsControllerFindAllQueryKey(),
        })
        qc.setQueriesData<postRequestsControllerFindAllResponse>(
          { queryKey: getPostRequestsControllerFindAllQueryKey() },
          (old) => {
            if (!old) return old
            return {
              ...old,
              data: {
                ...old.data,
                items: old.data.items.map((r) =>
                  r.id === requestId
                    ? {
                        ...r,
                        isUpvoted: !r.isUpvoted,
                        upvoteCount: r.isUpvoted ? r.upvoteCount - 1 : r.upvoteCount + 1,
                      }
                    : r,
                ),
              },
            }
          },
        )
        return { snapshots }
      },
      onError: (_err, _vars, ctx) => {
        ctx?.snapshots.forEach(([key, snap]) => qc.setQueryData(key, snap))
      },
      onSettled: () =>
        qc.invalidateQueries({ queryKey: getPostRequestsControllerFindAllQueryKey() }),
    },
  })
  const remove = usePostRequestsControllerRemove({
    mutation: {
      onSuccess: () =>
        qc.invalidateQueries({ queryKey: getPostRequestsControllerFindAllQueryKey() }),
    },
  })

  function resetPage() {
    setPage(1)
  }

  const requests = data?.items ?? []

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Requests" />

      {/* Toolbar */}
      <div className="sticky top-15 z-10 bg-card border-b border-border px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Select
            value={statusFilter}
            onValueChange={(v) => {
              setStatusFilter(v)
              resetPage()
            }}
          >
            <SelectTrigger className="h-8 w-28 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="FULFILLED">Fulfilled</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={deptFilter}
            onValueChange={(v) => {
              setDeptFilter(v)
              setCourseFilter(ALL)
              resetPage()
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Department" />
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

          <Select
            value={yearFilter}
            onValueChange={(v) => {
              setYearFilter(v)
              setCourseFilter(ALL)
              resetPage()
            }}
          >
            <SelectTrigger className="h-8 w-24 text-xs">
              <SelectValue placeholder="Year" />
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

          <Select
            value={courseFilter}
            onValueChange={(v) => {
              setCourseFilter(v)
              resetPage()
            }}
          >
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue placeholder="Course" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All courses</SelectItem>
              {filteredCourses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isAuthenticated && <CreateRequestDialog />}
      </div>

      {/* List */}
      <div className="flex-1 bg-card divide-y divide-border">
        {isLoading && <RequestsSkeleton />}
        {!isLoading && requests.length === 0 && (
          <EmptyState
            message="No requests yet"
            description="Be the first to ask for notes or resources."
          />
        )}
        {requests.map((r) => (
          <RequestCard
            key={r.id}
            request={r}
            currentUserId={userId}
            onUpvote={() => upvote.mutate({ id: r.id })}
            onDelete={() => remove.mutate({ id: r.id })}
          />
        ))}
      </div>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 py-4 border-t border-border bg-card">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-text-muted">
            {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === data.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

function RequestCard({
  request,
  currentUserId,
  onUpvote,
  onDelete,
}: {
  request: PostRequestEntity
  currentUserId?: string
  onUpvote: () => void
  onDelete: () => void
}) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const isOwner = currentUserId === request.author?.id
  const isFulfilled = request.status === 'FULFILLED'
  const authorName = request.author?.name ?? 'Unknown'
  const authorImage = request.author?.image ?? null

  return (
    <>
      <Link
        href={`/requests/${request.id}`}
        className={cn(
          'flex gap-4 px-4 py-4 hover:bg-muted/40 transition-colors',
          isFulfilled && 'opacity-70',
        )}
      >
        {/* Upvote column */}
        <div className="flex flex-col items-center gap-1 pt-0.5 shrink-0">
          <button
            onClick={(e) => {
              e.preventDefault()
              onUpvote()
            }}
            disabled={!currentUserId}
            className={cn(
              'flex flex-col items-center gap-0.5 p-1.5 rounded-[6px] transition-colors',
              request.isUpvoted
                ? 'text-amber bg-amber/10'
                : 'text-text-muted hover:text-foreground hover:bg-muted',
              !currentUserId && 'cursor-default opacity-50',
            )}
          >
            <ChevronUp className="size-4" strokeWidth={2} />
            <span className="text-[11px] font-mono font-semibold leading-none">
              {request.upvoteCount}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-foreground leading-snug">
                {request.title}
              </span>
              <span
                className={cn(
                  'inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border',
                  isFulfilled ? 'border-success/50 text-success' : 'border-amber/50 text-amber',
                )}
              >
                {isFulfilled ? (
                  <>
                    <CheckCircle2 className="size-2.5" />
                    Fulfilled
                  </>
                ) : (
                  <>
                    <Clock className="size-2.5" />
                    Open
                  </>
                )}
              </span>
              <span className="inline-flex items-center text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-text-muted">
                {request.course.code}
              </span>
            </div>
          </div>

          {request.description && (
            <p className="text-sm text-text-muted mt-1 line-clamp-3">{request.description}</p>
          )}

          {isFulfilled && request.fulfilledByPost && (
            <a
              href={`/posts/${request.fulfilledByPost.id}`}
              onClick={(e) => e.stopPropagation()}
              className="mt-1.5 inline-flex items-center gap-1 text-xs text-amber hover:underline"
            >
              <CheckCircle2 className="size-3" />
              Fulfilled by: {request.fulfilledByPost.title ?? request.fulfilledByPost.shortCode}
            </a>
          )}

          {isOwner && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={(e) => {
                  e.preventDefault()
                  setConfirmOpen(true)
                }}
                className={cn(
                  'h-7 rounded-md px-2 font-mono text-[11px] uppercase tracking-wider text-text-muted',
                  'hover:bg-destructive/10 hover:text-destructive',
                )}
              >
                <Trash2 className="size-3.5" strokeWidth={1.5} />
                Delete
              </Button>
            </div>
          )}

          <div className="flex items-center gap-2 mt-2">
            <UserAvatar name={authorName} image={authorImage} size="xs" />
            <span className="text-[11px] text-text-muted">
              {authorName} · {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
            </span>
          </div>
        </div>
      </Link>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete request?"
        description="This will permanently delete your request and all its suggestions."
        confirmLabel="Delete"
        onConfirm={() => {
          setConfirmOpen(false)
          onDelete()
        }}
      />
    </>
  )
}

function RequestsSkeleton() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex gap-3 px-5 py-4">
          {/* upvote column */}
          <div className="flex flex-col items-center gap-1 pt-0.5">
            <Skeleton className="size-7 rounded bg-muted" />
            <Skeleton className="h-3 w-4 bg-muted" />
          </div>
          {/* content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Skeleton className="h-3.5 w-48 bg-muted" />
              <Skeleton className="h-4 w-16 rounded-full bg-muted" />
              <Skeleton className="h-4 w-20 rounded-full bg-muted" />
            </div>
            <Skeleton className="h-3 w-full max-w-sm bg-muted" />
            <Skeleton className="h-3 w-2/3 bg-muted" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="size-4 rounded-full bg-muted" />
              <Skeleton className="h-3 w-32 bg-muted" />
            </div>
          </div>
        </div>
      ))}
    </>
  )
}
