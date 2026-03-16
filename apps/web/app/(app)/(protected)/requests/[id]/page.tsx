'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, CheckCircle2, ChevronUp, Clock, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  usePostRequestsControllerFindOne,
  usePostRequestsControllerUpvote,
  usePostRequestsControllerRemove,
  usePostRequestsControllerRemoveSuggestion,
  usePostRequestsControllerAcceptSuggestion,
  getPostRequestsControllerFindOneQueryKey,
  getPostRequestsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/post-requests/post-requests'
import type { PostRequestFulfillmentEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/shared/page-header'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/shared/loading-spinner'
import { SuggestFulfillmentDialog } from '@/components/requests/suggest-fulfillment-dialog'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { cn } from '@/lib/utils'

const POST_TYPE_LABEL: Record<string, string> = {
  NOTE: 'Note',
  OLD_QUESTION: 'Past Q',
  ASSIGNMENT: 'Assignment',
}

export default function RequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { session } = useAuth()
  const userId = session?.user?.id
  const qc = useQueryClient()

  const { data: request } = usePostRequestsControllerFindOne(id, {
    query: { select: (r) => r.data },
  })

  const upvote = usePostRequestsControllerUpvote({
    mutation: {
      onSuccess: () =>
        qc.invalidateQueries({ queryKey: getPostRequestsControllerFindOneQueryKey(id) }),
    },
  })

  const remove = usePostRequestsControllerRemove({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getPostRequestsControllerFindAllQueryKey() })
        router.push('/requests')
      },
    },
  })

  const removeSuggestion = usePostRequestsControllerRemoveSuggestion({
    mutation: {
      onSuccess: () =>
        qc.invalidateQueries({ queryKey: getPostRequestsControllerFindOneQueryKey(id) }),
      onError: () => toast.error('Failed to remove suggestion'),
    },
  })

  const acceptSuggestion = usePostRequestsControllerAcceptSuggestion({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getPostRequestsControllerFindOneQueryKey(id) })
        toast.success('Request fulfilled!')
      },
      onError: () => toast.error('Failed to accept suggestion'),
    },
  })

  if (!request) {
    return (
      <div className="flex flex-col min-h-screen">
        <PageHeader title="Request" />
        <div className="flex-1 bg-card flex items-center justify-center">
          <LoadingSpinner className="size-20" />
        </div>
      </div>
    )
  }

  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const isOwner = userId === request.author?.id
  const isFulfilled = request.status === 'FULFILLED'
  const suggestions: PostRequestFulfillmentEntity[] = request.suggestions ?? []
  const hasSuggested = suggestions.some((s) => s.user.id === userId)
  const canSuggest = !!userId && !isOwner && !isFulfilled && !hasSuggested

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader title="Request" />

      <div className="flex-1 bg-card">
        <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-6">
          <Link
            href="/requests"
            className="inline-flex items-center gap-1.5 text-xs text-text-muted hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="size-3.5" />
            Back to requests
          </Link>

          {/* Request card */}
          <div className="border border-border rounded-[6px] p-5">
            <div className="flex items-start gap-4">
              {/* Upvote */}
              <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
                <button
                  onClick={() => upvote.mutate({ id })}
                  disabled={!userId}
                  className={cn(
                    'flex flex-col items-center gap-0.5 p-1.5 rounded-[6px] transition-colors',
                    request.isUpvoted
                      ? 'text-amber bg-amber/10'
                      : 'text-text-muted hover:text-foreground hover:bg-muted',
                    !userId && 'cursor-default opacity-50',
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
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-base font-semibold text-foreground leading-snug">
                    {request.title}
                  </h1>
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

                {request.description && (
                  <p className="text-sm text-text-muted mt-1">{request.description}</p>
                )}

                {isFulfilled && request.fulfilledByPost && (
                  <a
                    href={`/posts/${request.fulfilledByPost.id}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-amber hover:underline"
                  >
                    <CheckCircle2 className="size-3" />
                    Fulfilled by:{' '}
                    {request.fulfilledByPost.title ?? request.fulfilledByPost.shortCode}
                  </a>
                )}

                <div className="flex items-center gap-2 mt-3">
                  <UserAvatar
                    name={request.author?.name ?? 'Unknown'}
                    image={request.author?.image ?? null}
                    size="xs"
                  />
                  <span className="text-[11px] text-text-muted">
                    {request.author?.name ?? 'Unknown'} ·{' '}
                    {formatDistanceToNow(new Date(request.createdAt), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>

            {isOwner && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={remove.isPending}
                  className="h-7 rounded-md px-2 font-mono text-[11px] uppercase tracking-wider text-text-muted hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="size-3.5" strokeWidth={1.5} />
                  Delete
                </Button>
                <ConfirmDialog
                  open={confirmDeleteOpen}
                  onOpenChange={setConfirmDeleteOpen}
                  title="Delete request?"
                  description="This will permanently delete your request and all its suggestions."
                  confirmLabel="Delete"
                  isPending={remove.isPending}
                  onConfirm={() => remove.mutate({ id })}
                />
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Suggestions ({suggestions.length})
              </h2>
              {canSuggest && <SuggestFulfillmentDialog requestId={id} />}
            </div>

            {suggestions.length === 0 ? (
              <div className="border border-border rounded-[6px] p-8 text-center">
                <p className="text-sm text-text-muted">
                  {isFulfilled
                    ? 'This request has been fulfilled.'
                    : 'No suggestions yet. Be the first to suggest a post!'}
                </p>
              </div>
            ) : (
              <div className="flex flex-col border border-border rounded-[6px] overflow-hidden">
                {suggestions.map((s, i) => (
                  <div
                    key={s.id}
                    className={cn(
                      'flex items-start gap-3 px-5 py-4',
                      i < suggestions.length - 1 && 'border-b border-border',
                      request.fulfilledByPost?.id === s.post.id && 'bg-success/[0.04]',
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <a
                          href={`/posts/${s.post.id}`}
                          className="text-sm font-medium text-foreground hover:underline"
                        >
                          {s.post.title ?? s.post.shortCode}
                        </a>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-muted text-text-muted">
                          {POST_TYPE_LABEL[s.post.type] ?? s.post.type}
                        </span>
                        {request.fulfilledByPost?.id === s.post.id && (
                          <span className="inline-flex items-center gap-1 font-mono text-[10px] text-success">
                            <CheckCircle2 className="size-3" />
                            Accepted
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1.5">
                        <UserAvatar
                          name={s.post.author.name}
                          image={s.post.author.image ?? null}
                          size="xs"
                        />
                        <span className="text-[11px] text-text-muted">
                          Suggested by {s.user.name} ·{' '}
                          {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {isOwner && !isFulfilled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => acceptSuggestion.mutate({ id, suggestionId: s.id })}
                          disabled={acceptSuggestion.isPending}
                          className="h-7 rounded-md px-2 font-mono text-[11px] uppercase tracking-wider text-text-muted hover:bg-success/10 hover:text-success"
                        >
                          <CheckCircle2 className="size-3.5" strokeWidth={1.5} />
                          Accept
                        </Button>
                      )}
                      {s.user.id === userId && !isFulfilled && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="xs"
                          onClick={() => removeSuggestion.mutate({ id, suggestionId: s.id })}
                          disabled={removeSuggestion.isPending}
                          className="h-7 rounded-md px-2 font-mono text-[11px] uppercase tracking-wider text-text-muted hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-3.5" strokeWidth={1.5} />
                          Remove
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
