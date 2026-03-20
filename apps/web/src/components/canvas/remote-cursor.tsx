'use client'

interface RemoteCursorProps {
  x: number
  y: number
  name: string
  color: string
}

export function RemoteCursor({ x, y, name, color }: RemoteCursorProps) {
  return (
    <div className="absolute select-none" style={{ left: x, top: y, pointerEvents: 'none' }}>
      {/* Filled arrow cursor — 16×20px, white stroke outline */}
      <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
        <path
          d="M2 2L2 16L6 12L9 18L11 17L8 11L13.5 11L2 2Z"
          fill={color}
          stroke="white"
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      {/* Name pill — anchored below-right of cursor tip */}
      <div
        className="absolute left-3 top-[18px] whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium leading-none text-white"
        style={{ backgroundColor: color }}
      >
        {name}
      </div>
    </div>
  )
}
