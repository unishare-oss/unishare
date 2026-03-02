'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { PostType } from './type-step'

const EMPTY_SELECT_VALUE = '__empty__'

interface DetailsStepProps {
  postType: PostType | null
  title: string
  description: string
  year: string
  semester: string
  moduleNum: string
  examYear: string
  externalUrl?: string
  onFieldChange: (
    field: 'title' | 'description' | 'year' | 'semester' | 'moduleNum' | 'examYear' | 'externalUrl',
    value: string,
  ) => void
}

export function DetailsStep({
  postType,
  title,
  description,
  year,
  semester,
  moduleNum,
  examYear,
  externalUrl,
  onFieldChange,
}: DetailsStepProps) {
  const requiredMark = <span className="text-amber text-xl leading-none align-middle">*</span>

  return (
    <div>
      <h2 className="text-[22px] font-semibold text-foreground mb-6">Add details</h2>
      <div className="flex flex-col gap-5">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Title {requiredMark}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onFieldChange('title', e.target.value)}
            placeholder="e.g. Complete Lecture Notes Week 1-6"
            className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Description {requiredMark}
          </label>
          <textarea
            value={description}
            onChange={(e) => onFieldChange('description', e.target.value)}
            placeholder="Describe what you're sharing..."
            rows={4}
            className="w-full px-3 py-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Year {requiredMark}
            </label>
            <Select
              value={year || EMPTY_SELECT_VALUE}
              onValueChange={(value) =>
                onFieldChange('year', value === EMPTY_SELECT_VALUE ? '' : value)
              }
            >
              <SelectTrigger className="w-full h-[42px] bg-card border-border rounded-[6px] text-sm text-foreground focus-visible:ring-2 focus-visible:ring-amber">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Select...</SelectItem>
                {[1, 2, 3, 4, 5, 6].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    Year {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Semester {requiredMark}
            </label>
            <Select
              value={semester || EMPTY_SELECT_VALUE}
              onValueChange={(value) =>
                onFieldChange('semester', value === EMPTY_SELECT_VALUE ? '' : value)
              }
            >
              <SelectTrigger className="w-full h-[42px] bg-card border-border rounded-[6px] text-sm text-foreground focus-visible:ring-2 focus-visible:ring-amber">
                <SelectValue placeholder="Select..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={EMPTY_SELECT_VALUE}>Select...</SelectItem>
                {[1, 2, 3].map((s) => (
                  <SelectItem key={s} value={String(s)}>
                    Semester {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {postType === 'NOTE' && (
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Module Number {requiredMark}
            </label>
            <input
              type="number"
              value={moduleNum}
              onChange={(e) => onFieldChange('moduleNum', e.target.value)}
              placeholder="e.g. 4"
              className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
        )}
        {postType === 'OLD_QUESTION' && (
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Exam Year {requiredMark}
            </label>
            <input
              type="number"
              value={examYear}
              onChange={(e) => onFieldChange('examYear', e.target.value)}
              placeholder="e.g. 2024"
              className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
        )}
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            External URL <span className="normal-case text-text-muted">(optional)</span>
          </label>
          <input
            type="url"
            value={externalUrl ?? ''}
            onChange={(e) => onFieldChange('externalUrl', e.target.value)}
            placeholder="https://..."
            className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>
      </div>
    </div>
  )
}
