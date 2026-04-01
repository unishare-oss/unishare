'use client'

import { useEffect, useRef, useState } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-markdown'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-yaml'
import {
  Link2,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileVideo,
  Download,
  Eye,
  X,
  Copy,
  Check,
  Minus,
  Plus,
} from 'lucide-react'
import type { ApiPostDetail } from '@/lib/api-types'

import {
  filesControllerGetDownloadUrl,
  filesControllerRecordDownload,
} from '@/src/lib/api/generated/files/files'
import { PdfViewer } from '@/components/shared/pdf-viewer/pdf-viewer'
import { Markdown } from '@/components/shared/markdown'
import { Button } from '@/components/ui/button'

const MAX_TEXT_PREVIEW_BYTES = 200 * 1024 // 200KB

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isTextMimeType(mimeType: string) {
  return mimeType.startsWith('text/') || mimeType === 'application/json'
}

function inferPrismLanguage(fileName: string, mimeType: string): string {
  const ext = fileName.toLowerCase().split('.').at(-1) ?? ''

  if (mimeType === 'application/json' || ext === 'json') return 'json'
  if (mimeType === 'text/markdown' || ext === 'md' || ext === 'markdown') return 'markdown'

  if (ext === 'ts') return 'typescript'
  if (ext === 'tsx') return 'tsx'
  if (ext === 'js') return 'javascript'
  if (ext === 'jsx') return 'jsx'
  if (ext === 'py') return 'python'
  if (ext === 'java') return 'java'
  if (ext === 'go') return 'go'
  if (ext === 'rs') return 'rust'
  if (ext === 'sql') return 'sql'
  if (ext === 'sh') return 'bash'
  if (ext === 'yml' || ext === 'yaml') return 'yaml'

  return 'none'
}

function fileIcon(mimeType: string) {
  if (mimeType === 'application/pdf')
    return <FileText className="size-5 text-destructive" strokeWidth={1.5} />
  if (mimeType.startsWith('image/'))
    return <FileImage className="size-5 text-success" strokeWidth={1.5} />
  if (mimeType.startsWith('video/'))
    return <FileVideo className="size-5 text-purple-400" strokeWidth={1.5} />
  if (mimeType.includes('spreadsheet') || mimeType.includes('presentation'))
    return <FileSpreadsheet className="size-5 text-amber" strokeWidth={1.5} />
  return <FileText className="size-5 text-info" strokeWidth={1.5} />
}

const DOWNLOADED_KEY = 'unishare:downloaded_files'

