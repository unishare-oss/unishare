import { describe, it, expect, vi } from 'vitest'
import * as Y from 'yjs'

describe('Yjs sync logic', () => {
  it('local update (no origin) triggers socket emit', () => {
    const ydoc = new Y.Doc()
    const yElements = ydoc.getArray('elements')
    const mockEmit = vi.fn()

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return
      mockEmit('yjs-update', update)
    })

    ydoc.transact(() => {
      yElements.push(['element-1'])
    })

    expect(mockEmit).toHaveBeenCalledWith('yjs-update', expect.any(Uint8Array))
    ydoc.destroy()
  })

  it('remote origin update does NOT trigger socket emit', () => {
    const ydoc = new Y.Doc()
    const yElements = ydoc.getArray('elements')
    const mockEmit = vi.fn()

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return
      mockEmit('yjs-update', update)
    })

    // Simulate a remote update: encode from another doc and apply with 'remote' origin
    const otherDoc = new Y.Doc()
    const otherElements = otherDoc.getArray('elements')
    otherDoc.transact(() => {
      otherElements.push(['element-from-remote'])
    })
    const update = Y.encodeStateAsUpdate(otherDoc)
    Y.applyUpdate(ydoc, update, 'remote')

    expect(mockEmit).not.toHaveBeenCalled()
    ydoc.destroy()
    otherDoc.destroy()
  })

  it('init origin update does NOT trigger socket emit', () => {
    const ydoc = new Y.Doc()
    const yElements = ydoc.getArray('elements')
    const mockEmit = vi.fn()

    ydoc.on('update', (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'init') return
      mockEmit('yjs-update', update)
    })

    // Simulate an init update (room-joined state applied with 'init' origin)
    const serverDoc = new Y.Doc()
    const serverElements = serverDoc.getArray('elements')
    serverDoc.transact(() => {
      serverElements.push(['initial-element'])
    })
    const state = Y.encodeStateAsUpdate(serverDoc)
    Y.applyUpdate(ydoc, new Uint8Array(state), 'init')

    expect(mockEmit).not.toHaveBeenCalled()
    ydoc.destroy()
    serverDoc.destroy()
  })

  it('applying a remote update propagates Y.Array contents between two Y.Docs', () => {
    const docA = new Y.Doc()
    const docB = new Y.Doc()
    const elementsA = docA.getArray('elements')
    const elementsB = docB.getArray('elements')

    // Doc A inserts an element
    docA.transact(() => {
      elementsA.push([{ id: 'rect-1', type: 'rectangle' }])
    })

    // Encode and apply to Doc B
    const update = Y.encodeStateAsUpdate(docA)
    Y.applyUpdate(docB, update, 'remote')

    const contentsB = elementsB.toArray()
    expect(contentsB).toHaveLength(1)
    expect(contentsB[0]).toMatchObject({ id: 'rect-1', type: 'rectangle' })

    docA.destroy()
    docB.destroy()
  })
})
