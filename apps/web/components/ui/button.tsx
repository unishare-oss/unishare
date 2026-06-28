import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-all outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          'border-2 border-border-strong bg-primary font-bold text-primary-foreground shadow-[3px_3px_0_0_var(--shadow-color)] hover:bg-primary/90 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none',
        destructive:
          'border-2 border-border-strong bg-destructive font-bold text-white shadow-[3px_3px_0_0_var(--shadow-color)] hover:bg-destructive/90 focus-visible:ring-destructive/20 active:translate-x-[3px] active:translate-y-[3px] active:shadow-none dark:bg-destructive/60 dark:focus-visible:ring-destructive/40',
        outline:
          'border-2 bg-background shadow-[2px_2px_0_0_var(--shadow-color)] hover:bg-accent hover:text-accent-foreground active:translate-x-[2px] active:translate-y-[2px] active:shadow-none dark:border-input dark:bg-input/30 dark:hover:bg-input/50',
        secondary:
          'border-2 border-border bg-secondary font-bold text-secondary-foreground shadow-[2px_2px_0_0_var(--shadow-color)] hover:bg-secondary/80 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
        ghost:
          'hover:bg-accent hover:text-accent-foreground active:translate-y-[1px] dark:hover:bg-accent/50',
        link: 'text-primary underline-offset-4 hover:underline',
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

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
