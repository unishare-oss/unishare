'use client'

import { PDFViewer } from '@embedpdf/react-pdf-viewer'
import { CSSProperties } from 'react'

interface PdfViewerProps {
  url: string
  className?: string
  style?: CSSProperties
}

export function PdfViewer({ url, className, style }: PdfViewerProps) {
  return (
    <div className={className} style={{ width: '100%', height: '600px', ...style }}>
      <PDFViewer
        config={{
          src: url,
          theme: { preference: 'system' },
          disabledCategories: ['document-download'],
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
