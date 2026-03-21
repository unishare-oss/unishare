'use client'

import { Search, Loader2 } from 'lucide-react'
import { useSearch } from '@/hooks/use-search'
import { Input } from '@/components/ui/input'

interface SearchBoxProps {
  onSearch?: (query: string) => void
  placeholder?: string
}

export function SearchBox({ onSearch, placeholder = 'Search posts...' }: SearchBoxProps) {
  const { query, setQuery, debouncedQuery, results, isLoading, error } = useSearch()

  const handleChange = (value: string) => {
    setQuery(value)
    onSearch?.(value)
  }

  return (
    <div className="w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          className="pl-10 pr-4"
        />
        {isLoading && debouncedQuery && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        )}
      </div>

      {error && debouncedQuery && (
        <div className="mt-2 text-sm text-red-500">Search failed. Please try again.</div>
      )}

      {debouncedQuery && !isLoading && (
        <div className="mt-4 space-y-2">
          <div className="text-sm text-gray-600">
            {results.length === 0 ? 'No posts found' : `Found ${results.length} result(s)`}
          </div>
          {results.length > 0 && (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {results.map((post) => (
                <div
                  key={post.id}
                  className="rounded-lg border border-gray-200 bg-white p-3 hover:bg-gray-50"
                >
                  <h4 className="font-medium text-sm">{post.title}</h4>
                  <p className="text-xs text-gray-600 line-clamp-2">{post.description}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
