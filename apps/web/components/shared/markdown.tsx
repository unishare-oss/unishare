'use client'

import { useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import Prism from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-yaml'
import { cn } from '@/lib/utils'

interface MarkdownProps {
  children: string
  className?: string
}

export function Markdown({ children, className }: MarkdownProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (ref.current) Prism.highlightAllUnder(ref.current)
  }, [children])

  return (
    <div ref={ref} className={cn('markdown', className)}>
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="text-lg font-semibold text-foreground mt-4 mb-2 first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-semibold text-foreground mt-4 mb-2 first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-semibold text-foreground mt-3 mb-1 first:mt-0">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-foreground leading-relaxed mb-3 last:mb-0">{children}</p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-outside pl-4 mb-3 last:mb-0 space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside pl-4 mb-3 last:mb-0 space-y-1">{children}</ol>
          ),
          li: ({ children }) => (
            <li className="text-sm text-foreground leading-relaxed">{children}</li>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          code: ({ className, children, ...props }) => {
            const isBlock = !!className
            const lang = className?.replace('language-', '') ?? 'none'
            if (isBlock) {
              return (
                <pre className="bg-card-dark border border-border rounded-[6px] p-4 overflow-x-auto my-3">
                  <code
                    className={`language-${lang} font-mono text-xs leading-relaxed whitespace-pre`}
                    {...props}
                  >
                    {String(children).replace(/\n$/, '')}
                  </code>
                </pre>
              )
            }
            return (
              <code
                className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded text-foreground"
                {...props}
              >
                {children}
              </code>
            )
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-amber pl-3 my-3 text-sm text-text-muted italic">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="border-border my-4" />,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber hover:text-amber-hover underline underline-offset-2"
            >
              {children}
            </a>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
