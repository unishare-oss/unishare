'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Save, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { collectFields, setAtPath } from '@/lib/decks/content-fields'
import type { DeckSlideEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

interface SlideEditorProps {
  slide: DeckSlideEntity
  saving: boolean
  aiEditing: boolean
  onSave: (content: unknown) => void
  onAiEdit: (prompt: string) => void
}

export function SlideEditor({ slide, saving, aiEditing, onSave, onAiEdit }: SlideEditorProps) {
  const [content, setContent] = useState<unknown>(slide.content)
  const [instruction, setInstruction] = useState('')

  // An AI edit can restructure the slide wholesale, so local state is replaced rather than
  // merged whenever the slide arrives again from the server.
  useEffect(() => {
    setContent(slide.content)
    setInstruction('')
  }, [slide.id, slide.content])

  const fields = useMemo(() => collectFields(content), [content])
  const dirty = useMemo(
    () => JSON.stringify(content) !== JSON.stringify(slide.content),
    [content, slide.content],
  )
  const busy = saving || aiEditing

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="ai-instruction" className="flex items-center gap-2">
          <Sparkles className="size-4" />
          Ask for a change
        </Label>
        <div className="flex gap-2">
          <Input
            id="ai-instruction"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Make this shorter and add a point about node affinity"
            disabled={busy}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && instruction.trim().length >= 3 && !busy) {
                onAiEdit(instruction.trim())
              }
            }}
          />
          <Button
            variant="secondary"
            disabled={busy || instruction.trim().length < 3}
            onClick={() => onAiEdit(instruction.trim())}
          >
            {aiEditing ? <Loader2 className="size-4 animate-spin" /> : 'Apply'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Rewrites this slide. Unsaved text edits below will be replaced.
        </p>
      </div>

      <Separator />

      <div className="space-y-4">
        {fields.length === 0 && (
          <p className="text-sm text-muted-foreground">This slide has no editable text.</p>
        )}

        {fields.map((field) => {
          const id = field.path.join('.')
          return (
            <div key={id} className="space-y-2">
              <Label htmlFor={id}>{field.label}</Label>

              {field.kind === 'image' ? (
                <div className="flex items-start gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={field.value}
                    alt=""
                    className="size-16 shrink-0 rounded border border-border object-cover"
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

      <div className="flex items-center gap-3">
        <Button
          disabled={!dirty || busy}
          onClick={() => {
            onSave(content)
            toast.success('Slide saved')
          }}
        >
          {saving ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <Save className="mr-2 size-4" />
          )}
          Save slide
        </Button>
        {dirty && <span className="text-xs text-muted-foreground">Unsaved changes</span>}
      </div>
    </div>
  )
}
