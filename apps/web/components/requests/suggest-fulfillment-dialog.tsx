'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  usePostRequestsControllerSuggest,
  getPostRequestsControllerFindOneQueryKey,
} from '@/src/lib/api/generated/post-requests/post-requests'
import { usePostsControllerFindAll } from '@/src/lib/api/generated/posts/posts'
import { Loader2 } from 'lucide-react'
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

export function SuggestFulfillmentDialog({ requestId }: { requestId: string }) {
  const [open, setOpen] = useState(false)
  const [postId, setPostId] = useState('')
  const { session } = useAuth()
  const qc = useQueryClient()

  const { data: postsData, isLoading: postsLoading } = usePostsControllerFindAll(
    { authorId: session?.user?.id, limit: 100 },
    { query: { select: (r) => r.data, enabled: open && !!session?.user?.id } },
  )
  const posts = postsData?.items ?? []

  const suggest = usePostRequestsControllerSuggest({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getPostRequestsControllerFindOneQueryKey(requestId) })
        toast.success('Suggestion submitted!')
        setOpen(false)
        setPostId('')
      },
      onError: () => toast.error('Failed to submit suggestion'),
    },
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="xs"
          className="h-7 rounded-md px-2 font-mono text-[11px] uppercase tracking-wider text-text-muted hover:bg-muted/40 hover:text-foreground"
        >
          <CheckCircle2 className="size-3.5" strokeWidth={1.5} />
          Suggest
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Suggest a Fulfillment</DialogTitle>
        </DialogHeader>
        <form
          className="flex flex-col gap-4 mt-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (postId) suggest.mutate({ id: requestId, data: { postId } })
          }}
        >
          <div className="flex flex-col gap-1.5">
            <Label>Link one of your posts</Label>
            {postsLoading ? (
              <div className="flex items-center gap-2 h-9 px-3 border border-border rounded-md text-sm text-text-muted">
                <Loader2 className="size-3.5 animate-spin" />
                Loading your posts…
              </div>
            ) : (
              <Select value={postId} onValueChange={setPostId}>
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
            )}
            {!postsLoading && posts.length === 0 && (
              <p className="text-xs text-text-muted">You haven&apos;t uploaded any posts yet.</p>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!postId || suggest.isPending}>
              {suggest.isPending ? 'Submitting…' : 'Submit'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
