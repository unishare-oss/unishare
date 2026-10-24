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
      <span key={index} className="font-semibold text-primary">
        {part.text}
      </span>
    ) : (
      <Fragment key={index}>{renderWithLinks(part.text, linkClassName)}</Fragment>
    ),
  )
}
