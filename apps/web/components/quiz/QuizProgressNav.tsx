'use client'

import { ChevronLeft, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { useQuizGame } from '@/hooks/useQuizGame'

interface QuizProgressNavProps {
  game: ReturnType<typeof useQuizGame>
  isSubmitting: boolean
  onSubmit: () => void
}

export function QuizProgressNav({ game, isSubmitting, onSubmit }: QuizProgressNavProps) {
  return (
    <div className="space-y-4">
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
