import Link from 'next/link'
import { LoadingSpinner } from '@/components/shared/loading-spinner'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 px-6">
      <LoadingSpinner className="size-24" />
      <div className="text-center">
        <p className="font-mono text-[11px] uppercase tracking-widest text-amber mb-2">404</p>
        <h1 className="text-2xl font-semibold text-foreground mb-1">Page not found</h1>
        <p className="font-mono text-sm text-text-muted">
          This page doesn&apos;t exist or may have been removed.
        </p>
      </div>
      <Link
        href="/"
        className="font-mono text-sm text-text-muted hover:text-foreground transition-colors duration-150 underline underline-offset-4"
      >
        Back to feed
      </Link>
    </div>
  )
}
