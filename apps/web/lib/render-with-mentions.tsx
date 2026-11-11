import { Fragment } from 'react'
import { splitMentions, type MentionPerson } from '@/lib/mentions'
import { renderWithLinks } from '@/lib/render-with-links'

/** A comment's text: each mentioned "@Name" in bold, the rest with its links. */
export function renderWithMentions(
  text: string,
  mentions: MentionPerson[],
  linkClassName?: string,
) {
  return splitMentions(
    text,
    mentions.map((mention) => mention.name),
  ).map((part, index) =>
    part.mention ? (
      <span key={index} className="rounded-sm bg-brand-soft px-1 font-semibold text-foreground">
        {part.text}
      </span>
    ) : (
      <Fragment key={index}>{renderWithLinks(part.text, linkClassName)}</Fragment>
    ),
  )
}
