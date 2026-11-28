'use client'

import { Search, Hash } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface TagSuggestion {
  id: string
  name: string
  slug: string
  color: string | null
  postCount: number
}

interface FeedHeaderProps {
  searchQuery: string
  onSearchChange: (value: string) => void
  onTagSelect: (tagName: string) => void
}

function SearchInput({ searchQuery, onSearchChange, onTagSelect }: FeedHeaderProps) {
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState(searchQuery)
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInputValue(searchQuery)
  }, [searchQuery])

  const { data: suggestions } = useQuery<TagSuggestion[]>({
    queryKey: ['tag-autocomplete', inputValue],
    queryFn: async () => {
      if (!inputValue.trim()) return []
      const res = await fetch(`/api/tags/autocomplete?q=${encodeURIComponent(inputValue.trim())}`)
      const json = await res.json()
      return (json.data ?? []) as TagSuggestion[]
    },
    enabled: inputValue.trim().length > 0,
    staleTime: 10_000,
  })

  const items = suggestions ?? []
  const showDropdown = open && items.length > 0

  // Reset active index when suggestions change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIndex(-1)
  }, [suggestions])

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  function handleChange(value: string) {
    setInputValue(value)
    onSearchChange(value)
    setOpen(true)
  }

  function handleSelect(tag: TagSuggestion) {
    setInputValue(tag.name)
    setOpen(false)
    setActiveIndex(-1)
    onTagSelect(tag.name)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showDropdown) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(items[activeIndex])
    } else if (e.key === 'Tab' && activeIndex >= 0) {
      e.preventDefault()
      handleSelect(items[activeIndex])
    } else if (e.key === 'Escape') {
      setOpen(false)
      setActiveIndex(-1)
    }
  }

  return (
    <Popover open={showDropdown} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className="relative w-full">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-[18px] text-muted-foreground pointer-events-none"
            strokeWidth={1.5}
          />
          <Input
            ref={inputRef}
            type="text"
            aria-label="Search your feed"
            placeholder="Search posts or #tags"
            value={inputValue}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            aria-expanded={showDropdown}
            aria-activedescendant={activeIndex >= 0 ? `tag-option-${activeIndex}` : undefined}
            aria-autocomplete="list"
            className="h-auto rounded-(--r-s) border-[1.5px] border-line bg-surface py-[9px] pr-3 pl-[38px] text-sm shadow-none focus-visible:border-sky focus-visible:ring-0 dark:bg-surface md:text-sm"
          />
        </div>
      </PopoverAnchor>
      <PopoverContent
        className="p-1 w-[var(--radix-popover-trigger-width)]"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <ul ref={listRef} role="listbox">
          {items.map((tag, i) => (
            <li key={tag.id} id={`tag-option-${i}`} role="option" aria-selected={i === activeIndex}>
              <Button
                variant="ghost"
                size="sm"
                className={`w-full justify-start gap-2 font-normal ${i === activeIndex ? 'bg-accent' : ''}`}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(tag)
                }}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <Hash className="size-3 text-muted-foreground shrink-0" strokeWidth={2} />
                <span>{tag.name}</span>
                <span className="ml-auto text-xs text-muted-foreground">{tag.postCount}</span>
              </Button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** The feed's search box, with tag suggestions. */
export function FeedHeader(props: FeedHeaderProps) {
  return <SearchInput {...props} />
}
