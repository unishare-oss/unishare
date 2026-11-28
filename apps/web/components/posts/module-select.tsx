'use client'

import type { ComponentProps } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const MODULES = Array.from({ length: 20 }, (_, index) => String(index + 1))

export function ModuleSelect({
  value,
  onChange,
  ...triggerProps
}: Omit<ComponentProps<typeof SelectTrigger>, 'value' | 'onChange'> & {
  value: string
  onChange: (value: string) => void
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="w-full max-w-[220px]" {...triggerProps}>
        <SelectValue placeholder="Select…" />
      </SelectTrigger>
      <SelectContent>
        {MODULES.map((module) => (
          <SelectItem key={module} value={module}>
            Module {module}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
