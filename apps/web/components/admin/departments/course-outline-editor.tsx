'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Upload } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  useCoursesControllerGetOutline,
  useCoursesControllerReplaceOutline,
  useCoursesControllerExtractOutline,
} from '@/src/lib/api/generated/courses/courses'
import { uploadCourseOutlineFile } from '@/lib/courses/upload-course-outline-file'

interface OutlineModule {
  moduleNumber: number
  topicsText: string // one topic per line while editing
}

function toModuleState(modules: { moduleNumber: number; topics: string[] }[]): OutlineModule[] {
  return modules.map((m) => ({ moduleNumber: m.moduleNumber, topicsText: m.topics.join('\n') }))
}

export function CourseOutlineEditor({ courseId }: { courseId: string }) {
  const [modules, setModules] = useState<OutlineModule[]>([])
  // Tracks which fetched outline is already reflected in `modules`, so a fresh load (or a
  // different course) resets the editable copy without doing it in a useEffect.
  const [loadedOutline, setLoadedOutline] = useState<unknown>(undefined)
  const [loadedCourseId, setLoadedCourseId] = useState<string | undefined>(undefined)
  // True while `modules` holds an unsaved AI-extracted preview — suppresses the server-sync
  // below so a background refetch can't silently overwrite it before the admin saves.
  const [previewing, setPreviewing] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: outline, isLoading } = useCoursesControllerGetOutline(courseId, {
    query: { select: (r) => r.data },
  })

  if (courseId !== loadedCourseId) {
    setModules(outline ? toModuleState(outline) : [])
    setLoadedOutline(outline)
    setLoadedCourseId(courseId)
    setPreviewing(false)
  } else if (!previewing && outline && outline !== loadedOutline) {
    setModules(toModuleState(outline))
    setLoadedOutline(outline)
  }

  const { mutate: extractOutline } = useCoursesControllerExtractOutline({
    mutation: {
      onSuccess: (res) => {
        setModules(toModuleState(res.data))
        setPreviewing(true)
        toast.success('Outline extracted — review and save below')
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Failed to extract outline')
      },
      onSettled: () => setExtracting(false),
    },
  })

  const { mutate: saveOutline, isPending: saving } = useCoursesControllerReplaceOutline({
    mutation: {
      onSuccess: () => {
        setPreviewing(false)
        toast.success('Outline saved')
      },
      onError: (err: unknown) => {
        toast.error(err instanceof Error ? err.message : 'Failed to save outline')
      },
    },
  })

  async function handleFileSelected(file: File | undefined) {
    if (!file) return
    setExtracting(true)
    try {
      const { key, mimeType } = await uploadCourseOutlineFile(file)
      extractOutline({ id: courseId, data: { key, mimeType } })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed')
      setExtracting(false)
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  function addModule() {
    const nextNumber = (modules.at(-1)?.moduleNumber ?? 0) + 1
    setModules([...modules, { moduleNumber: nextNumber, topicsText: '' }])
  }

  function removeModule(index: number) {
    setModules(modules.filter((_, i) => i !== index))
  }

  function updateModule(index: number, patch: Partial<OutlineModule>) {
    setModules(modules.map((m, i) => (i === index ? { ...m, ...patch } : m)))
  }

  function handleSave() {
    saveOutline({
      id: courseId,
      data: {
        modules: modules.map((m) => ({
          moduleNumber: m.moduleNumber,
          topics: m.topicsText
            .split('\n')
            .map((t) => t.trim())
            .filter(Boolean),
        })),
      },
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
          Module Outline
        </label>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          className="hidden"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
        />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={extracting}
          onClick={() => fileInputRef.current?.click()}
        >
          {extracting ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Upload className="size-3.5" strokeWidth={1.5} />
          )}
          Upload outline file
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-text-muted">Loading outline…</p>
      ) : (
        <div className="flex flex-col gap-3">
          {modules.map((m, i) => (
            <div key={i} className="flex gap-2 border border-border rounded-[6px] p-3">
              <Input
                type="number"
                min={1}
                value={m.moduleNumber}
                onChange={(e) => updateModule(i, { moduleNumber: Number(e.target.value) })}
                className="h-[38px] w-20 shrink-0"
              />
              <Textarea
                value={m.topicsText}
                onChange={(e) => updateModule(i, { topicsText: e.target.value })}
                placeholder="One topic per line"
                className="flex-1 min-h-[38px]"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                onClick={() => removeModule(i)}
                className="shrink-0 hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="size-3.5" strokeWidth={1.5} />
              </Button>
            </div>
          ))}

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={addModule}
            className="self-start"
          >
            <Plus className="size-3.5" strokeWidth={1.5} />
            Add module
          </Button>
        </div>
      )}

      <Button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="self-end bg-amber text-primary-foreground hover:bg-amber-hover"
      >
        {saving ? 'Saving…' : 'Save Outline'}
      </Button>
    </div>
  )
}
