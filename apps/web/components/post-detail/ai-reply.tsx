'use client'

import ReactMarkdown from 'react-markdown'

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
]

export function AiReply({ children }: { children: string }) {
  return (
    <div className="flex flex-col gap-1.5 [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
      <ReactMarkdown
        allowedElements={ALLOWED}
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
          pre: ({ children }) => (
            <pre className="font-mono text-[0.85em] p-2 rounded bg-background border border-border overflow-x-auto">
              {children}
            </pre>
          ),
          h1: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
          h2: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
          h3: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
          h4: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
