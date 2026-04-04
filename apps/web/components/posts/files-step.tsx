'use client'

import { useRef, useState } from 'react'
import { FileImage, FileSpreadsheet, FileText, FileVideo, Upload, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { getSnippetExt, getSnippetMimeType, type SnippetLanguage } from '@/lib/utils'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPTED_MIME_TYPES = new Set([
  // Documents
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.oasis.opendocument.text',
  'application/vnd.oasis.opendocument.presentation',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/epub+zip',
  // Images
  'image/jpeg',
  'image/png',
  'image/webp',
  // Text / code
  'text/plain',
  'text/markdown',
  'text/html',
  'text/css',
  'text/csv',
  'application/json',
  // Archives
  'application/zip',
  'application/x-tar',
  'application/gzip',
  'application/x-zip-compressed',
  // Video
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
])

const ACCEPTED_EXTENSIONS = new Set([
  // Web
  '.html',
  '.css',
  // JS/TS
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  // Python
  '.py',
  // Systems
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  // JVM
  '.java',
  '.kt',
  '.scala',
  // Other languages
  '.go',
  '.rs',
  '.rb',
  '.php',
  '.swift',
  '.r',
  // Data / config
  '.sql',
  '.csv',
  '.xml',
  '.json',
  '.toml',
  '.ini',
  '.yml',
  '.yaml',
  '.env',
  // Shell / scripts
  '.sh',
  // Docs / text
  '.txt',
  '.md',
  '.rmd',
  '.tex',
  '.bib',
  // Notebooks
  '.ipynb',
  // Archives
  '.zip',
  '.tar',
  '.gz',
  // Video
  '.mp4',
  '.webm',
  '.ogv',
  '.mov',
  '.avi',
  '.mkv',
])

function isFileAccepted(file: File) {
  if (ACCEPTED_MIME_TYPES.has(file.type)) return true
  const ext = '.' + file.name.split('.').pop()?.toLowerCase()
  return ACCEPTED_EXTENSIONS.has(ext)
}

const ACCEPTED_FILE_TYPES = [...ACCEPTED_MIME_TYPES, ...ACCEPTED_EXTENSIONS].join(',')

export interface FilesStepItem {
  id: string
  name: string
  size: number
  mimeType: string
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

interface FilesStepProps {
  items: FilesStepItem[]
  onAddFiles: (files: File[]) => void
  onRemove: (id: string) => void
  disabled?: boolean
}

export function FilesStep({ items, onAddFiles, onRemove, disabled }: FilesStepProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [snippetLanguage, setSnippetLanguage] = useState<SnippetLanguage>('typescript')
  const [snippetName, setSnippetName] = useState('snippet')
  const [snippetText, setSnippetText] = useState('')

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length > 0) onAddFiles(picked)
    e.target.value = ''
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return
    const dropped = Array.from(e.dataTransfer.files).filter(isFileAccepted)
    if (dropped.length > 0) onAddFiles(dropped)
  }

  function handleAttachSnippet() {
    const text = snippetText
    if (!text.trim()) return

    const safeBase = (snippetName || 'snippet').trim().replace(/\s+/g, '-')
    const ext = getSnippetExt(snippetLanguage)
    const mimeType = getSnippetMimeType(snippetLanguage)

    const file = new File([text], `${safeBase}.${ext}`, { type: mimeType })
    onAddFiles([file])

    setSnippetText('')
  }

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-foreground mb-1">Upload files</h2>
      <p className="text-sm text-text-muted mb-6">Optional. Max 50MB per file.</p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_FILE_TYPES}
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'w-full border-2 border-dashed rounded-[6px] py-10 flex flex-col items-center gap-3 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent',
          isDragging
            ? 'border-amber bg-amber-subtle scale-[1.01]'
            : 'border-border hover:border-amber hover:bg-amber-subtle',
        )}
      >
        <Upload
          className={cn(
            'size-6 transition-colors duration-150',
            isDragging ? 'text-amber' : 'text-text-muted',
          )}
          strokeWidth={1.5}
        />
        <p
          className={cn(
            'text-sm transition-colors duration-150',
            isDragging ? 'text-amber' : 'text-text-muted',
          )}
        >
          {isDragging ? 'Release to upload' : 'Drop files here or click to browse'}
        </p>
      </button>

      <div className="mt-4 rounded-[6px] border border-border bg-background p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
            Paste code snippet
          </p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={disabled || !snippetText.trim()}
            onClick={handleAttachSnippet}
          >
            Attach snippet
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs text-text-muted">Language</p>
            <Select
              value={snippetLanguage}
              onValueChange={(value) => setSnippetLanguage(value as SnippetLanguage)}
            >
              <SelectTrigger className="h-10.5 rounded-[6px] border-border bg-card text-sm text-foreground">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="typescript">TypeScript</SelectItem>
                <SelectItem value="tsx">TSX</SelectItem>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="jsx">JSX</SelectItem>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="go">Go</SelectItem>
                <SelectItem value="java">Java</SelectItem>
                <SelectItem value="rust">Rust</SelectItem>
                <SelectItem value="sql">SQL</SelectItem>
                <SelectItem value="bash">Shell</SelectItem>
                <SelectItem value="yaml">YAML</SelectItem>
                <SelectItem value="markdown">Markdown</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="text">Plain text</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <p className="text-xs text-text-muted">Filename</p>
            <Input
              value={snippetName}
              onChange={(e) => setSnippetName(e.target.value)}
              placeholder="snippet"
              disabled={disabled}
              className="h-10.5 rounded-[6px] border-border bg-card text-sm text-foreground"
            />
            <p className="text-xs text-text-muted">
              Extension is appended automatically (e.g. <span className="font-mono">snippet</span> →{' '}
              <span className="font-mono">snippet.ts</span>).
            </p>
          </div>
        </div>

        <div className="mt-3">
          <Textarea
            value={snippetText}
            onChange={(e) => setSnippetText(e.target.value)}
            placeholder="Paste your code here..."
            rows={6}
            disabled={disabled}
            className="rounded-[6px] border-border bg-card px-3 py-3 text-sm text-foreground placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-amber resize-none font-mono"
          />
        </div>
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-2 mt-4">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 border border-border rounded-[6px] px-4 py-3"
            >
              {fileIcon(item.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
              </div>
              <span className="font-mono text-xs text-text-muted shrink-0">
                {formatBytes(item.size)}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                disabled={disabled}
                onClick={() => onRemove(item.id)}
                className="shrink-0"
                aria-label="Remove file"
              >
                <X className="size-4 text-text-muted" strokeWidth={1.5} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
