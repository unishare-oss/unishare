'use client'

import { Badge } from '@/components/ui/badge'
import { useTags } from '@/hooks/use-tags'

interface TagSuggestion {
  id: string
  name: string
  slug: string
  postCount?: number
  color?: string
  createdAt?: string
}

interface TagFilterProps {
  selectedTags: string[]
  onTagsChange: (tags: string[]) => void
}

export function TagFilter({ selectedTags, onTagsChange }: TagFilterProps) {
  const { suggestions } = useTags()

  const handleToggleTag = (tagSlug: string) => {
    if (selectedTags.includes(tagSlug)) {
      onTagsChange(selectedTags.filter((t) => t !== tagSlug))
    } else {
      onTagsChange([...selectedTags, tagSlug])
    }
  }

  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Filter by Tags</div>
      <div className="flex flex-wrap gap-2">
        {(suggestions as TagSuggestion[]).map((tag: TagSuggestion) => (
          <Badge
            key={tag.id}
            variant={selectedTags.includes(tag.slug) ? 'default' : 'outline'}
            className="cursor-pointer hover:opacity-80"
            onClick={() => handleToggleTag(tag.slug)}
          >
            {tag.name}
          </Badge>
        ))}
      </div>
    </div>
  )
}
