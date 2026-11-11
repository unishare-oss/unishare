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

describe('DropdownFilters on Campus', () => {
  it('shows year, module and course selects on Today', () => {
    render(<DropdownFilters {...base} />)
    expect(screen.getAllByRole('combobox')).toHaveLength(3)
  })

  it('hides year, module and course on Campus, keeping the sort', () => {
    render(<DropdownFilters {...base} campus />)
    expect(screen.queryAllByRole('combobox')).toHaveLength(0)
    expect(screen.getByRole('button', { name: /recent/i })).toBeInTheDocument()
  })
})
