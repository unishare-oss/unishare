'use client'

import { useRef, useState } from 'react'
import { FileText, Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const ACCEPTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileSourceProps {
  file: File | null
  onFileChange: (f: File | null) => void
  disabled: boolean
}

export function FileSource({ file, onFileChange, disabled }: FileSourceProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)

  function handlePickFile(picked: File[]) {
    const valid = picked.filter((f) => ACCEPTED_MIME_TYPES.has(f.type))
    if (picked.length > valid.length) toast.error('Only PDF and Word documents are accepted')
    if (valid.length > 0) onFileChange(valid[valid.length - 1])
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    handlePickFile(Array.from(e.target.files ?? []))
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
    handlePickFile(Array.from(e.dataTransfer.files))
  }

  return (
    <section>
      <h2 className="text-[22px] font-semibold text-foreground mb-1">Upload study material</h2>
      <p className="text-sm text-muted-foreground mb-6">PDF or Word document. One file per quiz.</p>

      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
        disabled={disabled}
        onChange={handleInputChange}
      />

      {!file ? (
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            'w-full border-2 border-dashed rounded-[6px] py-10 flex flex-col items-center gap-3 transition-all duration-150 cursor-pointer disabled:cursor-not-allowed',
            isDragging
              ? 'border-amber bg-amber/5 scale-[1.01]'
              : 'border-border hover:border-amber hover:bg-amber/5',
          )}
        >
          <Upload
            className={cn(
              'size-6 transition-colors',
              isDragging ? 'text-amber' : 'text-muted-foreground',
            )}
            strokeWidth={1.5}
          />
          <p className={cn('text-sm', isDragging ? 'text-amber' : 'text-muted-foreground')}>
            {isDragging ? 'Release to upload' : 'Drop file here or click to browse'}
          </p>
        </button>
      ) : (
        <div className="flex items-center gap-3 border border-border rounded-[6px] px-4 py-3">
          <FileText className="size-5 text-destructive shrink-0" strokeWidth={1.5} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={disabled}
            onClick={() => onFileChange(null)}
          >
            <X className="size-4 text-muted-foreground" strokeWidth={1.5} />
          </Button>
        </div>
      )}
    </section>
  )
}
