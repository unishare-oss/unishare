import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DropdownFilters } from '@/components/feed/dropdown-filters'

const base = {
  selectedDeptId: 'd1',
  selectedYear: null,
  selectedCourseId: '',
  selectedModuleNumber: null,
  departments: [],
  filteredCourses: [],
  selectedDeptLabel: 'All departments',
  selectedYearLabel: 'All years',
  selectedCourseLabel: 'All courses',
  onDeptChange: vi.fn(),
  onYearChange: vi.fn(),
  onCourseChange: vi.fn(),
  onModuleChange: vi.fn(),
  sortType: 'recent' as const,
  onSortChange: vi.fn(),
}

describe('DropdownFilters', () => {
  it('shows year, module and course selects', () => {
    render(<DropdownFilters {...base} />)
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
  })
})
