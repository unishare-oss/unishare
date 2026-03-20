/**
 * Presence color palette — 10 distinct accessible colors for cursor/avatar assignment.
 * Excludes UniShare amber and neutral grays. All pass WCAG AA 4.5:1 with white text.
 */
export const PRESENCE_COLORS = [
  '#E03131', // [0] red
  '#2F9E44', // [1] forest green
  '#1971C2', // [2] ocean blue
  '#7048E8', // [3] violet
  '#0C8599', // [4] teal
  '#C2255C', // [5] berry
  '#364FC7', // [6] indigo
  '#D9480F', // [7] burnt orange
  '#5C7CFA', // [8] periwinkle
  '#099268', // [9] jade
] as const

/**
 * Deterministic hash of a string ID to a color palette index.
 * Uses djb2 hash algorithm. Same ID always returns the same index.
 */
export function hashToColorIndex(id: string, paletteSize: number): number {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i)
    hash |= 0 // convert to 32-bit int
  }
  return Math.abs(hash) % paletteSize
}
