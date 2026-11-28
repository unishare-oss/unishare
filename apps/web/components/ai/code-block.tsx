'use client'

import type { ReactNode } from 'react'
import Prism from 'prismjs'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-yaml'

/**
 * Prism token types, grouped by the colour they get. The classes are the app's own theme colours,
 * so highlighting reads on the light and the dark theme alike; the stock Prism themes are drawn for
 * one background and are unreadable on the other.
 */
const TOKEN_CLASS: Record<string, string> = {
  comment: 'text-text-muted italic',
  prolog: 'text-text-muted italic',
  doctype: 'text-text-muted italic',
  cdata: 'text-text-muted italic',
  punctuation: 'text-text-muted',
  operator: 'text-text-muted',
  keyword: 'text-info font-medium',
  atrule: 'text-info font-medium',
  selector: 'text-info',
  tag: 'text-info',
  string: 'text-success',
  char: 'text-success',
  inserted: 'text-success',
  'attr-value': 'text-success',
  number: 'text-chart-1',
  boolean: 'text-chart-1',
  constant: 'text-chart-1',
  symbol: 'text-chart-1',
  function: 'text-foreground font-semibold',
  'class-name': 'text-foreground font-semibold',
  deleted: 'text-destructive',
}

function renderTokens(tokens: (string | Prism.Token)[], keyPrefix = ''): ReactNode[] {
  return tokens.map((token, i) => {
    const key = `${keyPrefix}${i}`
    if (typeof token === 'string') return token

    const content = Array.isArray(token.content)
      ? renderTokens(token.content, `${key}-`)
      : typeof token.content === 'string'
        ? token.content
        : renderTokens([token.content], `${key}-`)

    return (
      <span key={key} className={TOKEN_CLASS[token.type]}>
        {content}
      </span>
    )
  })
}

/**
 * A fenced code block from an AI reply, with syntax colouring when the language is one Prism knows.
 *
 * Built as React elements from Prism's tokens rather than from its HTML output, so the text stays
 * text. Nothing here is ever injected as markup.
 */
export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const grammar = language ? Prism.languages[language] : undefined
  const body = grammar ? renderTokens(Prism.tokenize(code, grammar)) : code

  return (
    <pre className="font-mono text-[0.85em] p-2 rounded bg-background border border-border overflow-x-auto">
      <code>{body}</code>
    </pre>
  )
}
