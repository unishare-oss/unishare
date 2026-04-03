'use client'

import { useParams, useRouter } from 'next/navigation'
import {
  useQuizzesControllerGetQuiz,
  useQuizzesControllerSubmitQuiz,
} from '@/src/lib/api/generated/quizzes/quizzes'
import { useQuizGame } from '@/hooks/useQuizGame'
import { QuizCard } from '@/components/quiz/QuizCard'
import { ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import type { QuizEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

// Inner component — always has quiz, so hooks are never conditional
function QuizGame({ quiz }: { quiz: QuizEntity }) {
  const router = useRouter()
  const game = useQuizGame(quiz)
  const { mutateAsync: submitQuizApi, isPending: isSubmitting } = useQuizzesControllerSubmitQuiz()

  const correctAnswers: { [key: string]: number } = {}
  quiz.questions.forEach((q) => {
    if (q.correctAnswer !== undefined) correctAnswers[q.id] = q.correctAnswer
  })

  async function handleSubmit() {
    try {
      const result = await submitQuizApi({
        id: quiz.id,
        data: {
          answers: game.answers,
          timeSpentSec: Math.round((Date.now() - game.startTime) / 1000),
        } as Parameters<typeof submitQuizApi>[0]['data'],
      })
      router.push(`/quizzes/sessions/${result.data.sessionId}`)
    } catch {
      toast.error('Failed to submit quiz. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto max-w-3xl px-4 space-y-6">
        {/* Header */}
        <Card className="p-6">
          <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
          {quiz.description && <p className="text-muted-foreground">{quiz.description}</p>}
        </Card>

        {/* Main Quiz Content */}
        <Card className="p-8">
          <QuizCard
            question={game.currentQuestion}
            questionNumber={game.currentQuestionIndex + 1}
            totalQuestions={game.totalQuestions}
            selectedAnswer={game.currentAnswer.answerIndex}
            onSelectAnswer={game.selectAnswer}
            showFeedback={game.showFeedback}
            isSubmitted={game.isSubmitted}
          />
        </Card>

        {/* Navigation & Controls */}
        <div className="space-y-4">
          {/* Question Progress */}
          <Card className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Question {game.currentQuestionIndex + 1} of {game.totalQuestions}
              </span>
              <span className="text-sm font-medium text-primary">{game.progress}%</span>
            </div>
            <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
              {Array.from({ length: game.totalQuestions }).map((_, idx) => {
                const answer = game.answers[idx]
                const isAnswered = answer.answerIndex !== null
                const isCorrect = answer.answerIndex === correctAnswers[answer.questionId]
                return (
                  <Button
                    key={idx}
                    onClick={() => game.jumpToQuestion(idx)}
                    variant={
                      idx === game.currentQuestionIndex
                        ? 'default'
                        : isAnswered
                          ? isCorrect
                            ? 'outline'
                            : 'destructive'
                          : 'ghost'
                    }
                    size="sm"
                    className={`aspect-square h-auto p-0 font-semibold ${
                      idx === game.currentQuestionIndex ? 'ring-2 ring-offset-2' : ''
                    } ${
                      isAnswered && !isCorrect && idx !== game.currentQuestionIndex
                        ? 'bg-destructive/10 text-destructive hover:bg-destructive/20'
                        : ''
                    }`}
                  >
                    {idx + 1}
                  </Button>
                )
              })}
            </div>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex gap-4">
            <Button
              onClick={game.goPrevious}
              disabled={game.currentQuestionIndex === 0}
              variant="outline"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            {game.currentQuestionIndex < game.totalQuestions - 1 ? (
              <Button onClick={game.goNext} className="ml-auto">
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting} className="ml-auto" size="lg">
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Submit Quiz
              </Button>
            )}
          </div>

          {/* Unanswered Warning */}
          {game.answers.some((a) => a.answerIndex === null) && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                You have {game.answers.filter((a) => a.answerIndex === null).length} unanswered
                question{game.answers.filter((a) => a.answerIndex === null).length !== 1 ? 's' : ''}
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  )
}

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
