'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FeedSortDropdownProps {
  onChange: (sort: 'recent' | 'trending') => void
  defaultSort?: 'recent' | 'trending'
}

export function FeedSortDropdown({ onChange, defaultSort = 'recent' }: FeedSortDropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState<'recent' | 'trending'>(defaultSort)

  const handleSelect = (sort: 'recent' | 'trending') => {
    setSelected(sort)
    onChange(sort)
    setIsOpen(false)
  }

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md bg-white hover:bg-gray-50 text-sm font-medium"
      >
        {selected === 'recent' ? 'Recent' : 'Trending'}
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="absolute top-full mt-1 left-0 bg-white border border-gray-200 rounded-md shadow-lg z-10 min-w-[140px]">
          <button
            onClick={() => handleSelect('recent')}
            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
              selected === 'recent' ? 'bg-gray-50 font-semibold' : ''
            }`}
          >
            Recent
          </button>
          <button
            onClick={() => handleSelect('trending')}
            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-100 border-t border-gray-200 ${
              selected === 'trending' ? 'bg-gray-50 font-semibold' : ''
            }`}
          >
            Trending
          </button>
        </div>
      )}
    </div>
  )
}
