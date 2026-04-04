'use client'

import Link from 'next/link'
import { Clock, Target, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@/lib/utils'

export interface RecentSession {
  id: string
  score: number
  totalPoints: number
  timeSpentSec: number | null
  attemptedAt: string
  completedAt: string | null
  quiz: { id: string; title: string; courseId: string }
}

function gradeFromPercent(pct: number) {
  if (pct >= 90)
    return {
      grade: 'A',
      className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
    }
  if (pct >= 80)
    return {
      grade: 'B',
      className: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
    }
  if (pct >= 70)
    return {
      grade: 'C',
      className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
    }
  if (pct >= 60)
    return {
      grade: 'D',
      className: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
    }
  return {
    grade: 'F',
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  }
}

function formatTime(sec: number | null) {
  if (!sec) return '—'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

export function QuizHistoryRow({ session }: { session: RecentSession }) {
  const pct = session.totalPoints ? Math.round((session.score / session.totalPoints) * 100) : 0
  const { grade, className: gradeClass } = gradeFromPercent(pct)
  const isIncomplete = !session.completedAt

  return (
    <Link
      href={`/quizzes/sessions/${session.id}`}
      className={cn(
        'flex items-center gap-4 p-4 rounded-xl border transition-colors group hover:bg-accent hover:border-primary/20',
        isIncomplete && 'opacity-60',
      )}
    >
      <div
        className={cn(
          'w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-black shrink-0',
          gradeClass,
        )}
      >
        {isIncomplete ? '–' : grade}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-medium text-sm truncate">{session.quiz.title}</p>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Target className="w-3 h-3" />
            {isIncomplete ? 'Incomplete' : `${session.score}/${session.totalPoints}`}
          </span>
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatTime(session.timeSpentSec)}
          </span>
          <span>{formatDistanceToNow(new Date(session.attemptedAt), { addSuffix: true })}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {!isIncomplete && (
          <Badge variant="outline" className={cn('font-semibold', gradeClass)}>
            {pct}%
          </Badge>
        )}
        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
      </div>
    </Link>
  )
}
