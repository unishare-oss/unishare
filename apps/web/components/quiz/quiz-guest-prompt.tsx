'use client'

import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { signInWithUniauth } from '@/src/lib/auth/uniauth'
import type { QuizEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

/** A guest sees what the quiz is but can't take it: submitting needs an account. */
export function QuizGuestPrompt({ quiz }: { quiz: QuizEntity }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6">
      <Card className="flex flex-col gap-3 p-6">
        <h1 className="text-xl font-semibold text-foreground">{quiz.title}</h1>
        {quiz.description && <p className="text-sm text-text-muted">{quiz.description}</p>}
        <p className="font-mono text-xs text-text-muted">{quiz.questionsCount} questions</p>
        <Button
          className="self-start"
          onClick={() =>
            signInWithUniauth({ returnTo: window.location.href }).catch(() =>
              toast.error('Could not start sign-in. Please try again.'),
            )
          }
        >
          Sign in to take this quiz
        </Button>
      </Card>
    </div>
  )
}
