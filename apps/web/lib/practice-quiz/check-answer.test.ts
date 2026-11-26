import { describe, expect, it } from 'vitest'
import { checkPracticeAnswer, type PracticeQuizAnswer } from './check-answer'

const answer: PracticeQuizAnswer = {
  correct: 1,
  correctLabel: 'Symmetric real',
  explanation: 'The spectral theorem.',
}

describe('checkPracticeAnswer', () => {
  it('confirms the right option and gives the explanation', () => {
    expect(checkPracticeAnswer(['1'], answer)).toBe('Correct. The spectral theorem.')
  })

  it('names the right option when the student picked another', () => {
    expect(checkPracticeAnswer(['0'], answer)).toBe(
      'Not quite. The answer is Symmetric real. The spectral theorem.',
    )
  })

  it('leaves out an empty explanation', () => {
    const bare = { ...answer, explanation: '  ' }

    expect(checkPracticeAnswer(['1'], bare)).toBe('Correct.')
    expect(checkPracticeAnswer(['0'], bare)).toBe('Not quite. The answer is Symmetric real.')
  })

  it.each([
    ['nothing picked', []],
    ['no value at all', undefined],
    ['a string', '1'],
    ['two options', ['0', '1']],
    ['a non-number', ['abc']],
    ['a fraction', ['1.5']],
  ])('asks for an answer when given %s', (_name, selected) => {
    expect(checkPracticeAnswer(selected, answer)).toBe('Pick an answer first.')
  })
})
