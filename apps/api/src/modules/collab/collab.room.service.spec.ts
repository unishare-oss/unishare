import { CollabRoomService } from './collab.room.service'
import * as Y from 'yjs'

const mockCollabRepository = {
  saveSnapshot: jest.fn().mockResolvedValue(undefined),
  getSnapshot: jest.fn().mockResolvedValue(null),
}

describe('CollabRoomService', () => {
  let service: CollabRoomService

  beforeEach(() => {
    jest.useFakeTimers()
    service = new CollabRoomService(mockCollabRepository as any)
  })

  afterEach(() => {
    jest.useRealTimers()
    jest.clearAllMocks()
  })

  describe('getOrCreate', () => {
    it('should return a Y.Doc for a new slug', async () => {
      const doc = await service.getOrCreate('room-1')
      expect(doc).toBeInstanceOf(Y.Doc)
    })

    it('should return the SAME Y.Doc on second call for the same slug', async () => {
      const doc1 = await service.getOrCreate('room-1')
      const doc2 = await service.getOrCreate('room-1')
      expect(doc1).toBe(doc2)
    })

    it('should return different Y.Doc instances for different slugs', async () => {
      const doc1 = await service.getOrCreate('room-1')
      const doc2 = await service.getOrCreate('room-2')
      expect(doc1).not.toBe(doc2)
    })
  })

  describe('registerSocket and getRoomForSocket', () => {
    it('should return the correct slug after registerSocket', async () => {
      await service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      expect(service.getRoomForSocket('socket-1')).toBe('room-1')
    })

    it('should return undefined for unknown socket', () => {
      expect(service.getRoomForSocket('unknown-socket')).toBeUndefined()
    })
  })

  describe('removeSocket', () => {
    it('should clear socket-to-room mapping', async () => {
      await service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.removeSocket('socket-1')
      expect(service.getRoomForSocket('socket-1')).toBeUndefined()
    })

    it('should do nothing for unknown socket', () => {
      expect(() => service.removeSocket('nonexistent-socket')).not.toThrow()
    })

    it('should schedule GC when last socket leaves', async () => {
      await service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.removeSocket('socket-1')

      expect(service.hasRoom('room-1')).toBe(true)

      jest.advanceTimersByTime(5 * 60 * 1000)

      expect(service.hasRoom('room-1')).toBe(false)
    })

    it('should NOT schedule GC when other sockets remain in the room', async () => {
      await service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.registerSocket('socket-2', 'room-1')
      service.removeSocket('socket-1')

      jest.advanceTimersByTime(5 * 60 * 1000)

      expect(service.hasRoom('room-1')).toBe(true)
    })
  })

  describe('GC timer cancellation', () => {
    it('should cancel GC timer when a new socket registers before timeout fires', async () => {
      await service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.removeSocket('socket-1')

      // Re-register before GC fires
      service.registerSocket('socket-2', 'room-1')

      // Advance past the GC timeout
      jest.advanceTimersByTime(5 * 60 * 1000)

      // Room should still exist because GC was cancelled
      expect(service.hasRoom('room-1')).toBe(true)
    })
  })

  describe('hasRoom and getSocketCount', () => {
    it('should return false for room that was never created', () => {
      expect(service.hasRoom('nonexistent')).toBe(false)
    })

    it('should return correct socket count for a room', async () => {
      await service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.registerSocket('socket-2', 'room-1')
      expect(service.getSocketCount('room-1')).toBe(2)
    })

    it('should decrease socket count after removeSocket', async () => {
      await service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.registerSocket('socket-2', 'room-1')
      service.removeSocket('socket-1')
      expect(service.getSocketCount('room-1')).toBe(1)
    })
  })

  describe('getOrCreate (async with snapshot restore)', () => {
    it('should load snapshot from DB when creating a fresh room', async () => {
      const snapshotDoc = new Y.Doc()
      snapshotDoc.getArray('elements').push([{ type: 'rectangle', id: '1' }])
      const snapshotBytes = new Uint8Array(Y.encodeStateAsUpdate(snapshotDoc))
      mockCollabRepository.getSnapshot.mockResolvedValueOnce(snapshotBytes)

      const doc = await service.getOrCreate('room-snap')
      const elements = doc.getArray('elements').toArray()
      expect(elements).toHaveLength(1)
      expect(mockCollabRepository.getSnapshot).toHaveBeenCalledWith('room-snap')
    })

    it('should NOT reload from DB if room already in memory', async () => {
      await service.getOrCreate('room-mem')
      mockCollabRepository.getSnapshot.mockClear()
      const doc2 = await service.getOrCreate('room-mem')
      expect(mockCollabRepository.getSnapshot).not.toHaveBeenCalled()
      expect(doc2).toBeInstanceOf(Y.Doc)
    })

    it('should handle null snapshot (new room, no prior data)', async () => {
      mockCollabRepository.getSnapshot.mockResolvedValueOnce(null)
      const doc = await service.getOrCreate('room-new')
      expect(doc.getArray('elements').toArray()).toHaveLength(0)
    })
  })

  describe('resetIdleTimer', () => {
    it('should save snapshot after IDLE_SAVE_DELAY', async () => {
      await service.getOrCreate('room-idle')
      service.registerSocket('s1', 'room-idle')
      service.resetIdleTimer('room-idle')

      jest.advanceTimersByTime(30_000)
      // Allow microtask queue to flush for async saveSnapshot
      await Promise.resolve()

      expect(mockCollabRepository.saveSnapshot).toHaveBeenCalledWith(
        'room-idle',
        expect.any(Uint8Array),
      )
    })

    it('should reset timer on repeated calls (only one save)', async () => {
      await service.getOrCreate('room-reset')
      service.registerSocket('s1', 'room-reset')

      service.resetIdleTimer('room-reset')
      jest.advanceTimersByTime(15_000)
      service.resetIdleTimer('room-reset')
      jest.advanceTimersByTime(15_000)

      // First timer was cancelled, second hasn't fired yet
      expect(mockCollabRepository.saveSnapshot).not.toHaveBeenCalled()

      jest.advanceTimersByTime(15_000)
      await Promise.resolve()
      expect(mockCollabRepository.saveSnapshot).toHaveBeenCalledTimes(1)
    })
  })

  describe('flushSnapshot', () => {
    it('should save snapshot immediately and cancel idle timer', async () => {
      await service.getOrCreate('room-flush')
      service.registerSocket('s1', 'room-flush')
      service.resetIdleTimer('room-flush')

      await service.flushSnapshot('room-flush')
      expect(mockCollabRepository.saveSnapshot).toHaveBeenCalledWith(
        'room-flush',
        expect.any(Uint8Array),
      )

      // Advancing past idle delay should NOT trigger another save
      mockCollabRepository.saveSnapshot.mockClear()
      jest.advanceTimersByTime(30_000)
      await Promise.resolve()
      expect(mockCollabRepository.saveSnapshot).not.toHaveBeenCalled()
    })
  })
})
