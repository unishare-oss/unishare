/**
 * Turns generated multiple-choice questions into the A2UI messages that draw them.
 *
 * The server writes these messages itself rather than asking the model to. The model's job is to
 * produce questions, which `generateQuizQuestions` already validates; what the questions look
 * like is fixed here, so the model cannot draw anything the catalog does not allow and a
 * document cannot steer the layout.
 *
 * The correct answers are NOT in the messages. They travel beside them (see `PracticeQuiz`), so
 * the surface only carries what the student may see and what they have picked.
 */

/** The catalog every message here targets: A2UI's basic catalog, protocol v1.0. */
export const PRACTICE_QUIZ_CATALOG_ID =
  'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json'

export const PRACTICE_QUIZ_SURFACE_ID = 'practice-quiz'

export interface PracticeQuestion {
  content: string
  options: string[]
  correctAnswer: number
  explanation: string
}

export interface PracticeQuizAnswer {
  /** Index into the question's `options`. */
  correct: number
  explanation: string
}

export type A2uiMessage = Record<string, unknown>

export interface PracticeQuiz {
  messages: A2uiMessage[]
  answers: PracticeQuizAnswer[]
}

export function buildPracticeQuiz(questions: PracticeQuestion[]): PracticeQuiz {
  const components: Record<string, unknown>[] = [
    {
      id: 'root',
      component: 'Column',
      children: ['title', ...questions.map((_, i) => `card_${i}`)],
    },
    { id: 'title', component: 'Text', text: 'Practice questions', variant: 'caption' },
  ]

  questions.forEach((question, i) => {
    components.push(
      { id: `card_${i}`, component: 'Card', child: `body_${i}` },
      {
        id: `body_${i}`,
        component: 'Column',
        children: [`question_${i}`, `picker_${i}`, `check_${i}`, `feedback_${i}`],
      },
      { id: `question_${i}`, component: 'Text', text: question.content },
      {
        id: `picker_${i}`,
        component: 'ChoicePicker',
        variant: 'mutuallyExclusive',
        options: question.options.map((label, optionIndex) => ({
          label,
          value: String(optionIndex),
        })),
        value: { '@path': `/q/${i}/selected` },
      },
      {
        id: `check_${i}`,
        component: 'Button',
        child: `check_label_${i}`,
        variant: 'primary',
        action: { event: { name: 'check', context: { index: i } } },
      },
      { id: `check_label_${i}`, component: 'Text', text: 'Check answer' },
      { id: `feedback_${i}`, component: 'Text', text: { '@path': `/q/${i}/feedback` } },
    )
  })

  return {
    messages: [
      {
        version: '1.0',
        createSurface: { surfaceId: PRACTICE_QUIZ_SURFACE_ID, catalogId: PRACTICE_QUIZ_CATALOG_ID },
      },
      {
        version: '1.0',
        updateComponents: { surfaceId: PRACTICE_QUIZ_SURFACE_ID, components },
      },
      {
        version: '1.0',
        updateDataModel: {
          surfaceId: PRACTICE_QUIZ_SURFACE_ID,
          path: '/',
          value: { q: questions.map(() => ({ selected: [], feedback: '' })) },
        },
      },
    ],
    answers: questions.map((q) => ({ correct: q.correctAnswer, explanation: q.explanation })),
  }
}
