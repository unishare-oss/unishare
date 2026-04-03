'use client'

import { useParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { QuizResults } from '@/components/quiz/QuizResults'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Quiz } from '@/hooks/useQuizGame'

interface QuestionAttempt {
  questionId: string
  studentAnswer: number | null
  isCorrect: boolean | null
}

interface QuizSessionResponse {
  id: string
  score: number
  totalPoints: number
  timeSpentSec: number | null
  completedAt: string | null
  quiz: Quiz
  questionAttempts: QuestionAttempt[]
}

export default function SessionResultsPage() {
  const params = useParams()
  const sessionId = params.sessionId as string

  const [session, setSession] = useState<QuizSessionResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch(`/api/quizzes/sessions/${sessionId}`)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body?.message || 'Failed to load session')
        }
        const body = await res.json()
        setSession(body.data ?? body)
      } catch (err) {
        setError((err as Error).message)
      } finally {
        setLoading(false)
      }
    }
    fetchSession()
  }, [sessionId])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </div>
    )
  }

  if (error || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || 'Session not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const answers = session.questionAttempts.map((a) => ({
    questionId: a.questionId,
    answerIndex: a.studentAnswer ?? null,
  }))

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto px-4">
        <QuizResults
          quiz={session.quiz}
          score={session.score}
          totalPoints={session.totalPoints}
          timeTaken={session.timeSpentSec ?? 0}
          answers={answers}
        />
      </div>
    </div>
  )
}
