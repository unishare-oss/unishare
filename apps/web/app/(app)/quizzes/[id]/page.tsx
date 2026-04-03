'use client'

import { useParams } from 'next/navigation'
import { useQuizzesControllerGetQuiz } from '@/src/lib/api/generated/quizzes/quizzes'
import { QuizGame } from '@/components/quiz/QuizGame'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Outer component — handles loading/error, renders QuizGame only when data is ready
export default function QuizPage() {
  const params = useParams()
  const quizId = params.id as string

  const {
    data: response,
    isLoading,
    error,
  } = useQuizzesControllerGetQuiz(quizId, {
    query: { select: (r) => r.data },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading quiz...</p>
        </div>
      </div>
    )
  }

  if (error || !response) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{(error as Error)?.message || 'Quiz not found'}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return <QuizGame quiz={response} />
}
