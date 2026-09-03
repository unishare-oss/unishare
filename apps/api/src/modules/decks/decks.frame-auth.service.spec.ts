import {
  DecksFrameAuthService,
  isAllowed,
  isApiPath,
  isBlocked,
  isMetered,
  pathOf,
} from './decks.frame-auth.service'
import { UserRole } from '@/generated/prisma/client'

/**
 * This is the only thing between a student and the generator's whole API once its editor is
 * embedded, so the interesting cases are the ones that would quietly undo a control elsewhere:
 * a creation route that skips the daily allowance, a model call that skips the queue, an admin
 * route, or a path spelled oddly enough to miss a prefix check.
 */
describe('embedded editor route policy', () => {
  describe('pathOf', () => {
    it('drops the query string', () => {
      expect(pathOf('/presentation?id=abc')).toBe('/presentation')
    })

    it('normalises traversal so a prefix check cannot be walked around', () => {
      expect(pathOf('/api/v1/ppt/../admin/users')).toBe('/api/v1/admin/users')
      expect(isBlocked(pathOf('/api/v1/ppt/../admin/users'))).toBe(true)
    })

    it('collapses duplicate slashes', () => {
      expect(pathOf('/api/v1//admin')).toBe('/api/v1/admin')
    })
  })

  describe('blocked', () => {
    it.each([
      '/api/v1/admin',
      '/api/v1/admin/users',
      '/api/v1/admin/provider-settings',
      '/api/v1/auth/login',
      '/api/v1/auth/logout',
      '/api/v1/auth/token/create',
    ])('refuses %s', (path) => {
      expect(isBlocked(path)).toBe(true)
    })

    it.each([
      '/api/v1/ppt/presentation/generate',
      '/api/v1/ppt/presentation/generate/async',
      '/api/v1/ppt/presentation/create',
      '/api/v1/ppt/presentation/create/blank',
      '/api/v1/ppt/presentation/prepare',
      '/api/v1/ppt/presentation/derive',
      '/api/v1/ppt/presentation/abc-123/duplicate',
    ])('refuses %s so creation cannot skip the allowance', (path) => {
      // A deck created here would exist in the generator with no Deck row: absent from the
      // library, uncounted by the quota, never cleaned up on delete.
      expect(isBlocked(path)).toBe(true)
    })

    it('does not refuse the editing routes the frame actually needs', () => {
      for (const path of [
        '/presentation',
        '/api/v1/ppt/presentation/abc-123',
        '/api/v1/ppt/presentation/slide_update',
        '/api/v1/ppt/presentation/abc-123/export',
        '/api/v1/ppt/images/search',
        '/api/v1/ppt/images/upload',
        '/api/v1/ppt/template/all',
        '/_next/static/chunks/main.js',
      ]) {
        expect(isBlocked(path)).toBe(false)
      }
    })

    it.each(['/api/v1/ppt/presentation/status', '/api/v1/ppt/presentation/status/task-abc123'])(
      'refuses %s because the generator does not check who is asking',
      (path) => {
        // The status endpoint looks a task up by id and returns it with no ownership check at
        // all, so a leaked id hands one student another's progress and error text. The worker
        // polls this server-side; nothing in the frame has any use for it.
        expect(isBlocked(path)).toBe(true)
      },
    )

    it('does not treat a lookalike path as blocked', () => {
      // `/api/v1/administration` must not match the `/api/v1/admin` prefix.
      expect(isBlocked('/api/v1/administration')).toBe(false)
    })
  })

  describe('metered', () => {
    it.each([
      '/api/v1/ppt/slide/edit',
      '/api/v1/ppt/slide/edit-html',
      '/api/v1/ppt/presentation/edit',
      '/api/v1/ppt/images/generate',
      '/api/v1/ppt/chat/message',
      '/api/v1/ppt/theme/generate',
      '/api/v1/ppt/template/layouts/generate',
    ])('charges %s against the daily cap', (path) => {
      expect(isMetered(path)).toBe(true)
    })

    it('leaves free routes unmetered', () => {
      // Metering an asset request would exhaust a student's cap on page load.
      for (const path of [
        '/api/v1/ppt/presentation/abc-123',
        '/api/v1/ppt/presentation/slide_update',
        '/api/v1/ppt/images/search',
        '/api/v1/ppt/presentation/abc-123/export',
        '/_next/static/chunks/main.js',
      ]) {
        expect(isMetered(path)).toBe(false)
      }
    })

    it('never both blocks and meters the same path', () => {
      // Overlap would mean charging for a request that is refused anyway.
      for (const path of [
        '/api/v1/ppt/presentation/generate',
        '/api/v1/ppt/slide/edit',
        '/api/v1/admin/users',
      ]) {
        expect(isBlocked(path) && isMetered(path)).toBe(false)
      }
    })
  })
})

