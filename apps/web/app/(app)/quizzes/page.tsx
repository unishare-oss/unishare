'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertCircle,
  Trophy,
  Clock,
  Target,
  BookOpen,
  ChevronRight,
  TrendingUp,
  HelpCircle,
  Play,
  X,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'

// ─── Types ──────────────────────────────────────────────────────────────────

interface QuizListItem {
  id: string
  title: string
  description: string | null
  courseId: string
  course: { code: string; name: string }
  questionsCount: number
  createdAt: string
}

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
  stats: { totalAttempts: number; averageScore: number; bestScore: number }
  recentSessions: RecentSession[]
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Sub-components ───────────────────────────────────────────────────────────

function QuizCard({ quiz }: { quiz: QuizListItem }) {
  return (
    <Link
      href={`/quizzes/${quiz.id}`}
      className="flex items-start gap-4 p-4 rounded-xl border transition-colors group hover:bg-accent hover:border-primary/20"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <HelpCircle className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium text-sm leading-snug">{quiz.title}</p>
        {quiz.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          {quiz.course?.code && (
            <Badge variant="outline" className="text-xs font-mono font-normal">
              {quiz.course.code}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs font-normal">
            {quiz.questionsCount} questions
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(quiz.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
      <div className="shrink-0 flex items-center mt-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Play className="w-3 h-3" />
          Start
        </span>
      </div>
    </Link>
  )
}

function HistoryRow({ session }: { session: RecentSession }) {
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

function CardSkeleton() {
  return <Skeleton className="h-20 rounded-xl" />
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function QuizzesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [departmentId, setDepartmentId] = useState<string>('')
  const [courseId, setCourseId] = useState<string>('')
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([])
  const [progress, setProgress] = useState<StudentProgress | null>(null)
  const [quizzesLoading, setQuizzesLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { data: departments } = useDepartmentsControllerFindAll({
    query: { select: (r) => r.data, staleTime: 1000 * 60 * 5 },
  })

  const { data: coursesData } = useCoursesControllerFindAll(
    { departmentId: departmentId || undefined, limit: 100 },
    { query: { select: (r) => r.data, enabled: !!departmentId, staleTime: 1000 * 60 * 5 } },
  )
  const courses = coursesData?.items ?? []

  // Reset course when department changes
  useEffect(() => {
    setCourseId('')
  }, [departmentId])

  // Fetch quizzes whenever filters change
  useEffect(() => {
    setQuizzesLoading(true)
    const params = new URLSearchParams()
    if (courseId) params.set('courseId', courseId)
    else if (departmentId) params.set('departmentId', departmentId)

    fetch(`/api/quizzes?${params}`)
      .then((r) => r.json())
      .then((b) => setQuizzes((b.data ?? b).items ?? []))
      .catch(() => setError('Failed to load quizzes'))
      .finally(() => setQuizzesLoading(false))
  }, [courseId, departmentId])

  useEffect(() => {
    if (authLoading || !user) {
      if (!authLoading) setHistoryLoading(false)
      return
    }
    fetch(`/api/quizzes/student/${user.id}/progress`)
      .then((r) => r.json())
      .then((b) => setProgress(b.data ?? b))
      .catch(() => {})
      .finally(() => setHistoryLoading(false))
  }, [user, authLoading])

  const stats = progress?.stats
  const hasFilters = !!departmentId || !!courseId

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      <PageHeader title="Quizzes" subtitle="Practice for your exams with AI-generated questions" />

      {/* Stats */}
      {isAuthenticated && !historyLoading && stats && stats.totalAttempts > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4 text-center space-y-1">
              <BookOpen className="w-4 h-4 text-primary mx-auto" />
              <p className="text-xl font-bold">{stats.totalAttempts}</p>
              <p className="text-xs text-muted-foreground">Attempts</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center space-y-1">
              <TrendingUp className="w-4 h-4 text-primary mx-auto" />
              <p className="text-xl font-bold">{Math.round(stats.averageScore)}%</p>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-4 text-center space-y-1">
              <Trophy className="w-4 h-4 text-primary mx-auto" />
              <p className="text-xl font-bold">{Math.round(stats.bestScore)}%</p>
              <p className="text-xs text-muted-foreground">Best Score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="browse">
        <TabsList className="w-full bg-muted/50">
          <TabsTrigger
            value="browse"
            className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
          >
            Browse
          </TabsTrigger>
          {isAuthenticated && (
            <TabsTrigger
              value="history"
              className="flex-1 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none"
            >
              My History
            </TabsTrigger>
          )}
        </TabsList>

        {/* Browse tab */}
        <TabsContent value="browse" className="mt-4 space-y-3">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="All departments" />
              </SelectTrigger>
              <SelectContent>
                {(departments ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={courseId} onValueChange={setCourseId} disabled={!departmentId}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder={departmentId ? 'All courses' : 'Select dept first'} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setDepartmentId('')
                  setCourseId('')
                }}
                className="shrink-0"
                title="Clear filters"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center justify-between">
                Available Quizzes
                {hasFilters && (
                  <span className="text-xs font-normal text-muted-foreground">
                    {quizzes.length} result{quizzes.length !== 1 ? 's' : ''}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quizzesLoading && Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}

              {!quizzesLoading && quizzes.length === 0 && (
                <div className="py-12 text-center space-y-3">
                  <HelpCircle className="w-10 h-10 mx-auto text-muted-foreground/40" />
                  <p className="text-muted-foreground font-medium">
                    {hasFilters ? 'No quizzes match your filters' : 'No quizzes available yet'}
                  </p>
                  {hasFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setDepartmentId('')
                        setCourseId('')
                      }}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              )}

              {!quizzesLoading && quizzes.map((quiz) => <QuizCard key={quiz.id} quiz={quiz} />)}
            </CardContent>
          </Card>
        </TabsContent>

        {/* History tab */}
        {isAuthenticated && (
          <TabsContent value="history" className="mt-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Past Attempts</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {historyLoading &&
                  Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}

                {!historyLoading && (!progress || progress.recentSessions.length === 0) && (
                  <div className="py-12 text-center space-y-3">
                    <BookOpen className="w-10 h-10 mx-auto text-muted-foreground/40" />
                    <p className="text-muted-foreground font-medium">No attempts yet</p>
                    <p className="text-sm text-muted-foreground/60">
                      Complete a quiz to see your results here
                    </p>
                  </div>
                )}

                {!historyLoading &&
                  progress?.recentSessions.map((s) => <HistoryRow key={s.id} session={s} />)}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
