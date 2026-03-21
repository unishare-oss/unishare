'use client'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

interface BoardsEmptyStateProps {
  onCreateClick: () => void
}

export function BoardsEmptyState({ onCreateClick }: BoardsEmptyStateProps) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-12 text-center gap-6">
      {/* Inline SVG — blank canvas/drawing board illustration */}
      <svg
        aria-hidden="true"
        width="120"
        height="100"
        viewBox="0 0 120 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="text-muted-foreground"
      >
        {/* Board frame */}
        <rect
          x="10"
          y="10"
          width="100"
          height="72"
          rx="4"
          stroke="var(--border)"
          strokeWidth="2"
          fill="var(--card)"
        />
        {/* Inner canvas area */}
        <rect
          x="18"
          y="18"
          width="84"
          height="56"
          rx="2"
          stroke="var(--border)"
          strokeWidth="1"
          fill="var(--background)"
          strokeDasharray="4 2"
        />
        {/* Pencil/pen icon */}
        <line
          x1="75"
          y1="50"
          x2="90"
          y2="35"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="90"
          y1="35"
          x2="93"
          y2="32"
          stroke="var(--primary)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Small shapes suggesting drawing */}
        <circle
          cx="40"
          cy="45"
          r="6"
          stroke="var(--muted-foreground)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
        />
        <rect
          x="50"
          y="55"
          width="12"
          height="8"
          rx="1"
          stroke="var(--muted-foreground)"
          strokeWidth="1.5"
          fill="none"
          opacity="0.5"
        />
        {/* Board legs */}
        <line
          x1="30"
          y1="82"
          x2="25"
          y2="96"
          stroke="var(--border)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <line
          x1="90"
          y1="82"
          x2="95"
          y2="96"
          stroke="var(--border)"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>

      <div className="flex flex-col gap-2">
        <h2 className="text-base font-semibold text-foreground">No boards yet</h2>
        <p className="text-sm text-muted-foreground">
          Create a board and start collaborating with your classmates.
        </p>
      </div>

      <Button variant="default" onClick={onCreateClick}>
        <Plus className="size-4 mr-1.5" strokeWidth={1.5} />
        New Board
      </Button>
    </div>
  )
}
