import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { UserProfileEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { uniauthAccountURL } from '@/src/lib/auth/mode'
import { ProfileHeaderCard } from './profile-header-card'

const user = {
  id: 'u1',
  name: 'Ada',
  email: 'ada@example.com',
  image: null,
  role: 'USER',
  createdAt: '2024-01-01T00:00:00.000Z',
  followerCount: 0,
  followingCount: 0,
} as unknown as UserProfileEntity

describe('ProfileHeaderCard', () => {
  it('changes the picture on unicorp instead of uploading it here', () => {
    const { container } = render(<ProfileHeaderCard user={user} />)
    expect(screen.getByRole('link', { name: 'Change profile picture on unicorp' })).toHaveAttribute(
      'href',
      uniauthAccountURL('/profile'),
    )
    expect(container.querySelector('input[type="file"]')).toBeNull()
  })
})
