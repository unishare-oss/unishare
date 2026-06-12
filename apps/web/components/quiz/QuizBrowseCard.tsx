'use client'

import Link from 'next/link'
import { HelpCircle, Play } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'

export interface QuizListItem {
  id: string
  title: string
  description?: string | null
  courseId: string
  course?: { code?: string; name?: string }
  questionsCount: number
  createdAt: string
}

export function QuizBrowseCard({ quiz }: { quiz: QuizListItem }) {
  return (
    <Link
      href={`/quizzes/${quiz.id}`}
      className="card-pop card-pop-hover flex items-start gap-4 p-4 rounded-xl bg-card group hover:bg-accent"
    >
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
        <HelpCircle className="w-5 h-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0 space-y-1">
        <p className="font-medium text-sm leading-snug">{quiz.title}</p>
        {quiz.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{quiz.description}</p>
        )}
        <div className="flex items-center gap-2 pt-0.5">
          {quiz.course?.code && (
            <Badge variant="outline" className="text-xs font-mono font-normal">
              {quiz.course.code}
            </Badge>
          )}
          <Badge variant="secondary" className="text-xs font-normal">
            {quiz.questionsCount} questions
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(quiz.createdAt), { addSuffix: true })}
          </span>
        </div>
      </div>
      <div className="shrink-0 flex items-center mt-1">
        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-muted text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
          <Play className="w-3 h-3" />
          Start
        </span>
      </div>
    </Link>
  )
}
