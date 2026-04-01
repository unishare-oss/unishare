'use client'

import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useUploadStore } from '@/lib/store'
import { uploadPostFile } from '@/lib/posts/upload-post-file'
import { filesControllerConfirmUpload } from '@/src/lib/api/generated/files/files'
import { getPostsControllerFindOneQueryKey } from '@/src/lib/api/generated/posts/posts'

export function BackgroundUploadManager() {
  const { tasks, setStatus, remove } = useUploadStore()
  const queryClient = useQueryClient()
  const processingIds = useRef(new Set<string>())

  useEffect(() => {
    const pending = tasks.filter((t) => t.status === 'pending')

    for (const task of pending) {
      if (processingIds.current.has(task.id)) continue
      processingIds.current.add(task.id)

      setStatus(task.id, 'uploading')

      const toastId = toast.loading(`Uploading ${task.file.name}…`, { duration: Infinity })

      uploadPostFile(task.file)
        .then((uploaded) => filesControllerConfirmUpload(task.postId, uploaded))
        .then(() => {
          setStatus(task.id, 'done')
          toast.dismiss(toastId)
          toast.success(`${task.file.name} uploaded`)
          queryClient.invalidateQueries({
            queryKey: getPostsControllerFindOneQueryKey(task.postId),
          })
          setTimeout(() => remove(task.id), 3000)
        })
        .catch(() => {
          setStatus(task.id, 'error')
          toast.dismiss(toastId)
          toast.error(`Failed to upload ${task.file.name}`)
          processingIds.current.delete(task.id)
        })
    }
  }, [tasks, setStatus, remove, queryClient])

  return null
}
