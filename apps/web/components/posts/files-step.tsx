'use client'

import { useRef } from 'react'
import { FileImage, FileSpreadsheet, FileText, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/webp',
].join(',')

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

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? [])
    if (picked.length > 0) onAddFiles(picked)
    e.target.value = ''
  }

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-foreground mb-1">Upload files</h2>
      <p className="text-sm text-text-muted mb-6">Optional. Max 50MB per file.</p>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME_TYPES}
        className="hidden"
        disabled={disabled}
        onChange={handleChange}
      />

      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        className="w-full border-2 border-dashed border-border rounded-[6px] py-10 flex flex-col items-center gap-3 hover:border-amber hover:bg-amber-subtle transition-all duration-150 cursor-pointer disabled:cursor-not-allowed disabled:border-border disabled:bg-transparent"
      >
        <Upload className="size-6 text-text-muted" strokeWidth={1.5} />
        <p className="text-sm text-text-muted">Drop files here or click to browse</p>
      </button>

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
