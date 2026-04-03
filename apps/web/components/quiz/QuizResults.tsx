import { Quiz } from '@/hooks/useQuizGame'
import { CheckCircle2, XCircle, Clock, Trophy, RotateCcw, Home, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface QuizResultsProps {
  quiz: Quiz
  score: number
  totalPoints: number
  timeTaken: number
  answers: { questionId: string; answerIndex: number | null }[]
}

interface GradeConfig {
  grade: string
  label: string
  ringClass: string
  textClass: string
  bgClass: string
}

function getGrade(percent: number): GradeConfig {
  if (percent >= 90)
    return {
      grade: 'A',
      label: 'Excellent!',
      ringClass: 'ring-emerald-500/30',
      textClass: 'text-emerald-600 dark:text-emerald-400',
      bgClass: 'bg-emerald-500/10',
    }
  if (percent >= 80)
    return {
      grade: 'B',
      label: 'Great job!',
      ringClass: 'ring-blue-500/30',
      textClass: 'text-blue-600 dark:text-blue-400',
      bgClass: 'bg-blue-500/10',
    }
  if (percent >= 70)
    return {
      grade: 'C',
      label: 'Good effort',
      ringClass: 'ring-amber-500/30',
      textClass: 'text-amber-600 dark:text-amber-400',
      bgClass: 'bg-amber-500/10',
    }
  if (percent >= 60)
    return {
      grade: 'D',
      label: 'Keep practicing',
      ringClass: 'ring-orange-500/30',
      textClass: 'text-orange-600 dark:text-orange-400',
      bgClass: 'bg-orange-500/10',
    }
  return {
    grade: 'F',
    label: 'Keep studying',
    ringClass: 'ring-rose-500/30',
    textClass: 'text-rose-600 dark:text-rose-400',
    bgClass: 'bg-rose-500/10',
  }
}

export function QuizResults({ quiz, score, totalPoints, timeTaken, answers }: QuizResultsProps) {
  const percentage = Math.round((score / totalPoints) * 100)
  const minutes = Math.floor(timeTaken / 60)
  const seconds = timeTaken % 60
  const { grade, label, ringClass, textClass, bgClass } = getGrade(percentage)
  const skipped = answers.filter((a) => a.answerIndex === null).length

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      {/* Score Hero */}
      <Card>
        <CardContent className="pt-8 pb-6 text-center space-y-6">
          {/* Grade ring */}
          <div className="flex justify-center">
            <div
              className={cn(
                'w-28 h-28 rounded-full ring-8 flex flex-col items-center justify-center',
                bgClass,
                ringClass,
              )}
            >
              <span className={cn('text-5xl font-black leading-none', textClass)}>{grade}</span>
              <span className="text-sm font-semibold text-muted-foreground mt-0.5">
                {percentage}%
              </span>
            </div>
          </div>

          <div>
            <h1 className="text-2xl font-bold">{label}</h1>
            <p className="text-muted-foreground text-sm mt-1">{quiz.title}</p>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
              <Trophy className="w-4 h-4 text-emerald-500 mx-auto" />
              <p className="text-2xl font-bold">{score}</p>
              <p className="text-xs text-muted-foreground">Correct</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
              <XCircle className="w-4 h-4 text-rose-500 mx-auto" />
              <p className="text-2xl font-bold">{totalPoints - score - skipped}</p>
              <p className="text-xs text-muted-foreground">Wrong</p>
            </div>
            <div className="rounded-xl bg-muted/50 p-3 space-y-1">
              <Clock className="w-4 h-4 text-primary mx-auto" />
              <p className="text-2xl font-bold">
                {minutes > 0 ? `${minutes}m` : ''}
                {seconds}s
              </p>
              <p className="text-xs text-muted-foreground">Time</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Review */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Question Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {quiz.questions.map((question, idx) => {
            const answer = answers[idx]
            const isSkipped = answer.answerIndex === null
            const isCorrect = !isSkipped && answer.answerIndex === question.correctAnswer
            const isWrong = !isSkipped && !isCorrect

            return (
              <div
                key={question.id}
                className={cn(
                  'rounded-xl border p-4 space-y-3',
                  isCorrect && 'border-emerald-500/20 bg-emerald-500/5',
                  isWrong && 'border-rose-500/20 bg-rose-500/5',
                  isSkipped && 'border-border bg-muted/30',
                )}
              >
                {/* Question line */}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                    {isWrong && <XCircle className="w-4 h-4 text-rose-500" />}
                    {isSkipped && <Minus className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <p className="text-sm font-medium leading-snug flex-1">
                    <span className="text-muted-foreground mr-1">Q{idx + 1}.</span>
                    {question.content}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 text-xs capitalize ml-2',
                      isCorrect && 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400',
                      isWrong && 'border-rose-500/30 text-rose-600 dark:text-rose-400',
                      isSkipped && 'border-border text-muted-foreground',
                    )}
                  >
                    {isCorrect ? 'Correct' : isWrong ? 'Wrong' : 'Skipped'}
                  </Badge>
                </div>

                {/* Answer details */}
                {(isWrong || isSkipped) && (
                  <div className="ml-7 space-y-1 text-xs">
                    {isWrong && answer.answerIndex !== null && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-muted-foreground w-20 shrink-0">Your answer:</span>
                        <span className="text-rose-600 dark:text-rose-400 font-medium line-through">
                          {question.options[answer.answerIndex]}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <span className="text-muted-foreground w-20 shrink-0">Correct:</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        {question.options[question.correctAnswer]}
                      </span>
                    </div>
                    {question.explanation && (
                      <div className="pt-1 text-muted-foreground italic border-t border-border/50">
                        {question.explanation}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 pb-8">
        <Button asChild variant="default" className="flex-1" size="lg">
          <Link href={`/quizzes/${quiz.id}`}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Try Again
          </Link>
        </Button>
        <Button asChild variant="outline" className="flex-1" size="lg">
          <Link href="/">
            <Home className="w-4 h-4 mr-2" />
            Home
          </Link>
        </Button>
      </div>
    </div>
  )
}
