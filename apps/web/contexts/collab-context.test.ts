import { describe, it, expect, vi } from 'vitest'
import * as Y from 'yjs'

describe('Yjs sync logic', () => {
  it('local update (no origin) triggers socket emit', () => {
    const ydoc = new Y.Doc()
    const yElementsMap = ydoc.getMap('elementsMap')
    const mockEmit = vi.fn()

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return
      mockEmit('yjs-update', update)
    })

    ydoc.transact(() => {
      yElementsMap.set('rect-1', { id: 'rect-1', type: 'rectangle' })
    })

    expect(mockEmit).toHaveBeenCalledWith('yjs-update', expect.any(Uint8Array))
    ydoc.destroy()
  })

  it('remote origin update does NOT trigger socket emit', () => {
    const ydoc = new Y.Doc()
    const mockEmit = vi.fn()

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return
      mockEmit('yjs-update', update)
    })

    const otherDoc = new Y.Doc()
    const otherMap = otherDoc.getMap('elementsMap')
    otherDoc.transact(() => {
      otherMap.set('rect-remote', { id: 'rect-remote', type: 'rectangle' })
    })
    const update = Y.encodeStateAsUpdate(otherDoc)
    Y.applyUpdate(ydoc, update, 'remote')

    expect(mockEmit).not.toHaveBeenCalled()
    ydoc.destroy()
    otherDoc.destroy()
  })

  it('init origin update does NOT trigger socket emit', () => {
    const ydoc = new Y.Doc()
    const mockEmit = vi.fn()

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return
      mockEmit('yjs-update', update)
    })

    const serverDoc = new Y.Doc()
    const serverMap = serverDoc.getMap('elementsMap')
    serverDoc.transact(() => {
      serverMap.set('rect-init', { id: 'rect-init', type: 'rectangle' })
    })
    const state = Y.encodeStateAsUpdate(serverDoc)
    Y.applyUpdate(ydoc, new Uint8Array(state), 'init')

    expect(mockEmit).not.toHaveBeenCalled()
    ydoc.destroy()
    serverDoc.destroy()
  })

  it('Y.Map update propagates between two Y.Docs', () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    const mapA = docA.getMap('elementsMap')
    const mapB = docB.getMap('elementsMap')

    docA.transact(() => {
      mapA.set('rect-1', { id: 'rect-1', type: 'rectangle' })
    })

    const update = Y.encodeStateAsUpdate(docA)
    Y.applyUpdate(docB, update, 'remote')

    expect(mapB.size).toBe(1)
    expect(mapB.get('rect-1')).toMatchObject({ id: 'rect-1', type: 'rectangle' })

    docA.destroy()
    docB.destroy()
  })

  it('concurrent Y.Map edits to different elements merge without conflicts', () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    const mapA = docA.getMap('elementsMap')
    const mapB = docB.getMap('elementsMap')

    // Two users independently add different elements
    docA.transact(() => {
      mapA.set('rect-1', { id: 'rect-1', type: 'rectangle' })
    })
    docB.transact(() => {
      mapB.set('rect-2', { id: 'rect-2', type: 'ellipse' })
    })

    // Sync both ways
    Y.applyUpdate(docA, Y.encodeStateAsUpdate(docB), 'remote')
    Y.applyUpdate(docB, Y.encodeStateAsUpdate(docA), 'remote')

    // Both docs converge to 2 elements — no duplication
    expect(mapA.size).toBe(2)
    expect(mapB.size).toBe(2)
    expect(mapA.get('rect-1')).toMatchObject({ type: 'rectangle' })
    expect(mapA.get('rect-2')).toMatchObject({ type: 'ellipse' })

    docA.destroy()
    docB.destroy()
  })

  it('Y.mergeUpdates produces a single update that applies identically', () => {
    const source = new Y.Doc()
    const sourceMap = source.getMap('elementsMap')

    const updates: Uint8Array[] = []
    source.on('update', (u: Uint8Array) => updates.push(u))

    source.transact(() => {
      sourceMap.set('a', { id: 'a' })
    })
    source.transact(() => {
      sourceMap.set('b', { id: 'b' })
    })
    source.transact(() => {
      sourceMap.set('c', { id: 'c' })
    })

    expect(updates).toHaveLength(3)

    // Apply three separate updates
    const docSeparate = new Y.Doc()
    for (const u of updates) Y.applyUpdate(docSeparate, u)

    // Apply one merged update
    const docMerged = new Y.Doc()
    Y.applyUpdate(docMerged, Y.mergeUpdates(updates))

    const sep = docSeparate.getMap('elementsMap')
    const mrg = docMerged.getMap('elementsMap')
    expect(sep.size).toBe(mrg.size)
    expect(sep.get('a')).toEqual(mrg.get('a'))
    expect(sep.get('c')).toEqual(mrg.get('c'))

    source.destroy()
    docSeparate.destroy()
    docMerged.destroy()
  })
})
