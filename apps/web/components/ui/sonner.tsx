'use client'

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group font-mono"
      toastOptions={{
        classNames: {
          toast:
            'text-xs tracking-wide border border-border bg-card text-foreground shadow-sm rounded-[6px]',
          title: 'font-medium',
          description: 'text-text-muted',
          actionButton: 'bg-amber text-white text-xs font-mono',
          cancelButton: 'bg-muted text-foreground text-xs font-mono',
          success: 'border-l-2 border-l-[#16a34a]',
          error: 'border-l-2 border-l-destructive',
          warning: 'border-l-2 border-l-amber',
          info: 'border-l-2 border-l-info',
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-[#16a34a]" />,
        info: <InfoIcon className="size-4 text-info" />,
        warning: <TriangleAlertIcon className="size-4 text-amber" />,
        error: <OctagonXIcon className="size-4 text-destructive" />,
        loading: <Loader2Icon className="size-4 animate-spin text-text-muted" />,
      }}
      style={
        {
          '--normal-bg': 'var(--card)',
          '--normal-text': 'var(--foreground)',
          '--normal-border': 'var(--border)',
          '--border-radius': 'var(--radius)',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
