'use client'

import { useState, useMemo, useRef, useEffect, useId } from 'react'
import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface SearchSelectOption {
  value: string
  label: string
}

interface SearchSelectProps {
  options: SearchSelectOption[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabledPlaceholder?: string
  disabled?: boolean
}

export function SearchSelect({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  disabledPlaceholder = 'Select...',
  disabled = false,
}: SearchSelectProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const [canScrollUp, setCanScrollUp] = useState(false)
  const [canScrollDown, setCanScrollDown] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const uniqueId = useId().replace(/:/g, '')
  const selected = options.find((option) => option.value === value)

  const filtered = useMemo(() => {
    const searchTerm = search.trim().toLowerCase()
    return searchTerm
      ? options.filter((option) => option.label.toLowerCase().includes(searchTerm))
      : options
  }, [options, search])

  const allItems = [{ value: '', label: placeholder }, ...filtered]

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setOpen(false)
        setSearch('')
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  useEffect(() => {
    if (activeIndex >= 0) {
      const el = listRef.current?.children[activeIndex] as HTMLElement | undefined
      el?.scrollIntoView({ block: 'nearest' })
    }
  }, [activeIndex])

  const checkScroll = () => {
    const element = listRef.current
    if (!element) return

    setCanScrollUp(element.scrollTop > 0)
    setCanScrollDown(element.scrollTop + element.clientHeight < element.scrollHeight - 1)
  }

  useEffect(() => {
    if (open) requestAnimationFrame(checkScroll)
  }, [open, filtered])

  const handleSelect = (val: string) => {
    onChange(val)
    setOpen(false)
    setSearch('')
    setActiveIndex(-1)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (['ArrowDown', 'Enter', ' '].includes(e.key)) {
        e.preventDefault()
        setOpen(true)
        setActiveIndex(0)
      }
      return
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => Math.min(i + 1, allItems.length - 1))
      return
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => Math.max(i - 1, 0))
      return
    }

    if (e.key === 'Enter' && activeIndex >= 0) {
      if (allItems[activeIndex]) {
        e.preventDefault()
        handleSelect(allItems[activeIndex].value)
      }
      return
    }

    if (e.key === 'Escape') {
      setOpen(false)
      setSearch('')
      setActiveIndex(-1)
      inputRef.current?.blur()
    }
  }

  return (
    <div ref={dropdownRef} className="relative">
      <style>{`#ss-${uniqueId}::-webkit-scrollbar{display:none}`}</style>

      <div
        className={cn(
          'flex items-center h-[42px] px-3 bg-card border-2 border-input rounded-md text-sm cursor-text',
          open && 'ring-[3px] ring-primary border-ring',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
        onClick={() => {
          if (!disabled) {
            setOpen(true)
            setActiveIndex(0)
            requestAnimationFrame(() => inputRef.current?.focus())
          }
        }}
      >
        <input
          ref={inputRef}
          type="text"
          spellCheck={false}
          autoComplete="off"
          disabled={disabled}
          className="flex-1 bg-transparent border-none outline-none text-sm text-foreground placeholder:text-muted-foreground"
          placeholder={disabled ? disabledPlaceholder : open ? '' : placeholder}
          value={open ? search : (selected?.label ?? '')}
          onChange={(e) => {
            const val = e.target.value
            setSearch(val)
            setOpen(true)

            // reset active index when typing
            if (val.trim()) {
              setActiveIndex(1)
            } else {
              setActiveIndex(0)
            }
          }}
          onFocus={() => {
            if (!disabled) {
              setOpen(true)
              setActiveIndex(0)
            }
          }}
          onKeyDown={handleKeyDown}
        />

        <ChevronDownIcon
          className={cn(
            'ml-2 h-4 w-4 shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180',
          )}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-[6px] shadow-md overflow-hidden">
          {canScrollUp && (
            <div className="flex justify-center py-1 text-muted-foreground">
              <ChevronUpIcon className="h-3 w-3" />
            </div>
          )}

          <div
            id={`ss-${uniqueId}`}
            ref={listRef}
            className="max-h-80 overflow-y-auto"
            style={{ scrollbarWidth: 'none' }}
            onScroll={checkScroll}
          >
            {allItems.map((option, index) => (
              <div
                key={option.value || `empty-${index}`}
                className={cn(
                  'flex items-center justify-between px-3 py-2 text-sm cursor-pointer',
                  index === 0 && 'text-muted-foreground',
                  index === activeIndex ? 'bg-accent' : 'hover:bg-accent',
                )}
                onMouseDown={(e) => {
                  e.preventDefault()
                  handleSelect(option.value)
                }}
                onMouseEnter={() => setActiveIndex(index)}
              >
                {option.label}
                {option.value === value && option.value !== '' && (
                  <CheckIcon className="h-4 w-4 shrink-0" />
                )}
              </div>
            ))}

            {!filtered.length && (
              <div className="px-3 py-2 text-sm text-muted-foreground">No results found...</div>
            )}
          </div>

          {canScrollDown && (
            <div className="flex justify-center py-1 text-muted-foreground">
              <ChevronDownIcon className="h-3 w-3" />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
