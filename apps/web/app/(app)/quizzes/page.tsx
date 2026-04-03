'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { PageHeader } from '@/components/shared/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { AlertCircle, BookOpen, HelpCircle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useDepartmentsControllerFindAll } from '@/src/lib/api/generated/departments/departments'
import { useCoursesControllerFindAll } from '@/src/lib/api/generated/courses/courses'
import {
  useQuizzesControllerListQuizzes,
  useQuizzesControllerGetStudentProgress,
} from '@/src/lib/api/generated/quizzes/quizzes'
import { QuizBrowseCard } from '@/components/quiz/QuizBrowseCard'
import { QuizHistoryRow, type RecentSession } from '@/components/quiz/QuizHistoryRow'
import { QuizStatsRow } from '@/components/quiz/QuizStatsRow'
import { QuizBrowseFilters } from '@/components/quiz/QuizBrowseFilters'

// Typed selector — defined outside component so TypeScript resolves TData correctly
type ProgressData = {
  stats: { totalAttempts: number; averageScore: number; bestScore: number }
  recentSessions: RecentSession[]
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function selectProgress(r: any): ProgressData {
  return r.data
}

function CardSkeleton() {
  return <Skeleton className="h-20 rounded-xl" />
}

export default function QuizzesPage() {
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [departmentId, setDepartmentId] = useState<string>('')
  const [courseId, setCourseId] = useState<string>('')

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

  const {
    data: quizzesData,
    isLoading: quizzesLoading,
    error: quizzesError,
  } = useQuizzesControllerListQuizzes(
    {
      courseId: courseId || undefined,
      departmentId: courseId ? undefined : departmentId || undefined,
    },
    { query: { select: (r) => r.data } },
  )
  const quizzes = quizzesData?.items ?? []

  const { data: progress, isLoading: historyLoading } =
    useQuizzesControllerGetStudentProgress<ProgressData>(user?.id ?? '', {
      query: { select: selectProgress, enabled: !!user && !authLoading },
    })

  const stats = progress?.stats
  let statsToShow: { totalAttempts: number; averageScore: number; bestScore: number } | null = null
  if (isAuthenticated && !historyLoading && stats && stats.totalAttempts > 0) {
    statsToShow = stats
  }
  const hasFilters = !!departmentId || !!courseId

  return (
    <div className="container max-w-3xl mx-auto py-8 px-4 space-y-6">
      <PageHeader title="Quizzes" subtitle="Practice for your exams with AI-generated questions" />

      {/* Stats */}
      {statsToShow ? <QuizStatsRow stats={statsToShow} /> : null}

      {!!quizzesError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Failed to load quizzes</AlertDescription>
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
          <QuizBrowseFilters
            departmentId={departmentId}
            courseId={courseId}
            departments={departments ?? []}
            courses={courses}
            onDepartmentChange={setDepartmentId}
            onCourseChange={setCourseId}
            onClear={() => {
              setDepartmentId('')
              setCourseId('')
            }}
          />

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

              {!quizzesLoading &&
                quizzes.map((quiz) => <QuizBrowseCard key={quiz.id} quiz={quiz} />)}
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
                  progress?.recentSessions.map((s) => <QuizHistoryRow key={s.id} session={s} />)}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
