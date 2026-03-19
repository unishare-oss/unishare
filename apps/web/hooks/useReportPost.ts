'use client'

import { useMutation } from '@tanstack/react-query'
import { toast } from 'sonner'

interface ReportPostPayload {
  postId: string
  reason: 'SPAM' | 'OFFENSIVE' | 'COPYRIGHT' | 'OTHER'
  comment?: string
}

export function useReportPost() {
  return useMutation({
    mutationFn: async (payload: ReportPostPayload) => {
      const response = await fetch(`/api/posts/${payload.postId}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reason: payload.reason,
          comment: payload.comment,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to report post')
      }

      return response.json()
    },
    onSuccess: () => {
      toast.success('Post reported. Thank you for helping keep Unishare safe.')
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to report post')
    },
  })
}
