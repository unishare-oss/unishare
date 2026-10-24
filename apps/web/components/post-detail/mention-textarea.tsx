'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { UserAvatar } from '@/components/shared/user-avatar'
import { Textarea } from '@/components/ui/textarea'
import { findMentionTrigger, type MentionPerson } from '@/lib/mentions'
import { cn } from '@/lib/utils'
import { useFollowsControllerGetMentionable } from '@/src/lib/api/generated/follows/follows'

/**
 * A textarea that suggests people you follow or who follow you when you type "@". Picking one
 * writes "@Name " and tells the parent who was picked; the parent sends only the ones whose
 * "@Name" is still in the text.
 */
export function MentionTextarea({
  value,
  onValueChange,
  onPick,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<'textarea'>, 'value' | 'onChange'> & {
  value: string
  onValueChange: (value: string) => void
  onPick: (person: MentionPerson) => void
}) {
  const textarea = useRef<HTMLTextAreaElement>(null)
  // One id per box: the composer and an open reply box can both show a list.
  const listId = useId()
  const nextCaret = useRef<number | null>(null)
  const [caret, setCaret] = useState(0)
  const [active, setActive] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  const trigger = findMentionTrigger(value, caret)
  const { data: users = [] } = useFollowsControllerGetMentionable(
    { q: trigger?.query },
    { query: { enabled: trigger !== null, select: (r) => r.data } },
  )
  const suggestions = trigger ? users : []
  const open = !dismissed && suggestions.length > 0
  const selected = Math.min(active, suggestions.length - 1)

  // Put the caret after the inserted "@Name " once the new value is in the box.
  useEffect(() => {
    if (nextCaret.current === null) return
    textarea.current?.setSelectionRange(nextCaret.current, nextCaret.current)
    nextCaret.current = null
  }, [value])

  function pick(user: (typeof suggestions)[number]) {
    if (!trigger) return
    const inserted = `@${user.name} `
    nextCaret.current = trigger.start + inserted.length
    setCaret(nextCaret.current)
    onValueChange(value.slice(0, trigger.start) + inserted + value.slice(caret))
    onPick({ id: user.id, name: user.name })
  }

  return (
    <div className="relative">
      <Textarea
        {...props}
        ref={textarea}
        value={value}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-controls={listId}
        aria-activedescendant={open ? `${listId}-${selected}` : undefined}
        onChange={(e) => {
          setCaret(e.target.selectionStart)
          setActive(0)
          setDismissed(false)
          onValueChange(e.target.value)
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (open && !e.shiftKey) {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
              e.preventDefault()
              const step = e.key === 'ArrowDown' ? 1 : -1
              setActive((selected + step + suggestions.length) % suggestions.length)
              return
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
              e.preventDefault()
              pick(suggestions[selected])
              return
            }
          }
          if (open && e.key === 'Escape') {
            e.preventDefault()
            setDismissed(true)
            return
          }
          onKeyDown?.(e)
        }}
      />
      {open && (
        <ul
          id={listId}
          role="listbox"
          className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-md"
        >
          {suggestions.map((user, index) => (
            <li
              key={user.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === selected}
              // Keep the focus in the textarea while clicking.
              onMouseDown={(e) => {
                e.preventDefault()
                pick(user)
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                'flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm',
                index === selected && 'bg-accent text-accent-foreground',
              )}
            >
              <UserAvatar name={user.name} image={user.image} size="xs" />
              <span className="font-medium">{user.name}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
