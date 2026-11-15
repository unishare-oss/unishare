/** Label and colour of each post type: the one map behind the feed tag, `TypeBadge` and the post header. */
export const POST_TYPE: Record<string, { label: string; color: string }> = {
  NOTE: { label: 'Note', color: 'var(--brand-edge)' },
  OLD_QUESTION: { label: 'Past exam', color: 'var(--sky)' },
  EXERCISE: { label: 'Exercise', color: 'var(--ok)' },
}

export function getPostType(type: string) {
  return POST_TYPE[type] ?? { label: type, color: POST_TYPE.NOTE.color }
}

/** Total reactions on a post. */
export function sumReactions(counts: Record<string, unknown> | undefined): number {
  return Object.values(counts ?? {}).reduce<number>(
    (sum, n) => sum + (typeof n === 'number' ? n : 0),
    0,
  )
}
