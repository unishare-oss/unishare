'use client'

import { A2uiSurfaces, type A2uiAction, type A2uiDataModel } from '@/components/a2ui/a2ui-surfaces'
import { checkPracticeAnswer } from '@/lib/practice-quiz/check-answer'
import type { PracticeQuiz as PracticeQuizData } from '@/hooks/use-practice-quiz'

/**
 * Draws a practice quiz and marks it.
 *
 * The questions arrive as an A2UI surface; the correct answers arrive beside it and never enter
 * the surface. When a student presses "Check answer" the surface raises a `check` action with the
 * question's index, and this component reads the pick from the surface's data model and writes the
 * feedback back to it. Marking happens in the browser, which is fine for self-study: nothing is
 * graded or saved.
 */
export function PracticeQuiz({ quiz }: { quiz: PracticeQuizData }) {
  function handleAction(action: A2uiAction, dataModel: A2uiDataModel) {
    if (action.name !== 'check') return
    const index = Number(action.context.index)
    const answer = quiz.answers[index]
    if (!Number.isInteger(index) || !answer) return

    dataModel.set(
      `/q/${index}/feedback`,
      checkPracticeAnswer(dataModel.get(`/q/${index}/selected`), answer),
    )
  }

  return <A2uiSurfaces messages={quiz.messages} onAction={handleAction} />
}
