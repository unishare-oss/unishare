import Link from 'next/link'

interface PostBreadcrumbProps {
  courseId: string
  courseCode: string
  courseName: string
  title: string
}

const linkClass = 'font-medium text-sky no-underline hover:underline'

export function PostBreadcrumb({ courseId, courseCode, courseName, title }: PostBreadcrumbProps) {
  return (
    <nav
      className="flex flex-wrap items-center gap-1.5 text-[13px] text-muted-foreground"
      aria-label="Breadcrumb"
    >
      <Link href="/feed" className={linkClass}>
        Today
      </Link>
      <span aria-hidden="true">/</span>
      <Link href={`/courses/${courseId}`} className={linkClass}>
        {courseCode} {courseName}
      </Link>
      <span aria-hidden="true">/</span>
      <span aria-current="page" className="min-w-0 truncate">
        {title}
      </span>
    </nav>
  )
}
