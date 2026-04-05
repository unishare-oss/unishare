export function SidebarTypingIndicator() {
  return (
    <span className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
      <span className="inline-flex gap-1">
        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.2s]" />
        <span className="w-1.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.1s]" />
      </span>
    </span>
  )
}
