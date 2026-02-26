import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

interface PostBreadcrumbProps {
  courseCode: string
  courseName: string
  title: string
}

export function PostBreadcrumb({ courseCode, courseName, title }: PostBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-1.5 mb-6" aria-label="Breadcrumb">
      <Link
        href="/"
        className="font-mono text-xs text-text-muted hover:text-foreground transition-colors duration-150"
      >
        Feed
      </Link>
      <ChevronRight className="size-3 text-text-muted" strokeWidth={1.5} />
      <span className="font-mono text-xs text-text-muted">
        {courseCode} - {courseName}
      </span>
      <ChevronRight className="size-3 text-text-muted" strokeWidth={1.5} />
      <span className="font-mono text-xs text-foreground truncate max-w-[200px]">{title}</span>
    </nav>
  )
}
