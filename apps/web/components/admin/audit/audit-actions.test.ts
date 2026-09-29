import { describe, expect, it } from 'vitest'
import type { AuditLogEntity } from '@/src/lib/api/generated/unishareAPI.schemas'
import { actionMeta, describeEntry, targetHref } from './audit-actions'

const entry = (over: Partial<AuditLogEntity>): AuditLogEntity => ({
  id: 'a1',
  createdAt: '2026-09-29T00:00:00.000Z',
  action: 'post.delete',
  ...over,
})

describe('audit actions', () => {
  it('summarises a role change from the metadata', () => {
    expect(
      describeEntry(
        entry({
          action: 'user.set_role',
          metadata: { targetName: 'Ada', from: 'STUDENT', to: 'ADMIN' },
        }),
      ),
    ).toBe('Ada: STUDENT → ADMIN')
  })

  it('falls back to the raw action for one it does not know', () => {
    expect(actionMeta('thing.happened').label).toBe('thing.happened')
  })

  it('links to the post behind a report, but not to a deleted user', () => {
    expect(
      targetHref(
        entry({ action: 'report.approve', targetType: 'report', metadata: { postId: 'p1' } }),
      ),
    ).toBe('/posts/p1')
    expect(
      targetHref(entry({ action: 'user.delete', targetType: 'user', targetId: 'u1' })),
    ).toBeNull()
  })
})
