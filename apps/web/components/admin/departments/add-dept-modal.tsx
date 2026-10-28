'use client'

import { useEffect } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUniversitiesControllerFindAll } from '@/src/lib/api/generated/universities/universities'
import { useFacultiesControllerFindAll } from '@/src/lib/api/generated/faculties/faculties'
import type { DepartmentEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

const deptSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  universityId: z.string().min(1, 'Pick a university'),
  facultyId: z.string().min(1, 'Pick a faculty'),
})

type DeptFormValues = z.infer<typeof deptSchema>

interface AddDeptModalProps {
  open: boolean
  /** The department being edited; omit to create one. */
  dept?: DepartmentEntity
  onClose: () => void
  onSubmit: (values: { name: string; facultyId: string }) => void
}

const labelClass = 'font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5'

export function AddDeptModal({ open, dept, onClose, onSubmit }: AddDeptModalProps) {
  const form = useForm<DeptFormValues>({
    resolver: zodResolver(deptSchema),
    defaultValues: { name: '', universityId: '', facultyId: '' },
  })

  useEffect(() => {
    if (!open) return
    form.reset({
      name: dept?.name ?? '',
      universityId: dept?.faculty.universityId ?? '',
      facultyId: dept?.faculty.id ?? '',
    })
  }, [open, dept, form])

  const universityId = useWatch({ control: form.control, name: 'universityId' })

  const { data: universities } = useUniversitiesControllerFindAll({
    query: { select: (r) => r.data },
  })
  const { data: faculties } = useFacultiesControllerFindAll(
    { universityId },
    { query: { enabled: !!universityId, select: (r) => r.data } },
  )

  function handleSubmit(values: DeptFormValues) {
    onSubmit({ name: values.name, facultyId: values.facultyId })
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{dept ? 'Edit Department' : 'Add Department'}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <label htmlFor="dept-name" className={labelClass}>
                    Name
                  </label>
                  <FormControl>
                    <Input
                      id="dept-name"
                      autoFocus
                      type="text"
                      placeholder="e.g. Computer Science"
                      className="h-[42px]"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="universityId"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <span className={labelClass}>University</span>
                  <Select
                    value={field.value}
                    onValueChange={(v) => {
                      field.onChange(v)
                      form.setValue('facultyId', '')
                    }}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full min-w-0" aria-label="University">
                        <SelectValue placeholder="Select a university" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(universities ?? []).map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.shortName} — {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facultyId"
              render={({ field }) => (
                <FormItem className="min-w-0">
                  <span className={labelClass}>Faculty</span>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={!universityId}
                  >
                    <FormControl>
                      <SelectTrigger className="w-full min-w-0" aria-label="Faculty">
                        <SelectValue
                          placeholder={
                            universityId ? 'Select a faculty' : 'Pick a university first'
                          }
                        />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(faculties ?? []).map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <div className="flex items-center gap-3 justify-end mt-1">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-amber text-primary-foreground hover:bg-amber-hover"
              >
                {dept ? 'Save' : 'Create'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
