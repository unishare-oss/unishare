'use client'

/**
 * One-tap questions shown before a conversation starts. Tapping one hands its text to `onSelect`,
 * which sends it as the student's own message.
 */
export function AiSuggestedPrompts({
  prompts,
  onSelect,
  disabled = false,
}: {
  prompts: string[]
  onSelect: (prompt: string) => void
  disabled?: boolean
}) {
  if (prompts.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5" aria-label="Suggested questions">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          onClick={() => onSelect(prompt)}
          disabled={disabled}
          className="rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground transition-colors hover:bg-accent disabled:opacity-50 disabled:pointer-events-none"
        >
          {prompt}
        </button>
      ))}
    </div>
  )
}
