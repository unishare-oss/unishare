'use client'

import { useState, useRef } from 'react'
import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useTags } from '@/hooks/use-tags'

interface TagSuggestion {
  id: string
  name: string
  slug: string
  postCount?: number
  color?: string
  createdAt?: string
}

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  maxTags?: number
}

export function TagInput({ value, onChange, maxTags = 5 }: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const { suggestions, isLoading } = useTags(inputValue)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleAddTag = (tag: string) => {
    if (!value.includes(tag) && value.length < maxTags) {
      onChange([...value, tag])
      setInputValue('')
      setIsOpen(false)
    }
  }

  const handleRemoveTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag))
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
    setIsOpen(true)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      handleAddTag(inputValue.trim())
    }
    if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const handleBlur = () => {
    // Commit any pending typed text as a tag on blur
    if (inputValue.trim()) {
      handleAddTag(inputValue.trim())
    }
    setTimeout(() => setIsOpen(false), 150)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="flex items-center gap-1">
            {tag}
            <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-red-500">
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>

      {value.length < maxTags && (
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            placeholder="Type a tag and press Enter..."
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            onBlur={handleBlur}
            className="w-full"
          />

          {isOpen && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto rounded-[6px] border border-border bg-card shadow-md z-10">
              {(suggestions as TagSuggestion[]).map((suggestion: TagSuggestion) => (
                <button
                  key={suggestion.id}
                  onClick={() => handleAddTag(suggestion.name)}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm text-foreground"
                >
                  {suggestion.name}
                  <span className="ml-2 text-xs text-text-muted">
                    ({suggestion.postCount || 0})
                  </span>
                </button>
              ))}
            </div>
          )}

          {isLoading && inputValue && (
            <div className="absolute top-full left-0 right-0 mt-1 rounded-[6px] border border-border bg-card p-2 text-sm text-text-muted">
              Loading suggestions...
            </div>
          )}
        </div>
      )}

      {value.length >= maxTags && (
        <p className="text-xs text-text-muted">Maximum {maxTags} tags reached</p>
      )}
    </div>
  )
}
