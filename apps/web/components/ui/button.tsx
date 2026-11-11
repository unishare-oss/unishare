import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

// Edges (box-shadow), border widths and press motion are not in these strings. They live in the
// `@layer components` block in globals.css, keyed off data-variant and data-solid, so className
// utilities such as shadow-none or border-0 still override them.
const STYLE = {
  brand: 'border-brand-edge bg-brand font-bold text-on-brand hover:bg-brand/90',
  neutral: 'border-line bg-surface font-bold text-ink hover:bg-surface-2',
  sky: 'border-sky-edge bg-sky font-bold text-white hover:bg-sky/90',
  ok: 'border-ok-edge bg-ok font-bold text-white hover:bg-ok/90',
  destructive:
    'border-bad-edge bg-destructive font-bold text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
  quiet: 'border-[1.5px] border-line bg-surface text-ink hover:bg-surface-2',
  ghost: 'text-ink hover:bg-surface-2',
  link: 'text-sky underline-offset-4 hover:underline',
} as const

// Old names still used across the app. Each one is defined here, once, as the style it takes, and
// its classes are read from STYLE. So no call site turns orange or gains a box by accident.
const OLD_NAME_STYLE = {
  default: 'neutral',
  secondary: 'neutral',
  outline: 'quiet',
} as const satisfies Record<string, keyof typeof STYLE>

const OLD_NAME_CLASSES = Object.fromEntries(
  Object.entries(OLD_NAME_STYLE).map(([name, style]) => [name, STYLE[style]]),
) as { [K in keyof typeof OLD_NAME_STYLE]: string }

// The styles with a solid fill and a press-down edge. The CSS keys off data-solid.
const SOLID_STYLES: ReadonlySet<string> = new Set(['brand', 'neutral', 'sky', 'ok', 'destructive'])

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all duration-100 ease-(--curve-out) outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        ...STYLE,
        ...OLD_NAME_CLASSES,
      },
      size: {
        default: 'h-9 px-5 py-2 has-[>svg]:px-3.5',
        xs: "h-6 gap-1 rounded-md px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 rounded-md px-3.5 has-[>svg]:px-2.5',
        lg: 'h-10 rounded-md px-7 has-[>svg]:px-4.5',
        icon: 'size-9',
        'icon-xs': "size-6 rounded-md [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'
  // The style an old name takes, or the name itself for the current names.
  const style = (OLD_NAME_STYLE as Record<string, string>)[variant ?? 'default'] ?? variant

  return (
    <Comp
      data-slot="button"
      data-variant={style}
      data-solid={SOLID_STYLES.has(style) ? '' : undefined}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
