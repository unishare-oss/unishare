'use client'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/shared/page-header'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { RoomCard } from '@/components/boards/room-card'
import { RoomCardSkeleton } from '@/components/boards/room-card-skeleton'
import { CreateRoomDialog } from '@/components/boards/create-room-dialog'
import { BoardsEmptyState } from '@/components/boards/boards-empty-state'
import {
  useCollabControllerFindByOwner,
  getCollabControllerFindByOwnerQueryKey,
} from '@/src/lib/api/generated/collab/collab'

export default function BoardsPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [createOpen, setCreateOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: rooms, isLoading } = useCollabControllerFindByOwner({
    query: {
      select: (r) => r.data,
      enabled: !!user?.id,
    },
  })

  const [localRooms, setLocalRooms] = useState<typeof rooms>(undefined)
  const displayRooms = localRooms ?? rooms

  const invalidateRooms = () => {
    queryClient.invalidateQueries({ queryKey: getCollabControllerFindByOwnerQueryKey() })
    setLocalRooms(undefined)
  }

  const handleDelete = (slug: string) => {
    setLocalRooms((prev) => (prev ?? rooms ?? []).filter((r) => r.slug !== slug))
    invalidateRooms()
  }

  const handleRename = (slug: string, title: string) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    setLocalRooms((prev) =>
      (prev ?? rooms ?? []).map((r) => (r.slug === slug ? { ...r, title: title as any } : r)),
    )
  }

  const handleVisibilityChange = (slug: string, visibility: string) => {
    setLocalRooms((prev) =>
      (prev ?? rooms ?? []).map((r) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        r.slug === slug ? { ...r, visibility: visibility as any } : r,
      ),
    )
  }

  const showSkeleton = authLoading || isLoading
  const showEmpty = !showSkeleton && (!displayRooms || displayRooms.length === 0)
  const showGrid = !showSkeleton && displayRooms && displayRooms.length > 0

  return (
    <div className="flex flex-col min-h-screen">
      <PageHeader
        title="Boards"
        subtitle={
          showGrid
            ? `${displayRooms!.length} board${displayRooms!.length === 1 ? '' : 's'}`
            : undefined
        }
        action={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4 mr-1.5" strokeWidth={1.5} />
            New Board
          </Button>
        }
      />
      <div className="flex-1 bg-card">
        <div className="p-6">
          {showSkeleton && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <RoomCardSkeleton />
              <RoomCardSkeleton />
              <RoomCardSkeleton />
            </div>
          )}
          {showEmpty && (
            <div className="grid grid-cols-1">
              <BoardsEmptyState onCreateClick={() => setCreateOpen(true)} />
            </div>
          )}
          {showGrid && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayRooms.map((room) => (
                <RoomCard
                  key={room.slug}
                  room={{
                    id: room.id,
                    slug: room.slug,
                    title: (room.title as unknown as string | null) ?? null,
                    visibility: room.visibility,
                    createdAt: room.createdAt,
                    updatedAt: room.updatedAt,
                    hasPassword: (room as any).hasPassword ?? false,
                  }}
                  onDelete={handleDelete}
                  onRename={handleRename}
                  onVisibilityChange={handleVisibilityChange}
                />
              ))}
            </div>
          )}
        </div>
      </div>
      <CreateRoomDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  )
}
