'use client'

import { ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import type { useQuizGame } from '@/hooks/useQuizGame'

interface QuizProgressNavProps {
  game: ReturnType<typeof useQuizGame>
  correctAnswers: Record<string, number>
  isSubmitting: boolean
  onSubmit: () => void
}

export function QuizProgressNav({
  game,
  correctAnswers,
  isSubmitting,
  onSubmit,
}: QuizProgressNavProps) {
  return (
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
          <Button onClick={onSubmit} disabled={isSubmitting} className="ml-auto" size="lg">
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
            You have {game.answers.filter((a) => a.answerIndex === null).length} unanswered question
            {game.answers.filter((a) => a.answerIndex === null).length !== 1 ? 's' : ''}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
