'use client'

import { useState, useRef, useEffect } from 'react'
import { Link2, FileText, FileImage, FileSpreadsheet, Download, Eye, X } from 'lucide-react'
import type { ApiPostDetail } from '@/lib/api-types'
import { filesControllerGetDownloadUrl } from '@/src/lib/api/generated/files/files'
import { PdfViewer } from '@/components/shared/pdf-viewer/pdf-viewer'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mimeType: string) {
  if (mimeType === 'application/pdf')
    return <FileText className="size-5 text-destructive" strokeWidth={1.5} />
  if (mimeType.startsWith('image/'))
    return <FileImage className="size-5 text-success" strokeWidth={1.5} />
  if (mimeType.includes('spreadsheet') || mimeType.includes('presentation'))
    return <FileSpreadsheet className="size-5 text-amber" strokeWidth={1.5} />
  return <FileText className="size-5 text-info" strokeWidth={1.5} />
}

async function handleDownload(postId: string, fileId: string, fileName: string) {
  const res = await filesControllerGetDownloadUrl(postId, fileId)
  const { url } = res.data
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.click()
}

interface PostFilesProps {
  post: ApiPostDetail
}

export function PostFiles({ post }: PostFilesProps) {
  const [previewFile, setPreviewFile] = useState<{
    id: string
    url: string
    mimeType: string
    name: string
  } | null>(null)
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null)
  const previewCache = useRef<Record<string, string>>({})

  // Cleanup ObjectURLs on unmount to prevent memory leaks
  useEffect(() => {
    const cache = previewCache.current
    return () => {
      Object.values(cache).forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [])

  const handlePreview = async (file: { id: string; mimeType: string; name: string }) => {
    if (previewFile?.id === file.id) {
      setPreviewFile(null)
      return
    }

    // Use cached ObjectURL if available
    if (previewCache.current[file.id]) {
      setPreviewFile({ ...file, url: previewCache.current[file.id] })
      return
    }

    try {
      setLoadingPreviewId(file.id)

      // 1. Get the presigned URL from our API
      const res = await filesControllerGetDownloadUrl(post.id, file.id)
      const signedUrl = res.data.url

      // 2. Fetch the actual file data to create a local Blob URL
      // This "pins" the file in browser memory so R2 isn't hit again
      const fileRes = await fetch(signedUrl)
      const blob = await fileRes.blob()
      const objectUrl = URL.createObjectURL(blob)

      previewCache.current[file.id] = objectUrl
      setPreviewFile({ ...file, url: objectUrl })
    } catch (error) {
      console.error('Failed to get preview URL:', error)
    } finally {
      setLoadingPreviewId(null)
    }
  }

  const isPreviewable = (mimeType: string) => {
    return mimeType === 'application/pdf' || mimeType.startsWith('image/')
  }

  return (
    <>
      <section className="py-6">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-3">
          Description
        </h2>
        <p className="text-[15px] leading-[1.7] text-foreground">{post.description}</p>
        {post.externalUrl && (
          <a
            href={post.externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 mt-3 text-sm text-amber hover:text-amber-hover font-medium"
          >
            <Link2 className="size-3.5" strokeWidth={1.5} />
            External Link
          </a>
        )}
      </section>

      {previewFile && (
        <section className="py-6 border-t border-border animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted flex items-center gap-2">
              Previewing:{' '}
              <span className="text-foreground normal-case font-sans text-sm">
                {previewFile.name}
              </span>
            </h2>
            <button
              onClick={() => setPreviewFile(null)}
              className="p-1 rounded-[6px] hover:bg-muted transition-colors duration-150"
              aria-label="Close preview"
            >
              <X className="size-4 text-text-muted" strokeWidth={1.5} />
            </button>
          </div>
          <div className="bg-card-dark rounded-lg overflow-hidden border border-border">
            {previewFile.mimeType === 'application/pdf' ? (
              <PdfViewer key={previewFile.url} url={previewFile.url} storageKey={previewFile.id} />
            ) : (
              <div className="flex justify-center p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full h-auto rounded-lg shadow-sm"
                />
              </div>
            )}
          </div>
        </section>
      )}

      <div className="border-t border-border" />

      <section className="py-6">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-3">
          Attachments
        </h2>
        <div className="flex flex-col gap-2">
          {post.files.map((file) => (
            <div
              key={file.id}
              className={`flex items-center gap-3 border rounded-[6px] px-4 py-3 transition-colors duration-200 ${
                previewFile?.id === file.id ? 'border-amber/30 bg-amber/5' : 'border-border'
              }`}
            >
              {fileIcon(file.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              </div>
              <span className="font-mono text-xs text-text-muted shrink-0">
                {formatBytes(file.size)}
              </span>
              <div className="flex items-center gap-1">
                {isPreviewable(file.mimeType) && (
                  <button
                    onClick={() => handlePreview(file)}
                    className={`p-1.5 rounded-[6px] transition-colors duration-150 shrink-0 ${
                      previewFile?.id === file.id
                        ? 'bg-amber text-white'
                        : 'hover:bg-muted text-text-muted'
                    }`}
                    disabled={loadingPreviewId === file.id}
                    aria-label={`Preview ${file.name}`}
                  >
                    {loadingPreviewId === file.id ? (
                      <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Eye className="size-4" strokeWidth={1.5} />
                    )}
                  </button>
                )}
                <button
                  onClick={() => handleDownload(post.id, file.id, file.name)}
                  className="p-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150 shrink-0"
                  aria-label={`Download ${file.name}`}
                >
                  <Download className="size-4 text-text-muted" strokeWidth={1.5} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
