'use client'

import { useState, useCallback } from 'react'
import { X, ChevronUp, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useSearch } from '@embedpdf/plugin-search/react'
import { useScrollCapability } from '@embedpdf/plugin-scroll/react'

interface PdfSearchPanelProps {
  documentId: string
  onClose: () => void
}

export function PdfSearchPanel({ documentId, onClose }: PdfSearchPanelProps) {
  const [query, setQuery] = useState('')
  const { state, provides } = useSearch(documentId)
  const { provides: scrollProvides } = useScrollCapability()

  const total = state?.total ?? 0
  const activeIndex = state?.activeResultIndex ?? -1

  const scrollToResult = useCallback(
    (index: number) => {
      const result = state?.results[index]
      if (result) {
        scrollProvides?.forDocument(documentId).scrollToPage({ pageNumber: result.pageIndex + 1 })
      }
    },
    [state?.results, scrollProvides, documentId],
  )

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value)
      if (!provides) return
      if (value.trim()) {
        provides.startSearch()
        provides.searchAllPages(value)
      } else {
        provides.stopSearch()
      }
    },
    [provides],
  )

  const handlePrev = () => {
    if (!provides) return
    const idx = provides.previousResult()
    scrollToResult(idx)
  }

  const handleNext = () => {
    if (!provides) return
    const idx = provides.nextResult()
    scrollToResult(idx)
  }

  return (
    <div className="w-72 border-l border-border bg-card flex flex-col p-3 gap-2 shrink-0">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Search</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="size-4" strokeWidth={1.5} />
        </Button>
      </div>

      <Input
        placeholder="Search in document…"
        value={query}
        onChange={(e) => handleSearch(e.target.value)}
        autoFocus
      />

      {query.trim() && (
        <p className="text-xs text-muted-foreground">
          {total === 0
            ? 'No results'
            : `${activeIndex >= 0 ? activeIndex + 1 : 0} of ${total} results`}
        </p>
      )}

      <div className="flex gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={total === 0}
          onClick={handlePrev}
          title="Previous result"
        >
          <ChevronUp className="size-4" strokeWidth={1.5} />
          Prev
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="flex-1"
          disabled={total === 0}
          onClick={handleNext}
          title="Next result"
        >
          Next
          <ChevronDown className="size-4" strokeWidth={1.5} />
        </Button>
      </div>
    </div>
  )
}
