'use client'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import type { useQuizGame } from '@/hooks/useQuizGame'

interface QuizProgressPanelProps {
  game: ReturnType<typeof useQuizGame>
  correctAnswers: Record<string, number>
}

export function QuizProgressPanel({ game, correctAnswers }: QuizProgressPanelProps) {
  return (
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
  )
}
