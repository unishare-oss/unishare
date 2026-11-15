import { toast } from 'sonner'
import { ApiError } from './fetcher'

/**
 * Shows a reportable "Error ID" when the API fails on its side (5xx).
 *
 * Wired into the React Query caches so every generated hook gets it without touching the ~40
 * call sites that already show their own feature-specific toast. 4xx errors are left alone:
 * they are the user's input or permissions, not bugs worth reporting.
 */
export function reportServerError(error: unknown) {
  if (!(error instanceof ApiError) || error.status < 500 || !error.traceId) return

  const traceId = error.traceId
  toast.error('Something went wrong on our side', {
    id: traceId,
    description: `Error ID: ${traceId}`,
    duration: 15_000,
    action: {
      label: 'Copy ID',
      onClick: () => {
        navigator.clipboard?.writeText(traceId).catch(() => undefined)
      },
    },
  })
}
