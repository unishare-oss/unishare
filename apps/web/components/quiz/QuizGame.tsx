'use client'

import { useRouter } from 'next/navigation'
import { useQuizGame } from '@/hooks/useQuizGame'
import { QuizCard } from '@/components/quiz/QuizCard'
import { QuizProgressNav } from '@/components/quiz/QuizProgressNav'
import { Card } from '@/components/ui/card'
import { toast } from 'sonner'
import { useQuizzesControllerSubmitQuiz } from '@/src/lib/api/generated/quizzes/quizzes'
import type { QuizEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

export function QuizGame({ quiz }: { quiz: QuizEntity }) {
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
        <QuizProgressNav
          game={game}
          correctAnswers={correctAnswers}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </div>
    </div>
  )
}
