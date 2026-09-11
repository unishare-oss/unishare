'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Pencil, X } from 'lucide-react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  getDecksControllerGetDeckQueryKey,
  getDecksControllerListDecksQueryKey,
  useDecksControllerUpdateDeck,
} from '@/src/lib/api/generated/decks/decks'
import type { DeckEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

/** Matches MaxLength on UpdateDeckDto, so the field stops before the server refuses. */
const MAX_TITLE = 120

/**
 * The deck heading, editable in place.
 *
 * Worth having because titles are not chosen — they are the first line of whatever the student
 * typed as a prompt, so they arrive lowercase and shaped like a search query. And since the
 * title became the download filename, it is the name on the file they hand in.
 *
 * A state toggle rather than contentEditable, matching comment editing elsewhere in the app:
 * an input gives length limits, Escape, and a real form control for free.
 */
export function DeckTitleEditor({ deck }: { deck: DeckEntity }) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(deck.title ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  /**
   * Seeded here rather than kept in sync by an effect.
   *
   * The field is only ever opened by this function, so reading the current title at that
   * moment is both simpler and more correct than mirroring a prop into state — a rename made
   * in another tab cannot be overwritten by a stale local value, and there is no cascading
   * render to reason about.
   */
  function startEditing() {
    setValue(deck.title ?? '')
    setEditing(true)
  }

  const { mutate: rename, isPending } = useDecksControllerUpdateDeck({
    mutation: {
      onSuccess: async () => {
        setEditing(false)
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: getDecksControllerGetDeckQueryKey(deck.id) }),
          // The library card shows the same title, on every page of it.
          queryClient.invalidateQueries({ queryKey: getDecksControllerListDecksQueryKey() }),
        ])
      },
      onError: () => toast.error('Could not rename the deck'),
    },
  })

  function commit() {
    const title = value.trim()
    if (title.length === 0) {
      // Nothing to save and nothing to complain about — treat it as a cancel.
      setEditing(false)
      setValue(deck.title ?? '')
      return
    }
    if (title === (deck.title ?? '')) {
      setEditing(false)
      return
    }
    rename({ id: deck.id, data: { title } })
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={startEditing}
        // The heading's own typography comes from PageHeader; this only adds the affordance.
        className="group/title inline-flex max-w-full items-center gap-2 text-left hover:text-primary transition-colors motion-reduce:transition-none"
        aria-label={`Rename ${deck.title ?? 'this deck'}`}
      >
        <span className="truncate">{deck.title ?? 'Untitled deck'}</span>
        <Pencil
          className="size-3.5 shrink-0 text-text-muted opacity-0 group-hover/title:opacity-100 focus-visible:opacity-100 transition-opacity motion-reduce:transition-none"
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        ref={inputRef}
        value={value}
        maxLength={MAX_TITLE}
        disabled={isPending}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            setEditing(false)
            setValue(deck.title ?? '')
          }
        }}
        // Deliberately NOT committing on blur: clicking Cancel blurs the input first, so a
        // blur-save would race the cancel and win.
        aria-label="Deck title"
        className={cn('h-9 text-lg font-extrabold tracking-tight', 'max-w-md')}
      />
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={commit}
        disabled={isPending}
        aria-label="Save title"
      >
        <Check className="size-4" strokeWidth={1.5} aria-hidden="true" />
      </Button>
      <Button
        size="icon-xs"
        variant="ghost"
        onClick={() => {
          setEditing(false)
          setValue(deck.title ?? '')
        }}
        disabled={isPending}
        aria-label="Cancel renaming"
      >
        <X className="size-4" strokeWidth={1.5} aria-hidden="true" />
      </Button>
    </div>
  )
}
