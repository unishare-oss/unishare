'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { useQuizGame } from '@/hooks/useQuizGame'
import { QuizCard } from '@/components/quiz/QuizCard'
import { QuizProgressPanel } from '@/components/quiz/QuizProgressPanel'
import { QuizProgressNav } from '@/components/quiz/QuizProgressNav'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Trash2, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { useQuizzesControllerSubmitQuiz } from '@/src/lib/api/generated/quizzes/quizzes'
import { useAuth } from '@/contexts/auth-context'
import type { QuizEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

export function QuizGame({ quiz }: { quiz: QuizEntity }) {
  const router = useRouter()
  const { session } = useAuth()
  const role = session?.user?.role
  const isAdmin = role === 'ADMIN' || role === 'MODERATOR'

  const game = useQuizGame(quiz)
  const { mutateAsync: submitQuizApi, isPending: isSubmitting } = useQuizzesControllerSubmitQuiz()
  const [isDeleting, setIsDeleting] = useState(false)

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

  async function handleDelete() {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/quizzes/${quiz.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete quiz')
      toast.success('Quiz deleted')
      router.push('/quizzes')
    } catch {
      toast.error('Failed to delete quiz')
      setIsDeleting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20 py-8">
      <div className="container mx-auto max-w-3xl px-4 space-y-6">
        {/* Header */}
        <Card className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl font-bold mb-2">{quiz.title}</h1>
              {quiz.description && <p className="text-muted-foreground">{quiz.description}</p>}
            </div>
            {isAdmin && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="shrink-0 text-muted-foreground hover:text-destructive"
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Trash2 className="size-4" strokeWidth={1.5} />
                    )}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this quiz?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the quiz and all student session history. This
                      cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDelete}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </Card>

        {/* Question Progress */}
        <QuizProgressPanel game={game} correctAnswers={correctAnswers} />

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
        <QuizProgressNav game={game} isSubmitting={isSubmitting} onSubmit={handleSubmit} />
      </div>
    </div>
  )
}
