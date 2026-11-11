'use client'

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from 'lucide-react'
import { Toaster as Sonner, type ToasterProps } from 'sonner'

// The ink toast from the design (`.toast` in the design bundle). `unstyled` drops Sonner's own
// [data-styled] rules (padding, gap, type size, shadow), so these classes set the whole look. The
// toast uses the hero ground so it stays dark in dark mode too (--ink flips to near-white there).
// Icon colours pass 3:1 on --hero in both themes; sonner.test.tsx checks that from the tokens.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            'flex items-center gap-3 rounded-[14px] border-0 bg-hero py-2.5 pr-3 pl-4 font-body text-sm font-medium text-on-hero',
          title: 'font-semibold',
          description: 'text-on-hero/70',
          actionButton: 'rounded-md bg-brand px-2.5 py-1 text-sm font-semibold text-on-brand',
          // Visible on the hero ground: an outline in on-hero at 60%, not a surface fill.
          cancelButton:
            'rounded-md border border-on-hero/60 bg-transparent px-2 py-1 text-sm font-medium text-on-hero',
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-ok" />,
        info: <InfoIcon className="size-4 text-ice" />,
        warning: <TriangleAlertIcon className="size-4 text-brand" />,
        error: <OctagonXIcon className="size-4 text-bad" />,
        loading: <Loader2Icon className="size-4 animate-spin text-on-hero/70" />,
      }}
      style={
        {
          '--normal-bg': 'var(--hero)',
          '--normal-text': 'var(--on-hero)',
          '--normal-border': 'var(--hero)',
          '--border-radius': '14px',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
