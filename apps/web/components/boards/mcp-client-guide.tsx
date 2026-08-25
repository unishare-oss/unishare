'use client'

import { useState, type ReactNode } from 'react'
import { Check, Copy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export type OsKey = 'mac' | 'windows' | 'linux'

// ── Reusable Code Block ──────────────────────────────────────────
export function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="rounded-[6px] border border-border bg-muted overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border bg-card text-[11px] font-mono text-text-muted">
        <span className="uppercase tracking-wider">{label ?? 'Configuration'}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-text-muted hover:text-foreground transition-colors font-mono text-[11px]"
        >
          {copied ? <Check className="size-3 text-success" /> : <Copy className="size-3" />}
          <span>{copied ? 'Copied' : 'Copy'}</span>
        </button>
      </div>
      <pre className="p-3 font-mono text-xs text-foreground overflow-x-auto whitespace-pre leading-relaxed select-all">
        {code}
      </pre>
    </div>
  )
}

// ── Reusable File Path Box ───────────────────────────────────────
export function FilePathBox({ path }: { path: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(path)
    setCopied(true)
    toast.success('Copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center justify-between bg-muted border border-border px-3 py-2 rounded-[6px] font-mono text-xs text-foreground">
      <span className="truncate select-all">{path}</span>
      <button
        type="button"
        onClick={handleCopy}
        className="text-text-muted hover:text-foreground ml-2 shrink-0 transition-colors p-1 rounded-[4px] hover:bg-card border border-transparent hover:border-border"
        title="Copy path"
        aria-label="Copy path"
      >
        {copied ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
      </button>
    </div>
  )
}

// ── Reusable OS Switcher ─────────────────────────────────────────
export function OsSwitcher({ active, onChange }: { active: OsKey; onChange: (os: OsKey) => void }) {
  return (
    <div className="inline-flex items-center gap-1 bg-muted p-0.5 rounded-[6px] border border-border">
      {(['mac', 'windows', 'linux'] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            'font-mono text-[11px] px-2.5 py-1 rounded-[4px] transition-colors',
            active === item
              ? 'bg-card text-foreground font-semibold shadow-xs'
              : 'text-text-muted hover:text-foreground',
          )}
        >
          {item === 'mac' ? 'macOS' : item}
        </button>
      ))}
    </div>
  )
}

// ── Reusable Provider Guide Component ────────────────────────────
export interface McpClientGuideProps {
  mode: 'desktop' | 'cli'
  desktop: {
    title?: string
    description?: ReactNode
    steps?: (string | ReactNode)[]
    configPath?: string
    configPathLabel?: string
    configSnippet?: string
    configSnippetLabel?: string
    note?: string | ReactNode
    customHeader?: ReactNode
  }
  cli: {
    title: string
    description?: ReactNode
    command: string
    commandLabel?: string
  }
}

export function McpClientGuide({ mode, desktop, cli }: McpClientGuideProps) {
  if (mode === 'cli') {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-foreground">{cli.title}</p>
          {cli.description && (
            <p className="font-mono text-xs text-text-muted mt-0.5">{cli.description}</p>
          )}
        </div>
        <CodeBlock code={cli.command} label={cli.commandLabel ?? 'Terminal Command'} />
      </div>
    )
  }

  return (
    <div className="space-y-3.5">
      {desktop.customHeader}

      {desktop.title && (
        <div>
          <p className="text-sm font-semibold text-foreground">{desktop.title}</p>
          {desktop.description && (
            <p className="font-mono text-xs text-text-muted mt-0.5">{desktop.description}</p>
          )}
        </div>
      )}

      {desktop.steps && desktop.steps.length > 0 && (
        <ol className="space-y-2 text-xs text-text-muted">
          {desktop.steps.map((step, idx) => (
            <li key={idx} className="flex items-start gap-2.5">
              <span className="font-mono size-5 rounded-[4px] bg-muted border border-border flex items-center justify-center text-[11px] font-bold text-foreground shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <span className="leading-relaxed text-foreground/90">{step}</span>
            </li>
          ))}
        </ol>
      )}

      {desktop.configPath && (
        <div className="space-y-1">
          <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
            {desktop.configPathLabel ?? 'Config File Path'}
          </p>
          <FilePathBox path={desktop.configPath} />
        </div>
      )}

      {desktop.configSnippet && (
        <div className="space-y-1">
          {desktop.configSnippetLabel && (
            <p className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
              {desktop.configSnippetLabel}
            </p>
          )}
          <CodeBlock code={desktop.configSnippet} label="JSON Config" />
        </div>
      )}

      {desktop.note && (
        <p className="font-mono text-xs text-text-muted leading-relaxed bg-muted p-3 rounded-[6px] border border-border">
          {desktop.note}
        </p>
      )}
    </div>
  )
}
