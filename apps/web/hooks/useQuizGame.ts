import { useState, useCallback } from 'react'
import type { QuizEntity, QuizQuestionEntity } from '@/src/lib/api/generated/unishareAPI.schemas'

// Re-export generated types for convenience
export type Question = QuizQuestionEntity
export type Quiz = QuizEntity

interface QuestionAnswer {
  questionId: string
  answerIndex: number | null
}

export function useQuizGame(quiz: Quiz) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<QuestionAnswer[]>(
    quiz.questions.map((q) => ({ questionId: q.id, answerIndex: null })),
  )
  const [showFeedback, setShowFeedback] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [startTime] = useState(() => Date.now())
  const [timeTaken, setTimeTaken] = useState(0)

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const currentAnswer = answers[currentQuestionIndex]

  const selectAnswer = useCallback(
    (answerIndex: number) => {
      if (isSubmitted) return
      // Don't allow changing an already-answered question
      if (answers[currentQuestionIndex].answerIndex !== null) return

      const newAnswers = [...answers]
      newAnswers[currentQuestionIndex] = { questionId: currentQuestion.id, answerIndex }
      setAnswers(newAnswers)
      setShowFeedback(true)
    },
    [answers, currentQuestionIndex, currentQuestion.id, isSubmitted],
  )

  const goNext = useCallback(() => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setShowFeedback(false)
    }
  }, [currentQuestionIndex, quiz.questions.length])

  const goPrevious = useCallback(() => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1)
      setShowFeedback(false)
    }
  }, [currentQuestionIndex])

  const submitQuiz = useCallback(async () => {
    setTimeTaken(Math.round((Date.now() - startTime) / 1000))
    setIsSubmitted(true)
  }, [startTime])

  const jumpToQuestion = useCallback(
    (index: number) => {
      if (index >= 0 && index < quiz.questions.length) {
        setCurrentQuestionIndex(index)
        setShowFeedback(false)
      }
    },
    [quiz.questions.length],
  )

  const calculateScore = useCallback(
    (correctAnswers: { [key: string]: number }) => {
      let score = 0
      answers.forEach((answer) => {
        const question = quiz.questions.find((q) => q.id === answer.questionId)
        if (
          question &&
          answer.answerIndex !== null &&
          answer.answerIndex === correctAnswers[answer.questionId]
        ) {
          score += 1
        }
      })
      return score
    },
    [answers, quiz.questions],
  )

  return {
    quiz,
    currentQuestion,
    currentQuestionIndex,
    totalQuestions: quiz.questions.length,
    currentAnswer,
    answers,
    showFeedback,
    isSubmitted,
    timeTaken,
    startTime,
    selectAnswer,
    goNext,
    goPrevious,
    submitQuiz,
    jumpToQuestion,
    calculateScore,
    progress: Math.round(((currentQuestionIndex + 1) / quiz.questions.length) * 100),
  }
}