/**
 * The administrator exemption, which is a hole in a spend cap and so worth stating twice:
 * an administrator skips the AI-edit charge, and is still refused every BLOCKED route.
 *
 * Blocking is not a spending rule. It keeps deck creation inside Unishare so that every deck
 * has a database row to appear in a library, count against a quota and be cleaned up on
 * delete -- true for an administrator's decks as much as a student's.
 */
describe('DecksFrameAuthService.authorize', () => {
  const METERED = '/api/v1/ppt/slide/edit'

  function build() {
    const incr = jest.fn().mockResolvedValue(1)
    const accounts = { sessionFor: jest.fn().mockResolvedValue('presenton_session=abc') }
    const service = new DecksFrameAuthService({} as never, accounts as never)
    ;(service as unknown as { redis: unknown }).redis = { incr, pexpire: jest.fn() }
    return { service, incr }
  }

  it.each([undefined, UserRole.STUDENT, UserRole.MODERATOR])(
    'charges a metered route for %s',
    async (role) => {
      const { service, incr } = build()
      await service.authorize('user-1', METERED, role, 'POST')
      expect(incr).toHaveBeenCalledTimes(1)
    },
  )

  it('does not charge an administrator', async () => {
    const { service, incr } = build()
    await service.authorize('admin-1', METERED, UserRole.ADMIN, 'POST')
    expect(incr).not.toHaveBeenCalled()
  })

  it('still blocks an administrator from a creation route', async () => {
    const { service } = build()
    await expect(
      service.authorize('admin-1', '/api/v1/ppt/presentation/generate', UserRole.ADMIN, 'POST'),
    ).rejects.toThrow(/not available/)
  })
})

/**
 * The allow-list. These are the cases that would have let a student spend model tokens or
 * damage shared state, and the regression guard that the editor still works.
 */
