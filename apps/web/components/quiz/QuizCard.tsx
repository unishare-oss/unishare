import { Question } from '@/hooks/useQuizGame'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface QuizCardProps {
  question: Question
  questionNumber: number
  totalQuestions: number
  selectedAnswer: number | null
  onSelectAnswer: (index: number) => void
  showFeedback: boolean
  isSubmitted: boolean
}

const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']

const difficultyConfig = {
  easy: {
    label: 'Easy',
    className: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
  },
  medium: {
    label: 'Medium',
    className: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
  },
  hard: {
    label: 'Hard',
    className: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
  },
}

export function QuizCard({
  question,
  questionNumber,
  totalQuestions,
  selectedAnswer,
  onSelectAnswer,
  showFeedback,
  isSubmitted,
}: QuizCardProps) {
  const isLocked = showFeedback || isSubmitted
  const diff =
    difficultyConfig[question.difficulty as keyof typeof difficultyConfig] ??
    difficultyConfig.medium

  return (
    <div className="w-full space-y-6">
      {/* Progress bar */}
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="bg-primary h-1.5 transition-all duration-500"
          style={{ width: `${(questionNumber / totalQuestions) * 100}%` }}
        />
      </div>

      {/* Question header */}
      <div className="flex items-start justify-between gap-4">
        <p className="text-base font-medium text-muted-foreground">
          Question {questionNumber} / {totalQuestions}
        </p>
        <Badge variant="outline" className={cn('shrink-0 font-medium capitalize', diff.className)}>
          {diff.label}
        </Badge>
      </div>

      {/* Question text */}
      <p className="text-xl font-semibold leading-relaxed">{question.content}</p>

      {/* Options */}
      <div className="space-y-3">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrect = index === question.correctAnswer
          const showCorrect = showFeedback && isCorrect
          const showWrong = showFeedback && isSelected && !isCorrect

          return (
            <button
              key={index}
              onClick={() => onSelectAnswer(index)}
              disabled={isLocked}
              className={cn(
                'w-full p-4 text-left rounded-xl transition-all border-2 group',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                // default idle state
                !showFeedback &&
                  !isSelected &&
                  'border-border bg-card hover:border-primary/50 hover:bg-accent',
                // selected but no feedback yet
                !showFeedback && isSelected && 'border-primary bg-primary/5',
                // correct answer revealed
                showCorrect && 'border-emerald-500/50 bg-emerald-500/10',
                // wrong answer selected
                showWrong && 'border-rose-500/50 bg-rose-500/10',
                // other options when feedback shown
                showFeedback &&
                  !isCorrect &&
                  !isSelected &&
                  'border-border/40 bg-muted/30 opacity-60',
                isLocked && 'cursor-default',
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-7 h-7 rounded-full border-2 flex items-center justify-center text-sm font-bold shrink-0 transition-colors',
                    !showFeedback &&
                      !isSelected &&
                      'border-muted-foreground/30 text-muted-foreground group-hover:border-primary group-hover:text-primary',
                    !showFeedback &&
                      isSelected &&
                      'border-primary bg-primary text-primary-foreground',
                    showCorrect && 'border-emerald-500 bg-emerald-500 text-white',
                    showWrong && 'border-rose-500 bg-rose-500 text-white',
                    showFeedback &&
                      !isCorrect &&
                      !isSelected &&
                      'border-muted-foreground/20 text-muted-foreground/40',
                  )}
                >
                  {OPTION_LABELS[index]}
                </div>
                <span
                  className={cn(
                    'font-medium flex-1',
                    showFeedback && !isCorrect && !isSelected && 'text-muted-foreground/60',
                  )}
                >
                  {option}
                </span>
                {showCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                {showWrong && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}
              </div>
            </button>
          )
        })}
      </div>

      {/* Explanation */}
      {showFeedback && question.explanation && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 space-y-1">
          <p className="text-sm font-semibold text-primary">Explanation</p>
          <p className="text-sm text-muted-foreground">{question.explanation}</p>
        </div>
      )}
    </div>
  )
}
