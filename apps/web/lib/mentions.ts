export interface MentionPerson {
  id: string
  name: string
}

interface MentionPart {
  text: string
  mention: boolean
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/**
 * Splits `text` around each "@Name" for the given names. An "@Name" counts at the start of the
 * text or after whitespace, and when no letter or digit follows it.
 */
export function splitMentions(text: string, names: string[]): MentionPart[] {
  if (names.length === 0) return [{ text, mention: false }]
  const longestFirst = [...names].sort((a, b) => b.length - a.length)
  const pattern = new RegExp(`(?<!\\S)@(?:${longestFirst.map(escapeRegExp).join('|')})(?!\\w)`, 'g')
  const parts: MentionPart[] = []
  let last = 0
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index), mention: false })
    parts.push({ text: match[0], mention: true })
    last = match.index + match[0].length
  }
  if (last < text.length) parts.push({ text: text.slice(last), mention: false })
  return parts
}

/** The ids of the picked people whose "@Name" is still in the text, once each. */
export function mentionIdsIn(text: string, picked: MentionPerson[]): string[] {
  const ids = picked
    .filter((person) => splitMentions(text, [person.name]).some((part) => part.mention))
    .map((person) => person.id)
  return [...new Set(ids)]
}

/**
 * The "@word" being typed right before the caret (at the start of the text or after
 * whitespace): where its "@" sits and the word after it. Null when there is none.
 */
export function findMentionTrigger(text: string, caret: number) {
  const match = /(?<!\S)@([^\s@]*)$/.exec(text.slice(0, caret))
  if (!match) return null
  return { start: match.index, query: match[1] }
}
