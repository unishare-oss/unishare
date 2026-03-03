'use client'

import type { UseFormReturn } from 'react-hook-form'
import type { CreatePostFormValues } from '@/lib/posts/form-types'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { PostType } from './type-step'

const EMPTY_SELECT_VALUE = '__empty__'

const TITLE_ERROR = 'Title must be at least 3 characters'
const DESCRIPTION_ERROR = 'Description is required'
const YEAR_ERROR = 'Year must be between 1 and 6'
const SEMESTER_ERROR = 'Semester must be between 1 and 3'
const MODULE_ERROR = 'Module number must be between 1 and 20'
const EXAM_YEAR_ERROR = 'Exam year must be between 1900 and 2100'
const EXTERNAL_URL_ERROR = 'External URL must be a valid URL'

interface DetailsStepProps {
  form: UseFormReturn<CreatePostFormValues>
  postType: PostType | null
}

function isWholeNumberInRange(value: string, min: number, max: number) {
  const parsedValue = Number(value)
  return value !== '' && Number.isInteger(parsedValue) && parsedValue >= min && parsedValue <= max
}

function validateExternalUrl(value?: string) {
  const trimmedValue = value?.trim()

  if (!trimmedValue) return true
  if (!trimmedValue.startsWith('https://')) return EXTERNAL_URL_ERROR

  try {
    new URL(trimmedValue)
    return true
  } catch {
    return EXTERNAL_URL_ERROR
  }
}

export function DetailsStep({ form, postType }: DetailsStepProps) {
  const requiredMark = <span className="text-amber text-xl leading-none align-middle">*</span>

  return (
    <Form {...form}>
      <div>
        <h2 className="text-[22px] font-semibold text-foreground mb-6">Add details</h2>
        <div className="flex flex-col gap-5">
          <FormField
            control={form.control}
            name="title"
            rules={{
              validate: (value) => value.trim().length >= 3 || TITLE_ERROR,
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                  Title {requiredMark}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="text"
                    placeholder="e.g. Complete Lecture Notes Week 1-6"
                    className="h-[42px] rounded-[6px] border-border bg-card text-sm text-foreground placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-amber"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="description"
            rules={{
              validate: (value) => value.trim().length > 0 || DESCRIPTION_ERROR,
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                  Description {requiredMark}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Describe what you're sharing..."
                    rows={4}
                    className="rounded-[6px] border-border bg-card px-3 py-3 text-sm text-foreground placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-amber resize-none"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="year"
              rules={{
                validate: (value) => isWholeNumberInRange(value, 1, 6) || YEAR_ERROR,
              }}
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                    Year {requiredMark}
                  </FormLabel>
                  <Select
                    value={field.value || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      field.onChange(value === EMPTY_SELECT_VALUE ? '' : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-[42px] rounded-[6px] border-border bg-card text-sm text-foreground focus-visible:ring-2 focus-visible:ring-amber">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>Select...</SelectItem>
                      {[1, 2, 3, 4, 5, 6].map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          Year {y}
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
              name="semester"
              rules={{
                validate: (value) => isWholeNumberInRange(value, 1, 3) || SEMESTER_ERROR,
              }}
              render={({ field }) => (
                <FormItem className="w-full">
                  <FormLabel className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                    Semester {requiredMark}
                  </FormLabel>
                  <Select
                    value={field.value || EMPTY_SELECT_VALUE}
                    onValueChange={(value) =>
                      field.onChange(value === EMPTY_SELECT_VALUE ? '' : value)
                    }
                  >
                    <FormControl>
                      <SelectTrigger className="w-full h-[42px] rounded-[6px] border-border bg-card text-sm text-foreground focus-visible:ring-2 focus-visible:ring-amber">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value={EMPTY_SELECT_VALUE}>Select...</SelectItem>
                      {[1, 2, 3].map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
          <FormField
            control={form.control}
            name="moduleNum"
            rules={{
              validate: (value) =>
                postType == null || isWholeNumberInRange(value, 1, 20) || MODULE_ERROR,
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                  Module Number {requiredMark}
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    type="number"
                    placeholder="e.g. 4"
                    className="h-[42px] rounded-[6px] border-border bg-card text-sm text-foreground placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-amber"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          {postType === 'OLD_QUESTION' && (
            <FormField
              control={form.control}
              name="examYear"
              rules={{
                validate: (value) =>
                  postType !== 'OLD_QUESTION' ||
                  isWholeNumberInRange(value, 1900, 2100) ||
                  EXAM_YEAR_ERROR,
              }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                    Exam Year {requiredMark}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      type="number"
                      placeholder="e.g. 2024"
                      className="h-[42px] rounded-[6px] border-border bg-card text-sm text-foreground placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-amber"
                    />
                  </FormControl>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="externalUrl"
            rules={{
              validate: validateExternalUrl,
            }}
            render={({ field }) => (
              <FormItem>
                <FormLabel className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                  External URL <span className="normal-case text-text-muted">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    type="url"
                    placeholder="https://..."
                    className="h-[42px] rounded-[6px] border-border bg-card text-sm text-foreground placeholder:text-text-muted focus-visible:ring-2 focus-visible:ring-amber"
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </div>
      </div>
    </Form>
  )
}
