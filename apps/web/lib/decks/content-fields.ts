/**
 * Turns a slide's content object into a flat list of editable fields, and writes edits back.
 *
 * The generator defines a different content shape per layout, and names the same thing
 * differently in each — `headline_text` in one layout, `main_heading` in another,
 * `slide_headline` in a third. Rather than model any of them, this walks whatever arrives and
 * exposes every string it finds. New layouts, and layouts from templates nobody has used yet,
 * work without a code change.
 *
 * The cost of that generality is honest labels: a field is named after its key, so the editor
 * says "Headline text" because that is what the layout calls it.
 */

export type FieldKind = 'text' | 'image'

export interface ContentField {
  /** Path into the content object, e.g. ['right_text_panel', 'body_copy']. */
  path: (string | number)[]
  key: string
  label: string
  value: string
  kind: FieldKind
  multiline: boolean
}

/**
 * Keys whose values exist for the generator's benefit, not the reader's. Editing an image
 * prompt after the fact does nothing — the image is already chosen — so showing it would be
 * a field that silently fails to do anything.
 */
const HIDDEN_SUFFIXES = ['_prompt', '_query']

const IMAGE_SUFFIXES = ['_url']

function humanize(key: string): string {
  const words = key.replace(/[_-]+/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

function endsWithAny(key: string, suffixes: string[]): boolean {
  return suffixes.some((s) => key.endsWith(s))
}

export function collectFields(content: unknown): ContentField[] {
  const out: ContentField[] = []

  function walk(node: unknown, path: (string | number)[]) {
    if (Array.isArray(node)) {
      node.forEach((item, i) => walk(item, [...path, i]))
      return
    }
    if (node && typeof node === 'object') {
      for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
        walk(value, [...path, key])
      }
      return
    }
    if (typeof node !== 'string') return

    const key = String(path[path.length - 1] ?? '')
    if (endsWithAny(key, HIDDEN_SUFFIXES)) return

    const isImage = endsWithAny(key, IMAGE_SUFFIXES)
    out.push({
      path,
      key,
      label: humanize(key),
      value: node,
      kind: isImage ? 'image' : 'text',
      // Long copy and anything with a line break wants room; a headline does not.
      multiline: !isImage && (node.length > 90 || node.includes('\n')),
    })
  }

  walk(content, [])
  return out
}

/**
 * Immutably sets a value at a path, cloning only the nodes along it.
 *
 * Structural sharing matters here beyond tidiness: the untouched parts of the object are
 * posted straight back to the generator, and cloning them wholesale risks turning something
 * it cares about into a plain object.
 */
export function setAtPath(content: unknown, path: (string | number)[], value: string): unknown {
  if (path.length === 0) return value

  const [head, ...rest] = path

  if (Array.isArray(content)) {
    const index = Number(head)
    const next = content.slice()
    next[index] = setAtPath(content[index], rest, value)
    return next
  }

  const obj = (content ?? {}) as Record<string, unknown>
  return { ...obj, [String(head)]: setAtPath(obj[String(head)], rest, value) }
}

/** Best-effort human title for a slide, for the editor's slide list. */
export function slideTitle(content: unknown, index: number): string {
  const fields = collectFields(content).filter((f) => f.kind === 'text')
  const headline = fields.find((f) => /head|title/i.test(f.key))
  const first = headline ?? fields[0]
  const text = first?.value.replace(/\*\*/g, '').trim()
  return text && text.length > 0 ? text : `Slide ${index + 1}`
}
