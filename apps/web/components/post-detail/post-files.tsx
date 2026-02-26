import { Link2, FileText, FileImage, FileSpreadsheet, Download } from 'lucide-react'
import type { Post, PostFile } from '@/lib/mock-data'

function fileIcon(type: PostFile['type']) {
  switch (type) {
    case 'PDF':
      return <FileText className="size-5 text-destructive" strokeWidth={1.5} />
    case 'DOCX':
      return <FileText className="size-5 text-info" strokeWidth={1.5} />
    case 'PPTX':
      return <FileSpreadsheet className="size-5 text-amber" strokeWidth={1.5} />
    case 'PNG':
      return <FileImage className="size-5 text-success" strokeWidth={1.5} />
  }
}

interface PostFilesProps {
  post: Post
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
              {fileIcon(file.type)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              </div>
              <span className="font-mono text-xs text-text-muted shrink-0">{file.size}</span>
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
