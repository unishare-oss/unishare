'use client'

import { useMemo, useRef, useEffect, useState, CSSProperties, useCallback } from 'react'
import { EmbedPDF } from '@embedpdf/core/react'
import { createPluginRegistration } from '@embedpdf/core'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager'
import { DocumentContent } from '@embedpdf/plugin-document-manager/react'
import { ViewportPluginPackage } from '@embedpdf/plugin-viewport'
import { Viewport } from '@embedpdf/plugin-viewport/react'
import { ScrollPluginPackage } from '@embedpdf/plugin-scroll'
import { Scroller, useScroll } from '@embedpdf/plugin-scroll/react'
import { RenderPluginPackage } from '@embedpdf/plugin-render'
import { RenderLayer } from '@embedpdf/plugin-render/react'
import { TilingPluginPackage } from '@embedpdf/plugin-tiling'
import { ZoomPluginPackage, ZoomMode } from '@embedpdf/plugin-zoom'
import { InteractionManagerPluginPackage } from '@embedpdf/plugin-interaction-manager'
import { PagePointerProvider } from '@embedpdf/plugin-interaction-manager/react'
import { HistoryPluginPackage } from '@embedpdf/plugin-history'
import { AnnotationPluginPackage } from '@embedpdf/plugin-annotation'
import { AnnotationLayer, createRenderer } from '@embedpdf/plugin-annotation/react'
import { SearchPluginPackage } from '@embedpdf/plugin-search'
import { SearchLayer } from '@embedpdf/plugin-search/react'
import { SelectionPluginPackage } from '@embedpdf/plugin-selection'
import { SelectionLayer } from '@embedpdf/plugin-selection/react'
import { FullscreenPluginPackage } from '@embedpdf/plugin-fullscreen/react'
import { BookmarkPluginPackage } from '@embedpdf/plugin-bookmark'
import { useAnnotation } from '@embedpdf/plugin-annotation/react'
import type { AnnotationDocumentState } from '@embedpdf/plugin-annotation'
import { PdfToolbar } from './pdf-toolbar'
import { PdfSearchPanel } from './pdf-search-panel'
import { PdfBookmarkPanel } from './pdf-bookmark-panel'
import { usePdfAnnotationStore } from '@/lib/store'
import type { PageLayout } from '@embedpdf/plugin-scroll'
import type { PdfAnnotationObject } from '@embedpdf/models'

// PdfAnnotationSubtype.LINK = 2
const LINK_SUBTYPE = 2

interface PdfViewerProps {
  url: string
  storageKey?: string
  className?: string
  style?: CSSProperties
}

interface PdfDocumentProps {
  documentId: string
  storageKey: string
}

