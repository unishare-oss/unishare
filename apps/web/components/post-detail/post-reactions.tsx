'use client'

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  usePostsControllerReact,
  getPostsControllerFindOneQueryKey,
} from '@/src/lib/api/generated/posts/posts'
import { authClient } from '@/src/lib/auth/client'
import { cn } from '@/lib/utils'
import { REACTIONS } from '@/lib/constants'
import type { ApiPostDetail } from '@/lib/api-types'

const DEBOUNCE_MS = 600

interface PostReactionsProps {
  post: ApiPostDetail
}

export function PostReactions({ post }: PostReactionsProps) {
  const { data: session } = authClient.useSession()
  const queryClient = useQueryClient()

  const [optimisticReaction, setOptimisticReaction] = useState<string | null | undefined>(undefined)
  const [optimisticCounts, setOptimisticCounts] = useState<Record<string, number> | undefined>(
    undefined,
  )

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const intendedReactionRef = useRef<string | null | undefined>(undefined)

  const activeReaction =
    optimisticReaction !== undefined ? optimisticReaction : (post.userReaction ?? null)
  const activeCounts: Record<string, number> =
    optimisticCounts ?? (post.reactionCounts as Record<string, number>) ?? {}

  const { mutate: react } = usePostsControllerReact({
    mutation: {
      onSuccess: (res) => {
        queryClient.setQueryData(getPostsControllerFindOneQueryKey(post.id), res)
        setOptimisticReaction(undefined)
        setOptimisticCounts(undefined)
      },
      onError: () => {
        setOptimisticReaction(undefined)
        setOptimisticCounts(undefined)
        toast.error('Could not update reaction')
      },
    },
  })

  function handleReact(type: string) {
    if (!session) {
      toast.error('Sign in to react')
      return
    }

    const current = activeReaction
    const next = current === type ? null : type

    const counts = { ...activeCounts }
    if (current !== null && current !== type)
      counts[current] = Math.max((counts[current] ?? 1) - 1, 0)
    if (current === type) counts[type] = Math.max((counts[type] ?? 1) - 1, 0)
    else counts[type] = (counts[type] ?? 0) + 1

    setOptimisticReaction(next)
    setOptimisticCounts(counts)
    intendedReactionRef.current = next

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const intended = intendedReactionRef.current
      const serverReaction = post.userReaction ?? null

      if (intended === serverReaction) {
        setOptimisticReaction(undefined)
        setOptimisticCounts(undefined)
        return
      }

      const typeToSend = intended ?? serverReaction
      if (!typeToSend) return
      react({ id: post.id, data: { type: typeToSend as 'HELPFUL' } })
    }, DEBOUNCE_MS)
  }

  const totalReactions = Object.values(activeCounts).reduce((a, b) => a + b, 0) as number

  return (
    <div className="flex flex-wrap items-center gap-2 py-4">
      {REACTIONS.map(({ type, icon: Icon, label, color, activeBg }) => {
        const count = activeCounts[type] ?? 0
        const isActive = activeReaction === type

        return (
          <button
            key={type}
            onClick={() => handleReact(type)}
            title={label}
            className={cn(
              'group flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors duration-150 select-none',
              isActive
                ? [activeBg, 'reaction-active']
                : 'border-border hover:border-border/80 hover:bg-muted',
            )}
          >
            <Icon
              className={cn(
                'size-3.5',
                isActive ? color.split(' ')[0] : `text-text-muted ${color.split(' ')[1]}`,
              )}
              strokeWidth={isActive ? 2.5 : 1.5}
            />
            {count > 0 && (
              <span
                className={cn(
                  'font-mono text-xs tabular-nums',
                  isActive ? color.split(' ')[0] : 'text-text-muted',
                )}
              >
                {count}
              </span>
            )}
          </button>
        )
      })}
      {totalReactions > 0 && (
        <span className="font-mono text-xs text-text-muted ml-1">
          {totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}
        </span>
      )}
    </div>
  )
}
