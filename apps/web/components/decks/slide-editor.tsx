'use client'

import { useMemo, useState } from 'react'
import { Loader2, Save, Sparkles, Wand2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { collectFields, setAtPath } from '@/lib/decks/content-fields'
import type { DeckSlideEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface SlideEditorProps {
  slide: DeckSlideEntity
  index: number
  saving: boolean
  aiEditing: boolean
  onSave: (content: unknown) => void
  onAiEdit: (prompt: string) => void
}

const LABEL = 'font-mono text-[11px] uppercase tracking-wider text-text-muted'

export function SlideEditor({
  slide,
  index,
  saving,
  aiEditing,
  onSave,
  onAiEdit,
}: SlideEditorProps) {
  const [content, setContent] = useState<unknown>(slide.content)
  const [instruction, setInstruction] = useState('')
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)
  const [lastServerContent, setLastServerContent] = useState(slide.content)

  // An AI edit can restructure the slide wholesale, so the draft is replaced rather than
  // merged whenever a new version arrives from the server. Adjusted during render rather
  // than in an effect so there is no frame showing the previous slide's text; query-level
  // structural sharing means the identity only changes when the content really did.
  if (lastServerContent !== slide.content) {
    setLastServerContent(slide.content)
    setContent(slide.content)
    setInstruction('')
  }

  const fields = useMemo(() => collectFields(content), [content])
  const dirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(slide.content),
    [content, slide.content],
  )
  const busy = saving || aiEditing
  const canAsk = instruction.trim().length >= 3 && !busy

  /** A rewrite comes back as a whole new slide, so unsaved typing is genuinely lost. */
  function requestAiEdit() {
    if (!canAsk) return
    if (dirty) {
      setConfirmOverwrite(true)
      return
    }
    onAiEdit(instruction.trim())
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-extrabold tracking-tight text-foreground">Slide {index + 1}</h2>
        <Badge variant="outline" className="text-xs font-mono font-normal">
          {slide.layout}
        </Badge>
      </div>

      {/* Ask for a change — the generator rewrites the slide, which is the only way to alter
          anything structural: the layouts live in its app, not ours. */}
      <section className="card-pop rounded-xl bg-card p-4 flex flex-col gap-2">
        <label htmlFor="ai-instruction" className={`${LABEL} flex items-center gap-1.5`}>
          <Sparkles className="size-3.5 text-primary" strokeWidth={1.5} aria-hidden="true" />
          Ask for a change
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            id="ai-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Make this shorter and add a point about node affinity"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canAsk) {
                e.preventDefault()
                requestAiEdit()
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="sm:w-auto"
            disabled={!canAsk}
            onClick={requestAiEdit}
          >
            {aiEditing ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" strokeWidth={1.5} />
            ) : (
              <Wand2 className="size-3.5 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
            )}
            Apply
          </Button>
        </div>
        {aiEditing ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-2 rounded-md border border-border bg-muted px-3 py-2 text-xs leading-relaxed text-text-muted"
          >
            <Loader2
              className="size-3.5 shrink-0 mt-0.5 animate-spin motion-reduce:animate-none"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <span>Rewriting slide {index + 1} — this takes a few seconds.</span>
          </div>
        ) : (
          <p className="text-xs text-text-muted">
            Rewrites this slide from your description. Unsaved text edits below will be replaced.
          </p>
        )}
      </section>

      <Separator />

      {/* Text fields, derived from whatever the layout put in the slide. Names come from the
          layout's own keys, so they read as the generator names them. */}
      <div className="flex flex-col gap-5">
        {fields.length === 0 && (
          <p className="text-sm text-text-muted">This slide has no editable text.</p>
        )}

        {fields.map((field) => {
          const id = `slide-field-${field.path.join('-')}`
          return (
            <div key={id} className="flex flex-col gap-2">
              <label htmlFor={id} className={LABEL}>
                {field.label}
              </label>

              {field.kind === 'image' ? (
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={field.value}
                    alt=""
                    className="size-16 shrink-0 rounded-xl border-2 border-border-strong object-cover"
                  />
                  <Input
                    id={id}
                    value={field.value}
                    disabled={busy}
                    onChange={(e) => setContent(setAtPath(content, field.path, e.target.value))}
                  />
                </div>
              ) : field.multiline ? (
                <Textarea
                  id={id}
                  rows={4}
                  value={field.value}
                  disabled={busy}
                  onChange={(e) => setContent(setAtPath(content, field.path, e.target.value))}
                />
              ) : (
                <Input
                  id={id}
                  value={field.value}
                  disabled={busy}
                  onChange={(e) => setContent(setAtPath(content, field.path, e.target.value))}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
        <Button type="button" size="sm" disabled={!dirty || busy} onClick={() => onSave(content)}>
          {saving ? (
            <Loader2 className="size-4 mr-2 animate-spin" strokeWidth={1.5} />
          ) : (
            <Save className="size-4 mr-1.5" strokeWidth={1.5} aria-hidden="true" />
          )}
          Save slide
        </Button>
        {dirty && (
          <span className="font-mono text-[11px] uppercase tracking-wider text-amber">
            Unsaved changes
          </span>
        )}
      </div>

      <ConfirmDialog
        open={confirmOverwrite}
        onOpenChange={setConfirmOverwrite}
        title="Replace your unsaved edits?"
        description="A rewrite returns a whole new version of this slide, so the text you have typed but not saved will be lost."
        confirmLabel="Rewrite slide"
        cancelLabel="Keep editing"
        onConfirm={() => {
          setConfirmOverwrite(false)
          onAiEdit(instruction.trim())
        }}
      />
    </div>
  )
}
