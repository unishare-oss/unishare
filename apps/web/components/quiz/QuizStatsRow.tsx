'use client'

import { BookOpen, TrendingUp, Trophy } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface Stats {
  totalAttempts: number
  averageScore: number
  bestScore: number
}

export function QuizStatsRow({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-3 gap-4">
      <Card>
        <CardContent className="pt-5 pb-4 text-center space-y-1">
          <BookOpen className="w-4 h-4 text-primary mx-auto" />
          <p className="text-xl font-bold">{stats.totalAttempts}</p>
          <p className="text-xs text-muted-foreground">Attempts</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5 pb-4 text-center space-y-1">
          <TrendingUp className="w-4 h-4 text-primary mx-auto" />
          <p className="text-xl font-bold">{Math.round(stats.averageScore)}%</p>
          <p className="text-xs text-muted-foreground">Avg Score</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-5 pb-4 text-center space-y-1">
          <Trophy className="w-4 h-4 text-primary mx-auto" />
          <p className="text-xl font-bold">{Math.round(stats.bestScore)}%</p>
          <p className="text-xs text-muted-foreground">Best Score</p>
        </CardContent>
      </Card>
    </div>
  )
}
