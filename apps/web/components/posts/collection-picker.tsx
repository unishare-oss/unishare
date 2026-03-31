'use client'

import { useState } from 'react'
import { Bookmark, Plus, Globe, Lock, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAuth } from '@/contexts/auth-context'
import { useUIStore } from '@/lib/store'
import {
  useReadingListsControllerFindAll,
  useReadingListsControllerAddPost,
  useReadingListsControllerRemovePost,
  useReadingListsControllerCreate,
  getReadingListsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/reading-lists/reading-lists'
import {
  usePostsControllerSavePost,
  usePostsControllerUnsavePost,
  getPostsControllerFindAllQueryKey,
  getPostsControllerFindOneQueryKey,
} from '@/src/lib/api/generated/posts/posts'
import type { ApiPost } from '@/lib/api-types'

interface CollectionPickerProps {
  post: Pick<ApiPost, 'id'> & { savedByCurrentUser?: boolean }
  align?: 'start' | 'end' | 'center'
  className?: string
}

export function CollectionPicker({ post, align = 'end', className }: CollectionPickerProps) {
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const toggleSaved = useUIStore((s) => s.toggleSaved)
  const isGuestSaved = useUIStore((s) => s.savedPosts.some((p) => p.id === post.id))

  const [open, setOpen] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [showNewList, setShowNewList] = useState(false)

  const { data: listsData, isLoading: listsLoading } = useReadingListsControllerFindAll({
    query: { enabled: isAuthenticated && open },
  })
  const lists = listsData?.data ?? []

  const { mutate: savePost, isPending: saving } = usePostsControllerSavePost()
  const { mutate: unsavePost, isPending: unsaving } = usePostsControllerUnsavePost()
  const { mutate: addPost } = useReadingListsControllerAddPost()
  const { mutate: removePost } = useReadingListsControllerRemovePost()
  const { mutate: createList, isPending: creatingList } = useReadingListsControllerCreate()

  const isSaved = isAuthenticated ? !!post.savedByCurrentUser : isGuestSaved
  const isInAnyList = lists.some((l) => l.postIds.includes(post.id))
  const showFilled = isSaved || isInAnyList

  function invalidatePosts() {
    queryClient.invalidateQueries({ queryKey: getPostsControllerFindAllQueryKey() })
    queryClient.invalidateQueries({ queryKey: getPostsControllerFindOneQueryKey(post.id) })
  }

  function invalidateLists() {
    queryClient.invalidateQueries({ queryKey: getReadingListsControllerFindAllQueryKey() })
  }

  function handleAllSavedToggle() {
    if (isSaved) {
      unsavePost(
        { id: post.id },
        {
          onSuccess: () => {
            invalidatePosts()
            toast.success('Removed from saved')
          },
          onError: () => toast.error('Could not update'),
        },
      )
    } else {
      savePost(
        { id: post.id },
        {
          onSuccess: () => {
            invalidatePosts()
            toast.success('Saved')
          },
          onError: () => toast.error('Could not update'),
        },
      )
    }
  }

  function handleListToggle(listId: string, inList: boolean) {
    if (inList) {
      removePost(
        { id: listId, postId: post.id },
        {
          onSuccess: invalidateLists,
          onError: () => toast.error('Could not update collection'),
        },
      )
    } else {
      addPost(
        { id: listId, postId: post.id },
        {
          onSuccess: invalidateLists,
          onError: () => toast.error('Could not update collection'),
        },
      )
    }
  }

  function handleCreateList() {
    const name = newListName.trim()
    if (!name) return
    createList(
      { data: { name } },
      {
        onSuccess: (res) => {
          const newList = res.data
          addPost(
            { id: newList.id, postId: post.id },
            {
              onSuccess: () => {
                invalidateLists()
                toast.success(`Added to "${name}"`)
              },
              onError: () => toast.error('Could not add to collection'),
            },
          )
          setNewListName('')
          setShowNewList(false)
        },
        onError: () => toast.error('Could not create collection'),
      },
    )
  }

  // Guest: simple toggle bookmark, no popover
  if (!isAuthenticated) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn('hover:bg-background', className)}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          toggleSaved(post as ApiPost)
          toast.success(isGuestSaved ? 'Removed from saved' : 'Saved')
        }}
        aria-label={isGuestSaved ? 'Unsave post' : 'Save post'}
      >
        <Bookmark
          className={cn('size-4', isGuestSaved ? 'fill-amber text-amber' : 'text-text-muted')}
          strokeWidth={1.5}
        />
      </Button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn('hover:bg-background', className)}
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
          aria-label="Save to collection"
        >
          <Bookmark
            className={cn('size-4', showFilled ? 'fill-amber text-amber' : 'text-text-muted')}
            strokeWidth={1.5}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-60 p-2" onClick={(e) => e.stopPropagation()}>
        <p className="px-2 pb-2 text-xs font-semibold text-text-muted">Save to</p>

        {/* All Saved */}
        <button
          className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
          onClick={handleAllSavedToggle}
          disabled={saving || unsaving}
        >
          <div
            className={cn(
              'flex size-4 items-center justify-center rounded-sm border',
              isSaved && 'border-primary bg-primary',
            )}
          >
            {isSaved && <Check className="size-3 text-white" strokeWidth={2.5} />}
          </div>
          <Bookmark className="size-3.5 shrink-0 text-text-muted" strokeWidth={1.5} />
          <span>All Saved</span>
        </button>

        {/* Reading lists */}
        {listsLoading ? (
          <div className="flex justify-center py-3">
            <Loader2 className="size-4 animate-spin text-text-muted" />
          </div>
        ) : (
          lists.map((list) => {
            const inList = list.postIds.includes(post.id)
            return (
              <button
                key={list.id}
                className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted"
                onClick={() => handleListToggle(list.id, inList)}
              >
                <div
                  className={cn(
                    'flex size-4 items-center justify-center rounded-sm border',
                    inList && 'border-primary bg-primary',
                  )}
                >
                  {inList && <Check className="size-3 text-white" strokeWidth={2.5} />}
                </div>
                {list.isPublic ? (
                  <Globe className="size-3.5 shrink-0 text-text-muted" />
                ) : (
                  <Lock className="size-3.5 shrink-0 text-text-muted" />
                )}
                <span className="truncate">{list.name}</span>
              </button>
            )
          })
        )}

        <div className="mt-1 border-t pt-1">
          {showNewList ? (
            <div className="flex gap-1.5 px-2 py-1">
              <Input
                autoFocus
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreateList()
                  if (e.key === 'Escape') setShowNewList(false)
                }}
                placeholder="Collection name"
                className="h-7 text-sm"
              />
              <Button
                size="sm"
                className="h-7 px-2"
                onClick={handleCreateList}
                disabled={creatingList || !newListName.trim()}
              >
                {creatingList ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Check className="size-3" />
                )}
              </Button>
            </div>
          ) : (
            <button
              className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm text-text-muted transition-colors hover:bg-muted"
              onClick={() => setShowNewList(true)}
            >
              <Plus className="size-4" />
              New collection
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
