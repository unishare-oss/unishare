import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const neutral = 'border-line bg-surface text-ink font-semibold'

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-(--r-s) text-sm font-medium whitespace-nowrap outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        brand: 'border-brand-edge bg-brand font-display text-lg font-extrabold text-on-brand',
        neutral,
        sky: 'border-sky-edge bg-sky font-semibold text-white',
        ok: 'border-ok-edge bg-ok font-semibold text-white',
        destructive: 'border-bad-edge bg-bad font-semibold text-white',
        quiet: 'border-[1.5px] border-line bg-surface font-semibold text-ink',
        outline:
          'border-[1.5px] border-edge bg-transparent font-semibold text-ink hover:bg-surface-2',
        ghost: 'border-transparent font-semibold text-ink hover:bg-surface-2',
        link: 'border-transparent text-sky underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 px-5 py-2 has-[>svg]:px-3.5',
        xs: "h-6 gap-1 px-2 text-xs has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1.5 px-3.5 has-[>svg]:px-2.5',
        lg: 'h-10 px-7 has-[>svg]:px-4.5',
        icon: 'size-9',
        'icon-xs': "size-6 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'default',
    },
  },
)

type ButtonVariant = NonNullable<VariantProps<typeof buttonVariants>['variant']>

const SOLID = ['brand', 'neutral', 'sky', 'ok', 'destructive']

function Button({
  className,
  variant,
  size = 'default',
  asChild = false,
  ...props
}: Omit<React.ComponentProps<'button'>, 'color'> &
  Omit<VariantProps<typeof buttonVariants>, 'variant'> & {
    variant?: ButtonVariant | 'default' | 'secondary'
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'
  const resolvedVariant: ButtonVariant =
    !variant || variant === 'default' || variant === 'secondary' ? 'neutral' : variant

  return (
    <Comp
      data-slot="button"
      data-variant={resolvedVariant}
      data-solid={SOLID.includes(resolvedVariant) ? '' : undefined}
      data-size={size}
      className={cn(buttonVariants({ variant: resolvedVariant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
