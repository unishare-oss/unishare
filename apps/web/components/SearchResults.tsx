'use client'

import { PostCard } from './post-card'

interface SearchResultsProps {
  results: any[]
  total: number
  isLoading?: boolean
}

export function SearchResults({ results, total, isLoading = false }: SearchResultsProps) {
  if (isLoading) {
    return <div className="py-8 text-center text-gray-500">Searching...</div>
  }

  if (results.length === 0) {
    return <div className="py-8 text-center text-gray-500">No posts found</div>
  }

  return (
    <div className="space-y-4">
      <div className="text-sm font-medium text-gray-700">{total} results found</div>
      <div className="space-y-4">
        {results.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
