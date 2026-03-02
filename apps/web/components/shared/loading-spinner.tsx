'use client'

import { cn } from '@/lib/utils'

type LoadingSpinnerProps = {
  className?: string
}

export function LoadingSpinner({ className }: LoadingSpinnerProps) {
  return (
    <div
      className={cn('relative inline-flex size-16 items-center justify-center', className)}
      aria-hidden="true"
    >
      <div className="absolute inset-[8%] rounded-[26px] bg-[radial-gradient(circle_at_center,rgba(254,243,199,0.55),rgba(247,243,238,0)_72%)]" />
      <div className="note-sheet note-sheet-back absolute inset-[20%] z-0 translate-x-[-12%] translate-y-[10%] rotate-[-8deg]">
        <div className="note-accent" />
        <div className="note-line top-[28%]" />
        <div className="note-line top-[46%] w-[48%]" />
      </div>
      <div className="note-sheet note-sheet-middle absolute inset-[16%] z-10 translate-x-[8%] translate-y-[4%] rotate-[5deg]">
        <div className="note-accent" />
        <div className="note-line top-[28%]" />
        <div className="note-line top-[46%] w-[52%]" />
        <div className="note-line top-[64%] w-[38%]" />
      </div>
      <div className="note-sheet note-sheet-front absolute inset-[12%] z-20">
        <div className="note-corner" />
        <div className="note-accent" />
        <div className="note-line top-[28%]" />
        <div className="note-line top-[46%]" />
        <div className="note-line top-[64%] w-[42%]" />
      </div>
    </div>
  )
}
