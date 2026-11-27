'use client'

import ReactMarkdown from 'react-markdown'
import { Children, isValidElement, type ReactNode } from 'react'
import { CodeBlock } from '@/components/ai/code-block'
import { cn } from '@/lib/utils'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'

/**
 * Renders an AI chat reply as restricted markdown.
 *
 * Deliberately NOT `components/shared/markdown.tsx`, which renders trusted content (the changelog)
 * and turns links into clickable anchors. This text is different in kind: the model is instructed
 * to answer ONLY from the document, and documents are uploaded by users. A PDF containing a
 * phishing URL can get that URL faithfully reproduced in a reply, and rendering it as an anchor
 * would make the platform the delivery mechanism.
 *
 * So links render as plain text — still readable, still copyable, not one click away. Images are
 * dropped for the same reason plus a second one: a remote image URL is a tracking pixel that fires
 * on render, before the student has decided to trust anything.
 *
 * react-markdown does not render raw HTML unless `rehype-raw` is added (it is not), so there is no
 * XSS surface here. This restriction is about social engineering, not script injection.
 */
const ALLOWED = [
  'p',
  'strong',
  'em',
  'ul',
  'ol',
  'li',
  'code',
  'pre',
  'blockquote',
  'br',
  'del',
  // Headings are permitted but styled down to body weight: a reply is a paragraph or two inside a
  // small bubble, and an <h1> in that space reads as a layout bug.
  'h1',
  'h2',
  'h3',
  'h4',
  // Tables, from GFM syntax.
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  // What KaTeX writes for formulas. It runs before this filter, so its output has to be allowed
  // or a formula would collapse into loose text. None of it comes from the reply's own markup:
  // raw HTML is never parsed, so a reply cannot contain a span or svg of its own. KaTeX also
  // runs with `trust` off, which is what keeps `\href` and `\url` from making links.
  'span',
  'svg',
  'path',
  'line',
]

/**
 * Models write math as `\( ... \)` and `\[ ... \]` as often as `$ ... $`, and only the dollar form
 * is math to the parser. Rewriting the bracket forms means a formula renders whichever way the
 * model happened to write it.
 */
function normaliseMath(text: string): string {
  return text
    .replace(
      /\\\[([\s\S]+?)\\\]/g,
      // Display math has to sit on lines of its own for the parser to treat it as a block.
      (_m, body: string) => ['', '', '$$', body.trim(), '$$', '', ''].join('\n'),
    )
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, body: string) => `$${body}$`)
}

export function AiReply({
  children,
  streaming = false,
}: {
  children: string
  streaming?: boolean
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0',
        // A caret on the last block while words are still arriving. Drawn by CSS, so it is never part
        // of the text a student selects or copies, and it holds still for anyone who asked for less motion.
        streaming &&
          "[&>*:last-child]:after:ml-0.5 [&>*:last-child]:after:content-['▍'] [&>*:last-child]:after:animate-pulse motion-reduce:[&>*:last-child]:after:animate-none",
      )}
    >
      <ReactMarkdown
        allowedElements={ALLOWED}
        remarkPlugins={[remarkGfm, remarkMath]}
        // `output: 'html'` skips the MathML copy KaTeX also writes, which would need a dozen more
        // element names allowed. `throwOnError: false` and `strict: 'ignore'` matter while a reply
        // streams: a half-written formula must show as text, not throw.
        rehypePlugins={[
          [rehypeKatex, { output: 'html', throwOnError: false, strict: 'ignore', trust: false }],
        ]}
        // Anything outside the allowlist keeps its TEXT and loses its markup, rather than being
        // removed. Dropping the node would silently delete the words inside a link, which is worse
        // than showing them: the student would never know something had been elided.
        unwrapDisallowed
        components={{
          p: ({ children }) => <p className="leading-relaxed">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc pl-4 flex flex-col gap-0.5">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-4 flex flex-col gap-0.5">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="italic">{children}</em>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-border pl-2.5 text-text-muted">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="font-mono text-[0.85em] px-1 py-0.5 rounded bg-background border border-border">
              {children}
            </code>
          ),
          pre: ({ children }) => {
            const code = Children.toArray(children)[0]
            if (isValidElement<{ className?: string; children?: ReactNode }>(code)) {
              const { className, children: text } = code.props
              if (typeof text === 'string') {
                const language = /language-([\w+-]+)/.exec(className ?? '')?.[1]
                return <CodeBlock code={text.replace(/\n$/, '')} language={language} />
              }
            }
            return (
              <pre className="font-mono text-[0.85em] p-2 rounded bg-background border border-border overflow-x-auto">
                {children}
              </pre>
            )
          },
          h1: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
          h3: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
          h4: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
          table: ({ children }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-[0.95em]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-border bg-background px-2 py-1 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => <td className="border border-border px-2 py-1">{children}</td>,
        }}
      >
        {normaliseMath(children)}
      </ReactMarkdown>
    </div>
  )
}
