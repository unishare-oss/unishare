'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  usePostRequestsControllerFulfill,
  getPostRequestsControllerFindAllQueryKey,
} from '@/src/lib/api/generated/post-requests/post-requests'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { useAuth } from '@/contexts/auth-context'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export function FulfillRequestDialog({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false)
  const [postId, setPostId] = useState('')
  const { session } = useAuth()
  const qc = useQueryClient()

  const { data: postsData } = usePostsControllerFindAll(
    { authorId: session?.user?.id, limit: 100 },
    { query: { select: (r) => r.data, enabled: open && !!session?.user?.id } },
  )
  const posts = postsData?.items ?? []

  const fulfill = usePostRequestsControllerFulfill({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getPostRequestsControllerFindAllQueryKey() })
        toast.success('Request marked as fulfilled!')
        setOpen(false)
      },
      onError: () => toast.error('Failed to fulfill request'),
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="p-1 rounded text-text-muted hover:text-success hover:bg-success/10 transition-colors">
          <CheckCircle2 className="size-3.5" strokeWidth={1.5} />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark as Fulfilled</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-2">
          <div className="flex flex-col gap-1.5">
            <Label>Link to your post</Label>
            <Select onValueChange={setPostId}>
              <SelectTrigger>
                <SelectValue placeholder="Select one of your posts" />
              </SelectTrigger>
              <SelectContent>
                {posts.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.title ?? p.shortCode}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {posts.length === 0 && (
              <p className="text-xs text-text-muted">You haven't uploaded any posts yet.</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!postId || fulfill.isPending}
              onClick={() => fulfill.mutate({ id: requestId, data: { postId } })}
            >
              {fulfill.isPending ? 'Saving…' : 'Confirm'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
