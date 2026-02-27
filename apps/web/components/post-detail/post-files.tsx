import { Link2, FileText, FileImage, FileSpreadsheet, Download } from 'lucide-react'
import type { ApiPostDetail } from '@/lib/api-types'

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

interface PostFilesProps {
  post: ApiPostDetail
}

export function PostFiles({ post }: PostFilesProps) {
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

      <div className="border-t border-border" />

      <section className="py-6">
        <h2 className="font-mono text-[11px] uppercase tracking-wider text-text-muted mb-3">
          Attachments
        </h2>
        <div className="flex flex-col gap-2">
          {post.files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 border border-border rounded-[6px] px-4 py-3"
            >
              {fileIcon(file.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              </div>
              <span className="font-mono text-xs text-text-muted shrink-0">
                {formatBytes(file.size)}
              </span>
              <button
                className="p-1.5 rounded-[6px] hover:bg-muted transition-colors duration-150 shrink-0"
                aria-label={`Download ${file.name}`}
              >
                <Download className="size-4 text-text-muted" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
