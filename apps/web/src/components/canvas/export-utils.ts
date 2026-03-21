'use client'

import type { ExcalidrawImperativeAPI } from '@excalidraw/excalidraw/types'

export async function exportPng(api: ExcalidrawImperativeAPI, slug: string): Promise<void> {
  const { exportToBlob } = await import('@excalidraw/excalidraw')
  const blob = await exportToBlob({
    elements: api.getSceneElements(),
    appState: { exportBackground: true, exportWithDarkMode: false },
    files: api.getFiles(),
    mimeType: 'image/png',
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `unishare-board-${slug}.png`
  a.click()
  URL.revokeObjectURL(url)
}

export async function exportPdf(api: ExcalidrawImperativeAPI, slug: string): Promise<void> {
  const { exportToBlob } = await import('@excalidraw/excalidraw')
  // Use PNG-in-PDF approach for maximum compatibility (jsPDF svg() can have issues with complex Excalidraw SVGs)
  const blob = await exportToBlob({
    elements: api.getSceneElements(),
    appState: { exportBackground: true, exportWithDarkMode: false },
    files: api.getFiles(),
    mimeType: 'image/png',
  })

  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.readAsDataURL(blob)
  })

  const { jsPDF } = await import('jspdf')

  // Get image dimensions to set PDF page size
  const img = new Image()
  await new Promise<void>((resolve) => {
    img.onload = () => resolve()
    img.src = dataUrl
  })

  const pxWidth = img.naturalWidth
  const pxHeight = img.naturalHeight

  const pdf = new jsPDF({
    orientation: pxWidth > pxHeight ? 'landscape' : 'portrait',
    unit: 'px',
    format: [pxWidth, pxHeight],
  })
  pdf.addImage(dataUrl, 'PNG', 0, 0, pxWidth, pxHeight)
  pdf.save(`unishare-board-${slug}.pdf`)
}

export async function exportPngBlob(api: ExcalidrawImperativeAPI): Promise<Blob> {
  const { exportToBlob } = await import('@excalidraw/excalidraw')
  return exportToBlob({
    elements: api.getSceneElements(),
    appState: { exportBackground: true, exportWithDarkMode: false },
    files: api.getFiles(),
    mimeType: 'image/png',
  })
}

export async function postToUniShare(api: ExcalidrawImperativeAPI, slug: string): Promise<void> {
  const blob = await exportPngBlob(api)

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Failed to read export blob'))
    reader.readAsDataURL(blob)
  })

  sessionStorage.setItem(
    'pending-board-export',
    JSON.stringify({
      dataUrl,
      filename: `unishare-board-${slug}.png`,
    }),
  )
  window.open('/posts/new', '_blank')
}
