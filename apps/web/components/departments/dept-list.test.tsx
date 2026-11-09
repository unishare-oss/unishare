import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { DeptList } from './dept-list'

afterEach(cleanup)

const kmuttEng = { id: 'f-eng', name: 'Faculty of Engineering', universityId: 'u-kmutt' }
const kmuttSci = { id: 'f-sci', name: 'Faculty of Science', universityId: 'u-kmutt' }
const mfuIt = { id: 'f-it', name: 'School of Information Technology', universityId: 'u-mfu' }
const universities = [
  { id: 'u-mfu', name: 'Mae Fah Luang University', shortName: 'MFU' },
  { id: 'u-kmutt', name: "King Mongkut's University of Technology Thonburi", shortName: 'KMUTT' },
]

const dept = (id: string, name: string, faculty: typeof kmuttEng) => ({
  id,
  name,
  courseCount: 3,
  faculty,
})

describe('DeptList', () => {
  it('shows one section per faculty for a signed-in user', () => {
    render(
      <DeptList
        departments={[
          dept('d1', 'Physics', kmuttSci),
          dept('d2', 'Computer Engineering', kmuttEng),
        ]}
      />,
    )
    const sections = screen.getAllByRole('region')
    expect(sections.map((s) => s.getAttribute('aria-label'))).toEqual([
      'Faculty of Engineering',
      'Faculty of Science',
    ])
    expect(within(sections[0]).getByRole('link', { name: /Computer Engineering/ })).toHaveAttribute(
      'href',
      '/departments/d2',
    )
    expect(screen.queryByRole('heading', { level: 2 })).not.toBeInTheDocument()
  })

  it('groups by university, then faculty, for signed-out visitors', () => {
    render(
      <DeptList
        departments={[
          dept('d1', 'Software Engineering', mfuIt),
          dept('d2', 'Physics', kmuttSci),
          dept('d3', 'Computer Engineering', kmuttEng),
        ]}
        universities={universities}
      />,
    )
    const uniHeadings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent)
    expect(uniHeadings).toEqual([
      "King Mongkut's University of Technology Thonburi",
      'Mae Fah Luang University',
    ])

    const kmutt = screen.getByRole('region', { name: universities[1].name })
    expect(
      within(kmutt)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent),
    ).toEqual(['Faculty of Engineering', 'Faculty of Science'])
    expect(within(kmutt).queryByText('Software Engineering')).not.toBeInTheDocument()

    const mfu = screen.getByRole('region', { name: universities[0].name })
    expect(within(mfu).getByText('School of Information Technology')).toBeInTheDocument()
    expect(within(mfu).getByText('Software Engineering')).toBeInTheDocument()
  })
})
