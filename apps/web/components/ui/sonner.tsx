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
      className="toaster group"
      position="bottom-center"
      offset={24}
      mobileOffset={88}
      toastOptions={{
        classNames: {
          toast:
            'w-fit! max-w-[calc(100vw-32px)] gap-3! py-2.5! pr-3! pl-4! font-sans text-sm! font-medium shadow-none!',
          title: 'font-medium',
          description: 'text-bg/70!',
          actionButton: 'bg-transparent! px-1.5! py-1! font-semibold text-brand!',
          cancelButton: 'border! border-bg/40! bg-transparent! text-bg!',
        },
      }}
      icons={{
        success: <CircleCheckIcon className="size-4 text-ok" />,
        info: <InfoIcon className="size-4 text-sky" />,
        warning: <TriangleAlertIcon className="size-4 text-brand" />,
        error: <OctagonXIcon className="size-4 text-bad" />,
        loading: <Loader2Icon className="size-4 animate-spin text-bg/70" />,
      }}
      style={
        {
          '--normal-bg': 'var(--ink)',
          '--normal-text': 'var(--bg)',
          '--normal-border': 'var(--ink)',
          '--border-radius': '14px',
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
