import { useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const EXT_COLORS: Record<string, string> = {
  pdf: 'var(--bad)',
  ppt: '#ea580c',
  pptx: '#ea580c',
  doc: 'var(--sky)',
  docx: 'var(--sky)',
  jpg: '#0d9488',
  jpeg: '#0d9488',
  png: '#0d9488',
  heic: '#0d9488',
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/** The drop zone and the list of chosen files. */
export function ShareFiles({
  files,
  dragging,
  onAdd,
  onRemove,
}: {
  files: File[]
  dragging: boolean
  onAdd: (files: File[]) => void
  onRemove: (index: number) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const hasFiles = files.length > 0

  return (
    <>
      <section
        aria-labelledby="sh-drop-h"
        className={cn(
          'grid justify-items-center gap-1.5 rounded-(--r) border-2 border-dashed bg-surface px-[18px] pt-[30px] pb-[22px] text-center transition-[border-color,background-color] duration-160',
          dragging ? 'border-brand bg-brand-soft' : 'border-edge',
          hasFiles &&
            'grid-cols-[auto_minmax(0,1fr)_auto] items-center justify-items-start gap-x-3 gap-y-0.5 px-3.5 py-3 text-left',
        )}
      >
        <input
          ref={fileInput}
          type="file"
          multiple
          hidden
          aria-label="Files to share"
          accept=".pdf,.ppt,.pptx,.doc,.docx,image/*"
          onChange={(e) => {
            onAdd(Array.from(e.target.files ?? []))
            e.target.value = ''
          }}
        />
        <Upload
          aria-hidden="true"
          className={cn(
            'mb-1 size-[34px] text-brand-edge',
            hasFiles && 'row-span-2 mb-0 size-[22px]',
          )}
        />
        <h2
          id="sh-drop-h"
          className={cn('text-[19px] font-semibold tracking-[-0.01em]', hasFiles && 'text-[15px]')}
        >
          {hasFiles ? 'Add more files' : 'Drop your file here'}
        </h2>
        <p
          className={cn(
            'mb-1.5 text-[13.5px] text-muted-foreground',
            hasFiles && 'col-start-2 mb-0 text-[12.5px]',
          )}
        >
          {hasFiles
            ? 'They go into the same post'
            : 'PDF, slides, Word or photos, up to 50 MB each'}
        </p>
        <Button
          type="button"
          size="sm"
          className={hasFiles ? 'col-start-3 row-span-2 row-start-1' : undefined}
          onClick={() => fileInput.current?.click()}
        >
          {hasFiles ? 'Add files' : 'Choose files'}
        </Button>
      </section>

      {hasFiles && (
        <ul aria-label="Files to share" className="-mt-2 grid gap-2">
          {files.map((file, index) => {
            const ext = (file.name.split('.').pop() ?? '').toLowerCase()
            return (
              <li
                key={`${file.name}-${index}`}
                className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-(--r-s) border border-line bg-surface py-2.5 pr-2.5 pl-3"
              >
                <span
                  aria-hidden="true"
                  style={{ background: EXT_COLORS[ext] ?? 'var(--muted-foreground)' }}
                  className="relative grid h-[42px] w-[34px] place-items-end justify-center rounded-md pb-[5px] font-mono text-[9px] leading-none font-semibold text-white before:absolute before:top-0 before:right-0 before:size-2.5 before:rounded-tr-md before:bg-[linear-gradient(225deg,var(--bg)_50%,rgba(0,0,0,0.18)_50%)] before:content-['']"
                >
                  {ext.slice(0, 4).toUpperCase()}
                </span>
                <span className="grid min-w-0 gap-1">
                  <b className="truncate text-sm font-semibold">{file.name}</b>
                  <small className="text-[12.5px] text-muted-foreground">
                    {formatSize(file.size)}
                  </small>
                </span>
                <button
                  type="button"
                  aria-label={`Remove ${file.name}`}
                  onClick={() => onRemove(index)}
                  className="grid size-8 place-items-center rounded-full text-muted-foreground active:scale-[0.94] [@media(hover:hover)_and_(pointer:fine)]:hover:bg-surface-2 [@media(hover:hover)_and_(pointer:fine)]:hover:text-ink"
                >
                  <X className="size-[18px]" />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
