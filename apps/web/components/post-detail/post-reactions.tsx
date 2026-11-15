'use client'

import { useState, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  usePostsControllerReact,
  getPostsControllerFindOneQueryKey,
} from '@/src/lib/api/generated/posts/posts'
import { useAuth } from '@/contexts/auth-context'
import { cn } from '@/lib/utils'
import { SmilePlus } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ACTION_PILL, REACTIONS } from '@/lib/constants'
import type { ApiPostDetail } from '@/lib/api-types'

const DEBOUNCE_MS = 600

interface PostReactionsProps {
  post: ApiPostDetail
}

export function PostReactions({ post }: PostReactionsProps) {
  const { isAuthenticated } = useAuth()
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
    if (!isAuthenticated) {
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

  const [pickerOpen, setPickerOpen] = useState(false)

  function choose(type: string) {
    handleReact(type)
    setPickerOpen(false)
  }

  // HELPFUL is always shown; the other types only while someone has used them.
  const shown = REACTIONS.filter(({ type }) => type === 'HELPFUL' || (activeCounts[type] ?? 0) > 0)

  return (
    <>
      {shown.map(({ type, icon: Icon, label, pressed }) => {
        const count = activeCounts[type] ?? 0
        const isActive = activeReaction === type

        return (
          <button
            key={type}
            onClick={() => handleReact(type)}
            aria-label={label}
            aria-pressed={isActive}
            className={cn(ACTION_PILL, isActive && ['reaction-active', pressed])}
          >
            <Icon className="size-5" strokeWidth={2} fill={isActive ? 'currentColor' : 'none'} />
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
      <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Add a reaction"
            aria-expanded={pickerOpen}
            className={ACTION_PILL}
          >
            <SmilePlus className="size-5" strokeWidth={2} />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={2}
          className="flex w-auto gap-0.5 rounded-full border-line bg-surface p-1.5"
        >
          {REACTIONS.map(({ type, icon: Icon, label, pressed }) => {
            const isActive = activeReaction === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => choose(type)}
                aria-label={label}
                title={label}
                aria-pressed={isActive}
                className={cn(ACTION_PILL, 'p-1.5', isActive && pressed)}
              >
                <Icon
                  className="size-5"
                  strokeWidth={2}
                  fill={isActive ? 'currentColor' : 'none'}
                />
              </button>
            )
          })}
        </PopoverContent>
      </Popover>
    </>
  )
}