function PdfDocument({ documentId, storageKey }: PdfDocumentProps) {
  const [showSearch, setShowSearch] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)
  const { provides: scrollProvides } = useScroll(documentId)
  const { provides: annotationProvides } = useAnnotation(documentId)
  const saveAnnotations = usePdfAnnotationStore((s) => s.save)
  const getStoredAnnotations = usePdfAnnotationStore((s) => s.get)

  const scrollRef = useRef(scrollProvides)
  useEffect(() => {
    scrollRef.current = scrollProvides
  }, [scrollProvides])

  const hasRestoredRef = useRef(false)
  useEffect(() => {
    if (!annotationProvides || hasRestoredRef.current) return
    hasRestoredRef.current = true
    const stored = getStoredAnnotations(storageKey)
    if (!stored.length) return
    annotationProvides.importAnnotations(
      stored.map((annotation) => ({ annotation: annotation as PdfAnnotationObject })),
    )
  }, [annotationProvides, getStoredAnnotations, storageKey])

  // PdfAnnotationSubtype.LINK = 2 — exclude link annotations from storage
  const handleAnnotationStateChange = useCallback(
    (docState: AnnotationDocumentState) => {
      const annotations = Object.values(docState.byUid)
        .filter((ta) => ta.commitState !== 'deleted' && (ta.object.type as number) !== 2)
        .map((ta) => ta.object)
      saveAnnotations(storageKey, annotations)
    },
    [saveAnnotations, storageKey],
  )
  useEffect(() => {
    if (!annotationProvides) return
    return annotationProvides.onStateChange(handleAnnotationStateChange)
  }, [annotationProvides, handleAnnotationStateChange])

  const [linkRenderer, setLinkRenderer] = useState<ReturnType<typeof createRenderer> | null>(null)
  useEffect(() => {
    setLinkRenderer(
      createRenderer({
        id: 'link',
        matches: (a): a is typeof a => (a as { type: number }).type === LINK_SUBTYPE,
        render: ({ currentObject, scale, onClick }) => {
          const w = (currentObject as { rect: { size: { width: number; height: number } } }).rect
            .size.width
          const h = (currentObject as { rect: { size: { width: number; height: number } } }).rect
            .size.height
          return (
            <svg
              style={{
                position: 'absolute',
                width: w * scale,
                height: h * scale,
                pointerEvents: 'none',
              }}
              width={w * scale}
              height={h * scale}
              viewBox={`0 0 ${w} ${h}`}
            >
              <rect
                x={0}
                y={0}
                width={w}
                height={h}
                fill="transparent"
                onPointerDown={onClick}
                onTouchStart={onClick}
                style={{ cursor: 'pointer', pointerEvents: 'visible' }}
              />
            </svg>
          )
        },
        interactionDefaults: { isDraggable: false, isResizable: false, isRotatable: false },
        useAppearanceStream: false,
        selectOverride: (e, annotation) => {
          e.stopPropagation()
          const target = (
            annotation.object as {
              target?: {
                type: string
                destination?: { pageIndex: number }
                action?: { destination?: { pageIndex: number } }
              }
            }
          ).target
          if (!target) return
          let pageIndex: number | undefined
          if (target.type === 'destination' && target.destination) {
            pageIndex = target.destination.pageIndex
          } else if (target.type === 'action' && target.action?.destination) {
            pageIndex = target.action.destination.pageIndex
          }
          if (pageIndex !== undefined) {
            scrollRef.current?.scrollToPage({ pageNumber: pageIndex + 1 })
          }
        },
        hideSelectionMenu: () => true,
      }),
    )
  }, [])

  return (
    <div className="flex flex-col h-full border border-border rounded-md overflow-hidden">
      <PdfToolbar
        documentId={documentId}
        onSearchToggle={() => setShowSearch((v) => !v)}
        onBookmarkToggle={() => setShowBookmarks((v) => !v)}
        showSearch={showSearch}
        showBookmarks={showBookmarks}
      />
      <div className="flex flex-1 min-h-0">
        {showBookmarks && (
          <PdfBookmarkPanel documentId={documentId} onClose={() => setShowBookmarks(false)} />
        )}
        <Viewport documentId={documentId} style={{ flex: 1, backgroundColor: '#e7e3de' }}>
          <Scroller
            documentId={documentId}
            renderPage={({ pageIndex }: PageLayout) => (
              <PagePointerProvider
                documentId={documentId}
                pageIndex={pageIndex}
                style={{
                  background: '#fff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  userSelect: 'none',
                }}
              >
                <RenderLayer
                  documentId={documentId}
                  pageIndex={pageIndex}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                />
                <AnnotationLayer
                  documentId={documentId}
                  pageIndex={pageIndex}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                  annotationRenderers={linkRenderer ? [linkRenderer] : []}
                />
                <SelectionLayer documentId={documentId} pageIndex={pageIndex} />
                <SearchLayer
                  documentId={documentId}
                  pageIndex={pageIndex}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
                />
              </PagePointerProvider>
            )}
          />
        </Viewport>
        {showSearch && (
          <PdfSearchPanel documentId={documentId} onClose={() => setShowSearch(false)} />
        )}
      </div>
    </div>
  )
}

export function PdfViewer({ url, storageKey, className, style }: PdfViewerProps) {
  const { engine } = usePdfiumEngine()

  const plugins = useMemo(
    () => [
      createPluginRegistration(DocumentManagerPluginPackage, {
        initialDocuments: [{ url }],
      }),
      createPluginRegistration(TilingPluginPackage),
      createPluginRegistration(ViewportPluginPackage),
      createPluginRegistration(ScrollPluginPackage),
      createPluginRegistration(RenderPluginPackage),
      createPluginRegistration(ZoomPluginPackage, {
        defaultZoomLevel: ZoomMode.FitWidth,
      }),
      createPluginRegistration(InteractionManagerPluginPackage),
      createPluginRegistration(HistoryPluginPackage),
      createPluginRegistration(AnnotationPluginPackage),
      createPluginRegistration(SearchPluginPackage),
      createPluginRegistration(SelectionPluginPackage),
      createPluginRegistration(FullscreenPluginPackage),
      createPluginRegistration(BookmarkPluginPackage),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  if (!engine) {
    return (
      <div className={className} style={{ width: '100%', height: '600px', ...style }}>
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          Loading PDF engine…
        </div>
      </div>
    )
  }

  return (
    <div className={className} style={{ width: '100%', height: '600px', ...style }}>
      <EmbedPDF engine={engine} plugins={plugins}>
        {({ activeDocumentId }) => (
          <DocumentContent documentId={activeDocumentId}>
            {({ isLoaded }) =>
              isLoaded && activeDocumentId ? (
                <PdfDocument documentId={activeDocumentId} storageKey={storageKey ?? url} />
              ) : null
            }
          </DocumentContent>
        )}
      </EmbedPDF>
    </div>
  )
}
