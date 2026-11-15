'use client'

import * as React from 'react'
import { Tabs as TabsPrimitive } from 'radix-ui'

import { cn } from '@/lib/utils'

function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', className)}
      {...props}
    />
  )
}

const tabsListClass =
  'group/tabs-list inline-flex w-fit items-center gap-5 border-line group-data-[orientation=horizontal]/tabs:border-b group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col group-data-[orientation=vertical]/tabs:items-stretch group-data-[orientation=vertical]/tabs:gap-1 group-data-[orientation=vertical]/tabs:border-l'

function TabsList({
  className,
  // `variant` is accepted for old call sites; both values render the same underline.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  variant,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: 'default' | 'line' }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant="line"
      className={cn(tabsListClass, className)}
      {...props}
    />
  )
}

function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        "relative inline-flex items-center justify-center gap-1.5 border-0 bg-transparent px-0.5 pt-2 pb-2.5 text-[15px] font-medium whitespace-nowrap text-muted-foreground outline-none group-data-[orientation=vertical]/tabs:justify-start group-data-[orientation=vertical]/tabs:pl-3 hover:text-ink focus-visible:ring-[3px] focus-visible:ring-sky disabled:pointer-events-none disabled:opacity-50 data-[state=active]:font-semibold data-[state=active]:text-ink motion-safe:transition-[color,scale] motion-safe:duration-160 motion-safe:ease-(--curve-out) motion-safe:active:scale-[0.97] [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        'after:absolute after:rounded-[3px] after:bg-brand after:opacity-0 data-[state=active]:after:opacity-100 group-data-[orientation=horizontal]/tabs:after:inset-x-0 group-data-[orientation=horizontal]/tabs:after:-bottom-px group-data-[orientation=horizontal]/tabs:after:h-[3px] group-data-[orientation=horizontal]/tabs:after:rounded-b-none group-data-[orientation=vertical]/tabs:after:inset-y-0 group-data-[orientation=vertical]/tabs:after:-left-px group-data-[orientation=vertical]/tabs:after:w-[3px] group-data-[orientation=vertical]/tabs:after:rounded-l-none',
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
