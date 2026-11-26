import { describe, expect, it } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PracticeQuiz } from '@/components/post-detail/practice-quiz'
import type { PracticeQuiz as PracticeQuizData } from '@/hooks/use-practice-quiz'

const CATALOG = 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json'

/** The shape `buildPracticeQuiz` in the API produces, for one question. */
const quiz: PracticeQuizData = {
  messages: [
    { version: '1.0', createSurface: { surfaceId: 'practice-quiz', catalogId: CATALOG } },
    {
      version: '1.0',
      updateComponents: {
        surfaceId: 'practice-quiz',
        components: [
          { id: 'root', component: 'Column', children: ['card_0'] },
          { id: 'card_0', component: 'Card', child: 'body_0' },
          {
            id: 'body_0',
            component: 'Column',
            children: ['question_0', 'picker_0', 'check_0', 'feedback_0'],
          },
          { id: 'question_0', component: 'Text', text: 'What is an eigenvalue?' },
          {
            id: 'picker_0',
            component: 'ChoicePicker',
            variant: 'mutuallyExclusive',
            options: [
              { label: 'A scalar', value: '0' },
              { label: 'A matrix', value: '1' },
            ],
            value: { '@path': '/q/0/selected' },
          },
          {
            id: 'check_0',
            component: 'Button',
            child: 'check_label_0',
            action: { event: { name: 'check', context: { index: 0 } } },
          },
          { id: 'check_label_0', component: 'Text', text: 'Check answer' },
          { id: 'feedback_0', component: 'Text', text: { '@path': '/q/0/feedback' } },
        ],
      },
    },
    {
      version: '1.0',
      updateDataModel: {
        surfaceId: 'practice-quiz',
        path: '/',
        value: { q: [{ selected: [], feedback: '' }] },
      },
    },
  ],
  answers: [{ correct: 0, correctLabel: 'A scalar', explanation: 'Av = λv.' }],
}

describe('PracticeQuiz', () => {
  it('draws the question and its options', async () => {
    render(<PracticeQuiz quiz={quiz} />)

    expect(await screen.findByText('What is an eigenvalue?')).toBeTruthy()
    expect(screen.getByText('A scalar')).toBeTruthy()
    expect(screen.getByText('A matrix')).toBeTruthy()
  })

  it('asks for an answer when nothing is picked', async () => {
    render(<PracticeQuiz quiz={quiz} />)

    fireEvent.click(await screen.findByRole('button', { name: /check answer/i }))

    expect(await screen.findByText('Pick an answer first.')).toBeTruthy()
  })

  it('marks a right answer', async () => {
    render(<PracticeQuiz quiz={quiz} />)
    fireEvent.click(await screen.findByLabelText('A scalar'))

    fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

    await waitFor(() => expect(screen.getByText('Correct. Av = λv.')).toBeTruthy())
  })

  it('names the right option after a wrong one', async () => {
    render(<PracticeQuiz quiz={quiz} />)
    fireEvent.click(await screen.findByLabelText('A matrix'))

    fireEvent.click(screen.getByRole('button', { name: /check answer/i }))

    await waitFor(() =>
      expect(screen.getByText('Not quite. The answer is A scalar. Av = λv.')).toBeTruthy(),
    )
  })
})
