/** What the server sends beside a practice quiz's surface for one question. */
export interface PracticeQuizAnswer {
  /** Index of the correct option. */
  correct: number
  /** Text of the correct option. */
  correctLabel: string
  explanation: string
}

/**
 * The feedback a student sees after pressing "Check answer".
 *
 * `selected` is whatever the choice picker holds. It is read from a data model the surface can
 * write to, so it is narrowed here rather than trusted: only a one-element list of option
 * numbers counts as a pick.
 */
export function checkPracticeAnswer(selected: unknown, answer: PracticeQuizAnswer): string {
  const picked = Array.isArray(selected) && selected.length === 1 ? Number(selected[0]) : NaN
  if (!Number.isInteger(picked)) return 'Pick an answer first.'

  const explanation = answer.explanation.trim()
  if (picked === answer.correct) {
    return explanation ? `Correct. ${explanation}` : 'Correct.'
  }
  const reveal = `Not quite. The answer is ${answer.correctLabel}.`
  return explanation ? `${reveal} ${explanation}` : reveal
}
