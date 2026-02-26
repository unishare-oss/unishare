'use client'

import type { PostType } from '@/lib/mock-data'

interface DetailsStepProps {
  postType: PostType | null
  title: string
  description: string
  year: string
  semester: string
  moduleNum: string
  examYear: string
  externalUrl: string
  onTitleChange: (v: string) => void
  onDescriptionChange: (v: string) => void
  onYearChange: (v: string) => void
  onSemesterChange: (v: string) => void
  onModuleNumChange: (v: string) => void
  onExamYearChange: (v: string) => void
  onExternalUrlChange: (v: string) => void
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
  onTitleChange,
  onDescriptionChange,
  onYearChange,
  onSemesterChange,
  onModuleNumChange,
  onExamYearChange,
  onExternalUrlChange,
}: DetailsStepProps) {
  return (
    <div>
      <h2 className="text-[22px] font-semibold text-foreground mb-6">Add details</h2>
      <div className="flex flex-col gap-5">
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Title
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. Complete Lecture Notes Week 1-6"
            className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>
        <div>
          <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Describe what you're sharing..."
            rows={4}
            className="w-full px-3 py-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber resize-none"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Year
            </label>
            <select
              value={year}
              onChange={(e) => onYearChange(e.target.value)}
              className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber"
            >
              <option value="">Select...</option>
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <option key={y} value={y}>
                  Year {y}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Semester
            </label>
            <select
              value={semester}
              onChange={(e) => onSemesterChange(e.target.value)}
              className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber"
            >
              <option value="">Select...</option>
              {[1, 2, 3].map((s) => (
                <option key={s} value={s}>
                  Semester {s}
                </option>
              ))}
            </select>
          </div>
        </div>
        {postType === 'NOTE' && (
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Module Number
            </label>
            <input
              type="number"
              value={moduleNum}
              onChange={(e) => onModuleNumChange(e.target.value)}
              placeholder="e.g. 4"
              className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
            />
          </div>
        )}
        {postType === 'PAST EXAM' && (
          <div>
            <label className="font-mono text-[11px] uppercase tracking-wider text-text-muted block mb-1.5">
              Exam Year
            </label>
            <input
              type="number"
              value={examYear}
              onChange={(e) => onExamYearChange(e.target.value)}
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
            value={externalUrl}
            onChange={(e) => onExternalUrlChange(e.target.value)}
            placeholder="https://..."
            className="w-full h-[42px] px-3 bg-card border border-border rounded-[6px] text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber"
          />
        </div>
      </div>
    </div>
  )
}