function getDownloadedSet(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(DOWNLOADED_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function markDownloaded(fileId: string) {
  const set = getDownloadedSet()
  set.add(fileId)
  localStorage.setItem(DOWNLOADED_KEY, JSON.stringify([...set]))
}

async function handleDownload(
  postId: string,
  fileId: string,
  fileName: string,
  onNewDownload: () => void,
) {
  const isNew = !getDownloadedSet().has(fileId)
  const [{ data }] = await Promise.all([
    filesControllerGetDownloadUrl(postId, fileId),
    isNew ? filesControllerRecordDownload(postId, fileId) : undefined,
  ])
  if (isNew) {
    markDownloaded(fileId)
    onNewDownload()
  }
  const a = document.createElement('a')
  a.href = data.url
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
    mimeType: string
    name: string
    size: number
    url?: string
    text?: string
    language?: string
    tooLarge?: boolean
  } | null>(null)
  const [copied, setCopied] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem('unishare:code-font-size')
    return stored ? Number(stored) : 13
  })

  const changeFontSize = (delta: number) =>
    setFontSize((s) => {
      const n = Math.min(20, Math.max(10, s + delta))
      localStorage.setItem('unishare:code-font-size', String(n))
      return n
    })
  const [loadingPreviewId, setLoadingPreviewId] = useState<string | null>(null)

  const [downloadCounts, setDownloadCounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(post.files.map((f) => [f.id, f.downloads])),
  )

  const previewUrlCache = useRef<Record<string, string>>({})
  const previewTextCache = useRef<Record<string, { text: string; language: string }>>({})
  const codeElRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    setCopied(false)
  }, [previewFile?.id])

  // Cleanup ObjectURLs on unmount to prevent memory leaks
  useEffect(() => {
    const cache = previewUrlCache.current
    return () => {
      Object.values(cache).forEach((url) => {
        if (url.startsWith('blob:')) URL.revokeObjectURL(url)
      })
    }
  }, [])

  useEffect(() => {
    if (!previewFile?.text || !codeElRef.current) return
    if (!previewFile.language || previewFile.language === 'none') return

    Prism.highlightElement(codeElRef.current)
  }, [previewFile?.id, previewFile?.text, previewFile?.language])

  const incrementCount = (fileId: string) =>
    setDownloadCounts((prev) => ({ ...prev, [fileId]: (prev[fileId] ?? 0) + 1 }))

  const handlePreview = async (file: {
    id: string
    mimeType: string
    name: string
    size: number
  }) => {
    if (previewFile?.id === file.id) {
      setPreviewFile(null)
      return
    }

    const textPreviewable = isTextMimeType(file.mimeType)
    const blobPreviewable =
      file.mimeType === 'application/pdf' ||
      file.mimeType.startsWith('image/') ||
      file.mimeType.startsWith('video/')

    if (textPreviewable) {
      if (previewTextCache.current[file.id]) {
        const cached = previewTextCache.current[file.id]
        setPreviewFile({ ...file, text: cached.text, language: cached.language })
        return
      }

      const language = inferPrismLanguage(file.name, file.mimeType)
      if (file.size > MAX_TEXT_PREVIEW_BYTES) {
        setPreviewFile({ ...file, text: '', language, tooLarge: true })
        return
      }

      try {
        setLoadingPreviewId(file.id)
        const res = await filesControllerGetDownloadUrl(post.id, file.id)
        const signedUrl = res.data.url

        const fileRes = await fetch(signedUrl)
        const text = await fileRes.text()

        previewTextCache.current[file.id] = { text, language }
        setPreviewFile({ ...file, text, language })
      } catch (error) {
        console.error('Failed to get text preview:', error)
      } finally {
        setLoadingPreviewId(null)
      }

      return
    }

    if (!blobPreviewable) return

    if (previewUrlCache.current[file.id]) {
      setPreviewFile({ ...file, url: previewUrlCache.current[file.id] })
      return
    }

    try {
      setLoadingPreviewId(file.id)

      const res = await filesControllerGetDownloadUrl(post.id, file.id)
      const signedUrl = res.data.url

      const fileRes = await fetch(signedUrl)
      const blob = await fileRes.blob()
      const objectUrl = URL.createObjectURL(blob)

      previewUrlCache.current[file.id] = objectUrl
      setPreviewFile({ ...file, url: objectUrl })
    } catch (error) {
      console.error('Failed to get preview URL:', error)
    } finally {
      setLoadingPreviewId(null)
    }
  }

  const isPreviewable = (mimeType: string) => {
    return (
      mimeType === 'application/pdf' ||
      mimeType.startsWith('image/') ||
      mimeType.startsWith('video/') ||
      isTextMimeType(mimeType)
    )
  }

  return (
    <>
      <section className="py-6">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-3">
          Description
        </h2>
        <p className="text-[15px] leading-[1.7] text-foreground whitespace-pre-wrap">
          {post.description}
        </p>
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
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setPreviewFile(null)}
              aria-label="Close preview"
            >
              <X className="size-4 text-text-muted" strokeWidth={1.5} />
            </Button>
          </div>

          <div className="bg-card-dark rounded-lg overflow-hidden border border-border">
            {previewFile.mimeType === 'application/pdf' && previewFile.url ? (
              <PdfViewer key={previewFile.url} url={previewFile.url} storageKey={previewFile.id} />
            ) : previewFile.mimeType.startsWith('image/') && previewFile.url ? (
              <div
                className="flex justify-center p-2 md:p-4 overflow-auto"
                style={{ touchAction: 'pinch-zoom' }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewFile.url}
                  alt={previewFile.name}
                  className="max-w-full h-auto rounded-lg shadow-sm"
                />
              </div>
            ) : previewFile.mimeType.startsWith('video/') && previewFile.url ? (
              <div className="flex justify-center p-2 md:p-4">
                <video
                  src={previewFile.url}
                  controls
                  className="max-w-full max-h-[70vh] rounded-lg shadow-sm"
                />
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="font-mono text-xs text-text-muted truncate">
                    {previewFile.language && previewFile.language !== 'none'
                      ? previewFile.language
                      : 'text'}
                  </p>
                  <div className="flex items-center gap-1">
                    {previewFile.language !== 'markdown' && (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => changeFontSize(-1)}
                          aria-label="Decrease font size"
                        >
                          <Minus className="size-3 text-text-muted" strokeWidth={1.5} />
                        </Button>
                        <span className="font-mono text-xs text-text-muted w-6 text-center">
                          {fontSize}
                        </span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => changeFontSize(1)}
                          aria-label="Increase font size"
                        >
                          <Plus className="size-3 text-text-muted" strokeWidth={1.5} />
                        </Button>
                      </>
                    )}
                    {!previewFile.tooLarge && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(previewFile.text ?? '')
                            setCopied(true)
                            setTimeout(() => setCopied(false), 1500)
                          } catch {
                            // no-op
                          }
                        }}
                        aria-label={copied ? 'Copied' : 'Copy code'}
                      >
                        {copied ? (
                          <Check className="size-4 text-success" strokeWidth={1.5} />
                        ) : (
                          <Copy className="size-4 text-text-muted" strokeWidth={1.5} />
                        )}
                      </Button>
                    )}
                  </div>
                </div>

                {previewFile.tooLarge ? (
                  <div className="text-sm text-text-muted">
                    This file is too large to preview ({formatBytes(previewFile.size)}). Download to
                    view.
                  </div>
                ) : previewFile.language === 'markdown' ? (
                  <Markdown className="p-1">{previewFile.text ?? ''}</Markdown>
                ) : (
                  <pre className="bg-card-dark border border-border rounded-[6px] p-4 overflow-x-auto">
                    <code
                      ref={codeElRef}
                      className={`language-${previewFile.language ?? 'none'} font-mono leading-relaxed text-foreground whitespace-pre`}
                      style={{ fontSize }}
                    >
                      {previewFile.text}
                    </code>
                  </pre>
                )}
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
              {(downloadCounts[file.id] ?? 0) > 0 && (
                <span className="hidden sm:inline-flex items-center gap-1 font-mono text-xs text-text-muted shrink-0">
                  <Download className="size-3" strokeWidth={1.5} />
                  {downloadCounts[file.id]}
                </span>
              )}
              <div className="flex items-center gap-1">
                {isPreviewable(file.mimeType) && (
                  <Button
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => handlePreview(file)}
                    className={`shrink-0 ${
                      previewFile?.id === file.id
                        ? 'bg-amber text-white hover:bg-amber'
                        : 'text-text-muted'
                    }`}
                    disabled={loadingPreviewId === file.id}
                    aria-label={`Preview ${file.name}`}
                  >
                    {loadingPreviewId === file.id ? (
                      <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    ) : (
                      <Eye className="size-4" strokeWidth={1.5} />
                    )}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() =>
                    handleDownload(post.id, file.id, file.name, () => incrementCount(file.id))
                  }
                  className="shrink-0"
                  aria-label={`Download ${file.name}`}
                >
                  <Download className="size-4 text-text-muted" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
