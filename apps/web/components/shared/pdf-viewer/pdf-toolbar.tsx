'use client'

import { useEffect, useCallback, useMemo, useState, useRef } from 'react'
import {
  MousePointer2,
  Highlighter,
  Pencil,
  StickyNote,
  Trash2,
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Search,
  BookOpen,
  Maximize,
  Minimize,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useZoom } from '@embedpdf/plugin-zoom/react'
import { useScroll } from '@embedpdf/plugin-scroll/react'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import { useFullscreen } from '@embedpdf/plugin-fullscreen/react'
import { ZoomMode } from '@embedpdf/plugin-zoom'
import { cn } from '@/lib/utils'

interface PdfToolbarProps {
  documentId: string
  onSearchToggle: () => void
  onBookmarkToggle: () => void
  showSearch: boolean
  showBookmarks: boolean
}

const ANNOTATION_TOOLS: { id: string; icon: React.ReactNode; title: string }[] = [
  {
    id: 'highlight',
    icon: <Highlighter className="size-4" strokeWidth={1.5} />,
    title: 'Highlight',
  },
  { id: 'ink', icon: <Pencil className="size-4" strokeWidth={1.5} />, title: 'Draw' },
  { id: 'freeText', icon: <StickyNote className="size-4" strokeWidth={1.5} />, title: 'Text note' },
]

const Separator = () => <div className="w-px h-5 bg-border mx-1 shrink-0" />

