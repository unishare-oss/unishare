import { isBlocked, isMetered, pathOf } from './decks.frame-auth.service'

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
      '/api/v1/ppt/chat/conversation',
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
