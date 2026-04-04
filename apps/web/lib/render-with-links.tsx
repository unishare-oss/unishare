import { cn } from '@/lib/utils'

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]]+/gi

export function renderWithLinks(text: string, linkClassName?: string) {
  const parts = text.split(URL_REGEX)
  const urls = text.match(URL_REGEX) ?? []
  return parts.flatMap((part, i) => [
    part,
    urls[i] ? (
      <a
        key={i}
        href={urls[i]}
        target="_blank"
        rel="noopener noreferrer"
        className={cn('underline underline-offset-2 break-all hover:opacity-80', linkClassName)}
      >
        {urls[i]}
      </a>
    ) : null,
  ])
}
