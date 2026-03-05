'use client'

import { useState, useEffect } from 'react'
import { X, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useBookmarkCapability } from '@embedpdf/plugin-bookmark/react'
import type { BookmarkCapability } from '@embedpdf/plugin-bookmark'
import { useScroll } from '@embedpdf/plugin-scroll/react'
import { cn } from '@/lib/utils'

// fix this later pls maybe
type Bookmark = Parameters<
  Parameters<ReturnType<BookmarkCapability['getBookmarks']>['wait']>[0]
>[0]['bookmarks'][number]

interface PdfBookmarkPanelProps {
  documentId: string
  onClose: () => void
}

interface BookmarkItemProps {
  bookmark: Bookmark
  depth: number
  onNavigate: (pageIndex: number) => void
}

function BookmarkItem({ bookmark, depth, onNavigate }: BookmarkItemProps) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = (bookmark.children?.length ?? 0) > 0

  const handleClick = () => {
    if (bookmark.target?.type === 'destination') {
      onNavigate(bookmark.target.destination.pageIndex)
    } else if (bookmark.target?.type === 'action' && 'destination' in bookmark.target.action) {
      onNavigate(
        (bookmark.target.action as { destination: { pageIndex: number } }).destination.pageIndex,
      )
    }
  }

  return (
    <div>
      <div
        className="flex items-center gap-1 rounded-md hover:bg-accent cursor-pointer py-1 pr-2 text-sm"
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
      >
        {hasChildren ? (
          <Button
            variant="ghost"
            size="icon-xs"
            className="shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
            }}
          >
            <ChevronRight
              className={cn('size-3 transition-transform', expanded && 'rotate-90')}
              strokeWidth={2}
            />
          </Button>
        ) : (
          <span className="size-4 shrink-0" />
        )}
        <span className="truncate">{bookmark.title}</span>
      </div>
      {hasChildren &&
        expanded &&
        bookmark.children?.map((child, i) => (
          <BookmarkItem key={i} bookmark={child} depth={depth + 1} onNavigate={onNavigate} />
        ))}
    </div>
  )
}

export function PdfBookmarkPanel({ documentId, onClose }: PdfBookmarkPanelProps) {
  const { provides: bookmarkProvides } = useBookmarkCapability()
  const { provides: scrollProvides } = useScroll(documentId)
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([])

  useEffect(() => {
    if (!bookmarkProvides) return
    let cancelled = false
    bookmarkProvides
      .forDocument(documentId)
      .getBookmarks()
      .toPromise()
      .then(({ bookmarks: bms }) => {
        if (!cancelled) setBookmarks(bms)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [bookmarkProvides, documentId])

  const handleNavigate = (pageIndex: number) => {
    if (!scrollProvides) return
    scrollProvides.scrollToPage({ pageNumber: pageIndex + 1 })
  }

  return (
    <div className="w-64 border-r border-border bg-card overflow-y-auto flex flex-col shrink-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-sm font-medium">Outline</span>
        <Button variant="ghost" size="icon-sm" onClick={onClose}>
          <X className="size-4" strokeWidth={1.5} />
        </Button>
      </div>
      <div className="p-2 flex-1">
        {bookmarks.length === 0 ? (
          <p className="text-xs text-muted-foreground px-2 py-4 text-center">No bookmarks</p>
        ) : (
          bookmarks.map((bm, i) => (
            <BookmarkItem key={i} bookmark={bm} depth={0} onNavigate={handleNavigate} />
          ))
        )}
      </div>
    </div>
  )
}