describe('allow-list', () => {
  describe('closes the gaps a deny-list left open', () => {
    it.each([
      // Streams model output via utils.llm_calls. The bypass this change exists for: it was
      // neither blocked nor metered, so it spent tokens outside AI_EDIT_DAILY_CAP.
      ['GET', '/api/v1/ppt/outlines/stream/abc123'],
      ['GET', '/api/v1/ppt/outlines/abc123'],
      ['PUT', '/api/v1/ppt/outlines/abc123'],
      // Same gap, in presentation.py.
      ['GET', '/api/v1/ppt/presentation/stream/abc123'],
      // Unmetered writes to the shared volume.
      ['POST', '/api/v1/ppt/files/upload'],
      ['POST', '/api/v1/ppt/files/decompose'],
      ['POST', '/api/v1/ppt/fonts/upload'],
      // Pulls a model onto the node.
      ['POST', '/api/v1/ppt/ollama/models/pull'],
      // Provider OAuth.
      ['POST', '/api/v1/ppt/codex/auth/initiate'],
      ['POST', '/api/v1/ppt/codex/auth/exchange'],
    ])('refuses %s %s', (method, path) => {
      expect(isAllowed(path, method)).toBe(false)
    })

    /**
     * Templates and themes are INSTANCE-WIDE, so a delete is not the caller's to make. The
     * path is identical to a read the editor genuinely needs, which is why the rules carry
     * methods at all.
     */
    it('allows reading a template but never deleting one', () => {
      expect(isAllowed('/api/v1/ppt/template/executive', 'GET')).toBe(true)
      expect(isAllowed('/api/v1/ppt/template/executive', 'DELETE')).toBe(false)
      expect(isAllowed('/api/v1/ppt/template/executive', 'PATCH')).toBe(false)
    })

    it('allows reading themes but never writing them', () => {
      expect(isAllowed('/api/v1/ppt/themes/all', 'GET')).toBe(true)
      expect(isAllowed('/api/v1/ppt/themes/create', 'POST')).toBe(false)
      expect(isAllowed('/api/v1/ppt/themes/delete/7', 'DELETE')).toBe(false)
    })

    it('does not let a single-segment wildcard span a slash', () => {
      // `/presentation/*` must not reach `/presentation/stream/{id}`.
      expect(isAllowed('/api/v1/ppt/presentation/abc123', 'GET')).toBe(true)
      expect(isAllowed('/api/v1/ppt/presentation/stream/abc123', 'GET')).toBe(false)
    })
  })

  /**
   * Regression guard, built from what the generator actually served. If a change here breaks
   * one of these, the editor breaks for a student.
   */
  describe('keeps the editor working', () => {
    it.each([
      ['GET', '/api/v1/auth/status'],
      ['GET', '/api/v1/auth/verify'],
      ['GET', '/api/v1/async-tasks'],
      ['GET', '/api/user-config'],
      ['GET', '/api/v1/ppt/presentation/all'],
      ['GET', '/api/v1/ppt/presentation/019a2f1c-1111-2222-3333-444455556666'],
      ['PATCH', '/api/v1/ppt/presentation/slide_update'],
      ['PATCH', '/api/v1/ppt/presentation/update'],
      ['POST', '/api/v1/ppt/presentation/019a2f1c-1111-2222-3333-444455556666/export'],
      ['GET', '/api/v1/ppt/template/all'],
      ['GET', '/api/v1/ppt/template/general'],
      ['GET', '/api/v1/ppt/template/general/theme'],
      ['GET', '/api/v1/ppt/community/presentations'],
      ['GET', '/api/v1/ppt/community/presentations/134'],
      ['GET', '/api/v1/ppt/chat/conversations'],
    ])('allows %s %s', (method, path) => {
      expect(isAllowed(path, method)).toBe(true)
    })

    it('allows every metered route, since metering implies reachable', () => {
      const metered: [string, string][] = [
        ['POST', '/api/v1/ppt/slide/edit'],
        ['POST', '/api/v1/ppt/slide/edit-html'],
        ['POST', '/api/v1/ppt/presentation/edit'],
        ['GET', '/api/v1/ppt/images/generate'],
        ['POST', '/api/v1/ppt/chat/message'],
        ['POST', '/api/v1/ppt/theme/generate'],
        ['POST', '/api/v1/ppt/template/layouts/generate'],
      ]
      for (const [method, path] of metered) {
        expect(isMetered(path)).toBe(true)
        expect(isAllowed(path, method)).toBe(true)
      }
    })

    it('leaves pages and assets alone', () => {
      // Not API calls, so the allow-list never sees them. Enumerating Next's own routes would
      // break on every generator upgrade and protect nothing.
      for (const path of [
        '/',
        '/presentation',
        '/_next/static/chunks/main.js',
        '/app_data/templates/modern/static/thumbnail.png',
        '/app_data/exports/deck.pptx',
      ]) {
        expect(isApiPath(path)).toBe(false)
      }
      expect(isApiPath('/api/v1/auth/status')).toBe(true)
      expect(isApiPath('/api')).toBe(true)
    })
  })

  /** Reading chat history used to cost an AI edit, because METERED named the `/chat` prefix. */
  it('no longer charges for reading chat history', () => {
    expect(isMetered('/api/v1/ppt/chat/conversations')).toBe(false)
    expect(isMetered('/api/v1/ppt/chat/history')).toBe(false)
    expect(isMetered('/api/v1/ppt/chat/message')).toBe(true)
    expect(isMetered('/api/v1/ppt/chat/message/stream')).toBe(true)
  })
})
