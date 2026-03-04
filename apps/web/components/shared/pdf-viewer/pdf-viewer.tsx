'use client'

import { useMemo, useState, CSSProperties } from 'react'
import { EmbedPDF } from '@embedpdf/core/react'
import { createPluginRegistration } from '@embedpdf/core'
import { usePdfiumEngine } from '@embedpdf/engines/react'
import { DocumentManagerPluginPackage } from '@embedpdf/plugin-document-manager'
import { DocumentContent } from '@embedpdf/plugin-document-manager/react'
import { ViewportPluginPackage } from '@embedpdf/plugin-viewport'
import { Viewport } from '@embedpdf/plugin-viewport/react'
import { ScrollPluginPackage } from '@embedpdf/plugin-scroll'
import { Scroller } from '@embedpdf/plugin-scroll/react'
import { RenderPluginPackage } from '@embedpdf/plugin-render'
import { RenderLayer } from '@embedpdf/plugin-render/react'
import { TilingPluginPackage } from '@embedpdf/plugin-tiling'
import { ZoomPluginPackage, ZoomMode } from '@embedpdf/plugin-zoom'
import { InteractionManagerPluginPackage } from '@embedpdf/plugin-interaction-manager'
import { PagePointerProvider } from '@embedpdf/plugin-interaction-manager/react'
import { HistoryPluginPackage } from '@embedpdf/plugin-history'
import { AnnotationPluginPackage } from '@embedpdf/plugin-annotation'
import { AnnotationLayer } from '@embedpdf/plugin-annotation/react'
import { SearchPluginPackage } from '@embedpdf/plugin-search'
import { SearchLayer } from '@embedpdf/plugin-search/react'
import { SelectionPluginPackage } from '@embedpdf/plugin-selection'
import { SelectionLayer } from '@embedpdf/plugin-selection/react'
import { FullscreenPluginPackage } from '@embedpdf/plugin-fullscreen'
import { FullscreenProvider } from '@embedpdf/plugin-fullscreen/react'
import { BookmarkPluginPackage } from '@embedpdf/plugin-bookmark'
import { PdfToolbar } from './pdf-toolbar'
import { PdfSearchPanel } from './pdf-search-panel'
import { PdfBookmarkPanel } from './pdf-bookmark-panel'
import type { PageLayout } from '@embedpdf/plugin-scroll'

interface PdfViewerProps {
  url: string
  className?: string
  style?: CSSProperties
}

export function PdfViewer({ url, className, style }: PdfViewerProps) {
  const { engine } = usePdfiumEngine()
  const [showSearch, setShowSearch] = useState(false)
  const [showBookmarks, setShowBookmarks] = useState(false)

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
      <FullscreenProvider className="h-full">
        <EmbedPDF engine={engine} plugins={plugins}>
          {({ activeDocumentId }) => (
            <DocumentContent documentId={activeDocumentId}>
              {({ isLoaded }) =>
                isLoaded && activeDocumentId ? (
                  <div className="flex flex-col h-full border border-border rounded-md overflow-hidden">
                    <PdfToolbar
                      documentId={activeDocumentId}
                      onSearchToggle={() => setShowSearch((v) => !v)}
                      onBookmarkToggle={() => setShowBookmarks((v) => !v)}
                      showSearch={showSearch}
                      showBookmarks={showBookmarks}
                    />
                    <div className="flex flex-1 min-h-0">
                      {showBookmarks && (
                        <PdfBookmarkPanel
                          documentId={activeDocumentId}
                          onClose={() => setShowBookmarks(false)}
                        />
                      )}
                      <Viewport
                        documentId={activeDocumentId}
                        style={{
                          flex: 1,
                          backgroundColor: '#e7e3de',
                        }}
                      >
                        <Scroller
                          documentId={activeDocumentId}
                          renderPage={({ pageIndex }: PageLayout) => (
                            <PagePointerProvider
                              documentId={activeDocumentId}
                              pageIndex={pageIndex}
                              style={{
                                background: '#fff',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                                userSelect: 'none',
                              }}
                            >
                              <RenderLayer
                                documentId={activeDocumentId}
                                pageIndex={pageIndex}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                }}
                              />
                              <AnnotationLayer
                                documentId={activeDocumentId}
                                pageIndex={pageIndex}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                }}
                              />
                              <SelectionLayer documentId={activeDocumentId} pageIndex={pageIndex} />
                              <SearchLayer
                                documentId={activeDocumentId}
                                pageIndex={pageIndex}
                                style={{
                                  position: 'absolute',
                                  inset: 0,
                                  width: '100%',
                                  height: '100%',
                                }}
                              />
                            </PagePointerProvider>
                          )}
                        />
                      </Viewport>
                      {showSearch && (
                        <PdfSearchPanel
                          documentId={activeDocumentId}
                          onClose={() => setShowSearch(false)}
                        />
                      )}
                    </div>
                  </div>
                ) : null
              }
            </DocumentContent>
          )}
        </EmbedPDF>
      </FullscreenProvider>
    </div>
  )
}
