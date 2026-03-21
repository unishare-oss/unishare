'use client'

import { useState } from 'react'
import { Flag } from 'lucide-react'
import { useReportPost } from '@/hooks/useReportPost'

interface ReportDialogProps {
  postId: string
  onSuccess?: () => void
}

type ReportReason = 'SPAM' | 'OFFENSIVE' | 'COPYRIGHT' | 'OTHER'

const REPORT_REASONS: { value: ReportReason; label: string; description: string }[] = [
  { value: 'SPAM', label: 'Spam', description: 'Duplicate or off-topic' },
  { value: 'OFFENSIVE', label: 'Offensive', description: 'Inappropriate language' },
  { value: 'COPYRIGHT', label: 'Copyright', description: 'IP violation' },
  { value: 'OTHER', label: 'Other', description: 'Other policy violation' },
]

export function ReportDialog({ postId, onSuccess }: ReportDialogProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null)
  const [comment, setComment] = useState('')
  const { mutate: reportPost, isPending } = useReportPost()

  const handleSubmit = () => {
    if (!selectedReason) return

    reportPost(
      { postId, reason: selectedReason, comment: comment || undefined },
      {
        onSuccess: () => {
          setIsOpen(false)
          setSelectedReason(null)
          setComment('')
          onSuccess?.()
        },
      },
    )
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-2 py-1 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
        title="Report this post"
      >
        <Flag size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 p-6">
            <h2 className="text-lg font-semibold mb-4">Report Post</h2>

            <div className="space-y-3 mb-6">
              <label className="block text-sm font-medium">Reason</label>
              {REPORT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className="flex items-start gap-3 p-3 border rounded-md cursor-pointer hover:bg-gray-50"
                >
                  <input
                    type="radio"
                    name="reason"
                    value={reason.value}
                    checked={selectedReason === reason.value}
                    onChange={() => setSelectedReason(reason.value)}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{reason.label}</div>
                    <div className="text-sm text-gray-600">{reason.description}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="mb-6">
              <label htmlFor="comment" className="block text-sm font-medium mb-2">
                Additional details (optional)
              </label>
              <textarea
                id="comment"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Provide context for your report..."
                maxLength={500}
                className="w-full px-3 py-2 border border-gray-200 rounded-md text-sm"
                rows={3}
              />
              <div className="text-xs text-gray-500 mt-1">{comment.length}/500</div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm font-medium border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!selectedReason || isPending}
                className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-300"
              >
                {isPending ? 'Submitting...' : 'Report'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
