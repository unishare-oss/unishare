import { validatePayload } from '@a2ui/agent'
import { basicCatalog } from '@a2ui/web_core/catalogs/basic/v1'
import { buildPracticeQuiz, type PracticeQuestion } from './practice-quiz-surface'

const questions: PracticeQuestion[] = [
  {
    content: 'What is an eigenvalue?',
    options: ['A scalar', 'A matrix', 'A vector', 'A basis'],
    correctAnswer: 0,
    explanation: 'Av = λv, and λ is the scalar.',
  },
  {
    content: 'Which matrices are always diagonalisable?',
    options: ['All', 'Symmetric real', 'Singular', 'Nilpotent'],
    correctAnswer: 1,
    explanation: 'The spectral theorem.',
  },
]

describe('buildPracticeQuiz', () => {
  it('produces messages the A2UI basic catalog accepts', () => {
    const { messages } = buildPracticeQuiz(questions)

    expect(() => validatePayload([basicCatalog], messages)).not.toThrow()
  })

  it('is still valid for a single question', () => {
    const { messages } = buildPracticeQuiz([questions[0]])

    expect(() => validatePayload([basicCatalog], messages)).not.toThrow()
  })

  it('keeps the correct answers out of the messages', () => {
    const { messages, answers } = buildPracticeQuiz(questions)

    expect(answers).toEqual([
      { correct: 0, correctLabel: 'A scalar', explanation: 'Av = λv, and λ is the scalar.' },
      { correct: 1, correctLabel: 'Symmetric real', explanation: 'The spectral theorem.' },
    ])
    expect(JSON.stringify(messages)).not.toContain('spectral theorem')
    expect(JSON.stringify(messages)).not.toContain('correct')
  })

  it('gives each question its own picker, answer slot and feedback slot', () => {
    const { messages } = buildPracticeQuiz(questions)
    const json = JSON.stringify(messages)

    expect(json).toContain('/q/0/selected')
    expect(json).toContain('/q/1/selected')
    expect(json).toContain('/q/0/feedback')
    expect(json).toContain('/q/1/feedback')
  })

  it('numbers the options by position so the client can compare them to the answer', () => {
    const { messages } = buildPracticeQuiz([questions[0]])
    const components = (messages[1].updateComponents as { components: Record<string, unknown>[] })
      .components
    const picker = components.find((c) => c.id === 'picker_0') as {
      options: { label: string; value: string }[]
    }

    expect(picker.options.map((o) => o.value)).toEqual(['0', '1', '2', '3'])
    expect(picker.options.map((o) => o.label)).toEqual(questions[0].options)
  })
})
