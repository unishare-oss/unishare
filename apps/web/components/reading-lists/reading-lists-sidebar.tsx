'use client'

import { useState } from 'react'
import { Plus, BookMarked, Trash2, Globe, Lock, Pencil, Share2, MoreHorizontal } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ShareDialog } from '@/components/reading-lists/share-dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  useReadingListsControllerFindAll,
  useReadingListsControllerCreate,
  useReadingListsControllerUpdate,
  useReadingListsControllerRemove,
  getReadingListsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/reading-lists/reading-lists'
import type { ReadingListEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface ReadingListsSidebarProps {
  selectedListId: string | null
  onSelect: (id: string | null) => void
}

export function ReadingListsSidebar({ selectedListId, onSelect }: ReadingListsSidebarProps) {
  const queryClient = useQueryClient()

  // Create dialog
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  // Edit dialog
  const [editTarget, setEditTarget] = useState<ReadingListEntity | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editIsPublic, setEditIsPublic] = useState(false)

  // Share dialog
  const [shareTarget, setShareTarget] = useState<ReadingListEntity | null>(null)

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ReadingListEntity | null>(null)

  const { data } = useReadingListsControllerFindAll({
    query: { select: (r) => r.data },
  })
  const lists: ReadingListEntity[] = data ?? []

  const { mutate: createList, isPending: isCreating } = useReadingListsControllerCreate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getReadingListsControllerFindAllQueryKey() })
        setCreateOpen(false)
        setName('')
        setDescription('')
        setIsPublic(false)
      },
    },
  })

  const { mutate: updateList, isPending: isUpdating } = useReadingListsControllerUpdate({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getReadingListsControllerFindAllQueryKey() })
        toast.success('Reading list updated')
        setEditTarget(null)
      },
    },
  })

  const { mutate: deleteList } = useReadingListsControllerRemove({
    mutation: {
      onSuccess: (_, { id }) => {
        queryClient.setQueryData(getReadingListsControllerFindAllQueryKey(), (old: any) =>
          old ? { ...old, data: (old.data ?? []).filter((l: any) => l.id !== id) } : old,
        )
        if (selectedListId === id) onSelect(null)
        toast.success('Reading list deleted')
      },
    },
  })

  function openEdit(list: ReadingListEntity) {
    setEditTarget(list)
    setEditName(list.name)
    setEditDescription(list.description ?? '')
    setEditIsPublic(list.isPublic)
  }

  return (
    <aside className="w-56 shrink-0 border-r border-border flex flex-col">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted">
          Lists
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setCreateOpen(true)}
          aria-label="New reading list"
        >
          <Plus className="size-3.5" strokeWidth={1.5} />
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        <button
          onClick={() => onSelect(null)}
          className={cn(
            'w-full flex items-center gap-2 px-4 py-2 text-sm transition-colors hover:bg-muted',
            selectedListId === null ? 'text-foreground font-medium bg-muted' : 'text-text-muted',
          )}
        >
          <BookMarked className="size-3.5 shrink-0" strokeWidth={1.5} />
          All Saved
        </button>

        {lists.map((list) => (
          <div key={list.id} className="relative group">
            <button
              onClick={() => onSelect(list.id)}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-2 transition-colors hover:bg-muted text-left',
                selectedListId === list.id ? 'bg-muted' : '',
              )}
            >
              {list.isPublic ? (
                <Globe className="size-3.5 shrink-0 text-text-muted" strokeWidth={1.5} />
              ) : (
                <Lock className="size-3.5 shrink-0 text-text-muted" strokeWidth={1.5} />
              )}
              <span
                className={cn(
                  'flex-1 text-sm truncate text-left',
                  selectedListId === list.id ? 'text-foreground font-medium' : 'text-text-muted',
                )}
              >
                {list.name}
              </span>
              <span className="font-mono text-[10px] text-text-muted shrink-0 pr-12">
                {list.postCount}
              </span>
            </button>

            {/* Edit + Share + Delete actions (shown on hover with dropdown) */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    aria-label="List options"
                    className="text-text-muted hover:text-foreground hover:bg-muted"
                  >
                    <MoreHorizontal className="size-4" strokeWidth={1.5} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setShareTarget(list)}>
                    <Share2 className="size-3.5 mr-2" strokeWidth={1.5} />
                    Share
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openEdit(list)}>
                    <Pencil className="size-3.5 mr-2" strokeWidth={1.5} />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setDeleteTarget(list)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="size-3.5 mr-2" strokeWidth={1.5} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))}
      </nav>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New reading list</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="list-name">Name</Label>
              <Input
                id="list-name"
                placeholder="e.g. Finals Revision"
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={80}
                onKeyDown={(e) => {
                  if ((e.shiftKey || e.ctrlKey) && e.key === 'Enter' && name.trim()) {
                    createList({
                      data: { name: name.trim(), description: description || undefined, isPublic },
                    })
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="list-desc">
                Description <span className="text-text-muted">(optional)</span>
              </Label>
              <Textarea
                id="list-desc"
                placeholder="What's this list for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={300}
                rows={2}
                onKeyDown={(e) => {
                  if ((e.shiftKey || e.ctrlKey) && e.key === 'Enter' && name.trim()) {
                    e.preventDefault()
                    createList({
                      data: { name: name.trim(), description: description || undefined, isPublic },
                    })
                  }
                }}
              />
              <p className="text-[11px] text-text-muted">Shift+Enter or Ctrl+Enter to create</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="list-public" checked={isPublic} onCheckedChange={setIsPublic} />
              <Label htmlFor="list-public">
                {isPublic
                  ? 'Public — anyone with the link can view'
                  : 'Private — only you can see this'}
              </Label>
            </div>
            <Button
              className="w-full"
              disabled={!name.trim() || isCreating}
              onClick={() =>
                createList({
                  data: { name: name.trim(), description: description || undefined, isPublic },
                })
              }
            >
              Create list
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(open) => !open && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit reading list</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-list-name">Name</Label>
              <Input
                id="edit-list-name"
                placeholder="e.g. Finals Revision"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                maxLength={80}
                onKeyDown={(e) => {
                  if (
                    (e.shiftKey || e.ctrlKey) &&
                    e.key === 'Enter' &&
                    editName.trim() &&
                    editTarget
                  ) {
                    updateList({
                      id: editTarget.id,
                      data: {
                        name: editName.trim(),
                        description: editDescription || undefined,
                        isPublic: editIsPublic,
                      },
                    })
                  }
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="edit-list-desc">
                Description <span className="text-text-muted">(optional)</span>
              </Label>
              <Textarea
                id="edit-list-desc"
                placeholder="What's this list for?"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                maxLength={300}
                rows={2}
                onKeyDown={(e) => {
                  if (
                    (e.shiftKey || e.ctrlKey) &&
                    e.key === 'Enter' &&
                    editName.trim() &&
                    editTarget
                  ) {
                    e.preventDefault()
                    updateList({
                      id: editTarget.id,
                      data: {
                        name: editName.trim(),
                        description: editDescription || undefined,
                        isPublic: editIsPublic,
                      },
                    })
                  }
                }}
              />
              <p className="text-[11px] text-text-muted">Shift+Enter or Ctrl+Enter to save</p>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="edit-list-public"
                checked={editIsPublic}
                onCheckedChange={setEditIsPublic}
              />
              <Label htmlFor="edit-list-public">
                {editIsPublic
                  ? 'Public — anyone with the link can view'
                  : 'Private — only you can see this'}
              </Label>
            </div>
            <Button
              className="w-full"
              disabled={!editName.trim() || isUpdating}
              onClick={() =>
                editTarget &&
                updateList({
                  id: editTarget.id,
                  data: {
                    name: editName.trim(),
                    description: editDescription || undefined,
                    isPublic: editIsPublic,
                  },
                })
              }
            >
              Save changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Share dialog */}
      {shareTarget && (
        <ShareDialog
          list={shareTarget}
          open={!!shareTarget}
          onOpenChange={(open) => !open && setShareTarget(null)}
          isOwner={true}
          onPublicityChange={() => {
            queryClient.invalidateQueries({ queryKey: getReadingListsControllerFindAllQueryKey() })
          }}
        />
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.name}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the reading list and remove all posts from it. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deleteTarget) {
                  deleteList({ id: deleteTarget.id })
                  setDeleteTarget(null)
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}
