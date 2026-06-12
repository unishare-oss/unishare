'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  AlertCircle,
  Trophy,
  Clock,
  Target,
  BookOpen,
  ChevronRight,
  TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'

interface RecentSession {
  id: string
  score: number
  totalPoints: number
  timeSpentSec: number | null
  attemptedAt: string
  completedAt: string | null
  quiz: { id: string; title: string; courseId: string }
}

interface StudentProgress {
  stats: {
    totalAttempts: number
    averageScore: number
    bestScore: number
  }
  recentSessions: RecentSession[]
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

function StatCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
}) {
  return (
    <Card className="card-pop">
      <CardContent className="pt-6 pb-5 text-center space-y-2">
        <div className="flex justify-center text-primary">{icon}</div>
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function SessionRowSkeleton() {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border">
      <Skeleton className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-3 w-32" />
      </div>
      <Skeleton className="h-6 w-12" />
    </div>
  )
}

export default function QuizHistoryPage() {
  const { user, isLoading: authLoading } = useAuth()
  const [progress, setProgress] = useState<StudentProgress | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading || !user) return
    async function load() {
      try {
        const res = await fetch(`/api/quizzes/student/${user!.id}/progress`)
        if (!res.ok) throw new Error('Failed to load history')
        const body = await res.json()
        setProgress(body.data ?? body)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user, authLoading])

  const isReady = !authLoading && !loading

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-8">
      <PageHeader
        title="Quiz History"
        subtitle="Review your past quiz attempts and track your progress"
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {!isReady ? (
          <>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </>
        ) : progress ? (
          <>
            <StatCard
              icon={<BookOpen className="w-5 h-5" />}
              label="Total Attempts"
              value={String(progress.stats.totalAttempts)}
            />
            <StatCard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Avg Score"
              value={`${Math.round(progress.stats.averageScore)}%`}
            />
            <StatCard
              icon={<Trophy className="w-5 h-5" />}
              label="Best Score"
              value={`${Math.round(progress.stats.bestScore)}%`}
            />
          </>
        ) : null}
      </div>

      {/* Session list */}
      <Card className="card-pop">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Attempts</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!isReady && Array.from({ length: 5 }).map((_, i) => <SessionRowSkeleton key={i} />)}

          {isReady && progress?.recentSessions.length === 0 && (
            <div className="py-12 text-center space-y-3">
              <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
              <p className="text-muted-foreground font-medium">No attempts yet</p>
              <p className="text-sm text-muted-foreground/60">
                Complete a quiz to see your results here
              </p>
            </div>
          )}

          {isReady &&
            progress?.recentSessions.map((session) => {
              const pct = session.totalPoints
                ? Math.round((session.score / session.totalPoints) * 100)
                : 0
              const { grade, className: gradeClass } = gradeFromPercent(pct)
              const isIncomplete = !session.completedAt

              return (
                <Link
                  key={session.id}
                  href={`/quizzes/sessions/${session.id}`}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border transition-colors group',
                    'hover:bg-accent hover:border-primary/20',
                    isIncomplete && 'opacity-60',
                  )}
                >
                  {/* Grade badge */}
                  <div
                    className={cn(
                      'w-10 h-10 rounded-full border-2 flex items-center justify-center text-sm font-black shrink-0',
                      gradeClass,
                    )}
                  >
                    {isIncomplete ? '–' : grade}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="font-medium text-sm truncate">{session.quiz.title}</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Target className="w-3 h-3" />
                        {isIncomplete ? 'Incomplete' : `${session.score}/${session.totalPoints}`}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(session.timeSpentSec)}
                      </span>
                      <span>
                        {formatDistanceToNow(new Date(session.attemptedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Score pill */}
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
            })}
        </CardContent>
      </Card>

      {isReady && progress && progress.recentSessions.length > 0 && (
        <div className="text-center">
          <Button asChild variant="outline">
            <Link href="/quizzes">Browse More Quizzes</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