export function PdfToolbar({
  documentId,
  onSearchToggle,
  onBookmarkToggle,
  showSearch,
  showBookmarks,
}: PdfToolbarProps) {
  const { state: zoomState, provides: zoomProvides } = useZoom(documentId)
  const { state: scrollState, provides: scrollProvides } = useScroll(documentId)
  const { state: annotationState, provides: annotationProvides } = useAnnotation(documentId)
  const { state: fullscreenState, provides: fullscreenProvides } = useFullscreen()

  const zoomPercent = Math.round((zoomState?.currentZoomLevel ?? 1) * 100)
  const currentPage = scrollState?.currentPage ?? 1
  const totalPages = scrollState?.totalPages ?? 0

  const [pageInput, setPageInput] = useState('')
  const [isEditingPage, setIsEditingPage] = useState(false)
  const pageInputRef = useRef<React.ComponentRef<typeof Input>>(null)

  const commitPageJump = useCallback(() => {
    const n = parseInt(pageInput, 10)
    if (!isNaN(n) && n >= 1 && n <= totalPages) {
      scrollProvides?.scrollToPage({ pageNumber: n })
    }
    setIsEditingPage(false)
  }, [pageInput, totalPages, scrollProvides])
  const activeToolId = annotationState?.activeToolId ?? null
  const selectedUids = useMemo(
    () => annotationState?.selectedUids ?? [],
    [annotationState?.selectedUids],
  )
  const isFullscreen = fullscreenState?.isFullscreen ?? false

  const handleDelete = useCallback(() => {
    if (!annotationProvides || !annotationState || selectedUids.length === 0) return
    const toDelete: { pageIndex: number; id: string }[] = []
    for (const [pageIndexStr, uids] of Object.entries(annotationState.pages)) {
      for (const uid of uids) {
        if (selectedUids.includes(uid)) {
          toDelete.push({ pageIndex: Number(pageIndexStr), id: uid })
        }
      }
    }
    annotationProvides.deleteAnnotations(toDelete)
  }, [annotationProvides, annotationState, selectedUids])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Delete' && e.key !== 'Backspace') return
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
        return
      handleDelete()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [handleDelete])

  return (
    <div className="bg-card border-b border-border px-3 h-11 flex items-center gap-1 shrink-0 overflow-x-auto">
      {/* Select tool */}
      <Button
        variant="ghost"
        size="icon-sm"
        title="Select"
        className={cn(!activeToolId && 'bg-accent text-accent-foreground')}
        onClick={() => annotationProvides?.setActiveTool(null)}
      >
        <MousePointer2 className="size-4" strokeWidth={1.5} />
      </Button>

      <Separator />

      {/* Annotation tools */}
      {ANNOTATION_TOOLS.map(({ id, icon, title }) => (
        <Button
          key={id}
          variant="ghost"
          size="icon-sm"
          title={title}
          className={cn(activeToolId === id && 'bg-amber/15 text-amber ring-2 ring-amber/50')}
          onClick={() => {
            if (!annotationProvides) return
            annotationProvides.setActiveTool(activeToolId === id ? null : id)
          }}
        >
          {icon}
        </Button>
      ))}

      {/* Delete — visible only when an annotation is selected */}
      {selectedUids.length > 0 && (
        <>
          <Separator />
          <Button
            variant="ghost"
            size="icon-sm"
            title="Delete selected (Del)"
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
          >
            <Trash2 className="size-4" strokeWidth={1.5} />
          </Button>
        </>
      )}

      <Separator />

      {/* Zoom */}
      <Button
        variant="ghost"
        size="icon-sm"
        title="Zoom out"
        onClick={() => zoomProvides?.zoomOut()}
      >
        <ZoomOut className="size-4" strokeWidth={1.5} />
      </Button>
      <button
        className="px-2 h-7 rounded-md text-xs font-mono tabular-nums hover:bg-accent transition-colors"
        title="Reset zoom to fit width"
        onClick={() => zoomProvides?.requestZoom(ZoomMode.FitWidth)}
      >
        {zoomPercent}%
      </button>
      <Button variant="ghost" size="icon-sm" title="Zoom in" onClick={() => zoomProvides?.zoomIn()}>
        <ZoomIn className="size-4" strokeWidth={1.5} />
      </Button>

      <Separator />

      {/* Page navigation */}
      <Button
        variant="ghost"
        size="icon-sm"
        title="Previous page"
        disabled={currentPage <= 1}
        onClick={() => scrollProvides?.scrollToPreviousPage()}
      >
        <ChevronLeft className="size-4" strokeWidth={1.5} />
      </Button>
      {isEditingPage ? (
        <Input
          ref={pageInputRef}
          type="number"
          min={1}
          max={totalPages}
          value={pageInput}
          onChange={(e) => setPageInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitPageJump()
            if (e.key === 'Escape') setIsEditingPage(false)
          }}
          onBlur={commitPageJump}
          className="w-10 h-7 text-center text-xs font-mono tabular-nums px-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
      ) : (
        <button
          className="px-2 h-7 rounded-md text-xs font-mono tabular-nums text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors whitespace-nowrap"
          title="Jump to page"
          onClick={() => {
            setPageInput(String(currentPage))
            setIsEditingPage(true)
            setTimeout(() => pageInputRef.current?.select(), 0)
          }}
        >
          {currentPage} / {totalPages}
        </button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        title="Next page"
        disabled={currentPage >= totalPages}
        onClick={() => scrollProvides?.scrollToNextPage()}
      >
        <ChevronRight className="size-4" strokeWidth={1.5} />
      </Button>

      <div className="flex-1" />

      {/* Right actions */}
      <Button
        variant="ghost"
        size="icon-sm"
        title="Search"
        className={cn(showSearch && 'bg-accent text-accent-foreground')}
        onClick={onSearchToggle}
      >
        <Search className="size-4" strokeWidth={1.5} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title="Bookmarks"
        className={cn(showBookmarks && 'bg-accent text-accent-foreground')}
        onClick={onBookmarkToggle}
      >
        <BookOpen className="size-4" strokeWidth={1.5} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
        onClick={() => fullscreenProvides?.toggleFullscreen()}
      >
        {isFullscreen ? (
          <Minimize className="size-4" strokeWidth={1.5} />
        ) : (
          <Maximize className="size-4" strokeWidth={1.5} />
        )}
      </Button>
    </div>
  )
}
