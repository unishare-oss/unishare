interface EmptyStateProps {
  message: string
  description?: string
}

export function EmptyState({ message, description }: EmptyStateProps) {
  return (
    <div className="py-20 text-center px-4">
      <p className="text-sm text-text-muted font-mono">{message}</p>
      {description && <p className="text-xs text-text-muted mt-1">{description}</p>}
    </div>
  )
}
