import { CollabRoomService } from './collab.room.service'
import * as Y from 'yjs'

describe('CollabRoomService', () => {
  let service: CollabRoomService

  beforeEach(() => {
    jest.useFakeTimers()
    service = new CollabRoomService()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('getOrCreate', () => {
    it('should return a Y.Doc for a new slug', () => {
      const doc = service.getOrCreate('room-1')
      expect(doc).toBeInstanceOf(Y.Doc)
    })

    it('should return the SAME Y.Doc on second call for the same slug', () => {
      const doc1 = service.getOrCreate('room-1')
      const doc2 = service.getOrCreate('room-1')
      expect(doc1).toBe(doc2)
    })

    it('should return different Y.Doc instances for different slugs', () => {
      const doc1 = service.getOrCreate('room-1')
      const doc2 = service.getOrCreate('room-2')
      expect(doc1).not.toBe(doc2)
    })
  })

  describe('registerSocket and getRoomForSocket', () => {
    it('should return the correct slug after registerSocket', () => {
      service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      expect(service.getRoomForSocket('socket-1')).toBe('room-1')
    })

    it('should return undefined for unknown socket', () => {
      expect(service.getRoomForSocket('unknown-socket')).toBeUndefined()
    })
  })

  describe('removeSocket', () => {
    it('should clear socket-to-room mapping', () => {
      service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.removeSocket('socket-1')
      expect(service.getRoomForSocket('socket-1')).toBeUndefined()
    })

    it('should do nothing for unknown socket', () => {
      expect(() => service.removeSocket('nonexistent-socket')).not.toThrow()
    })

    it('should schedule GC when last socket leaves', () => {
      service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.removeSocket('socket-1')

      expect(service.hasRoom('room-1')).toBe(true)

      jest.advanceTimersByTime(5 * 60 * 1000)

      expect(service.hasRoom('room-1')).toBe(false)
    })

    it('should NOT schedule GC when other sockets remain in the room', () => {
      service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.registerSocket('socket-2', 'room-1')
      service.removeSocket('socket-1')

      jest.advanceTimersByTime(5 * 60 * 1000)

      expect(service.hasRoom('room-1')).toBe(true)
    })
  })

  describe('GC timer cancellation', () => {
    it('should cancel GC timer when a new socket registers before timeout fires', () => {
      service.getOrCreate('room-1')
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

    it('should return correct socket count for a room', () => {
      service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.registerSocket('socket-2', 'room-1')
      expect(service.getSocketCount('room-1')).toBe(2)
    })

    it('should decrease socket count after removeSocket', () => {
      service.getOrCreate('room-1')
      service.registerSocket('socket-1', 'room-1')
      service.registerSocket('socket-2', 'room-1')
      service.removeSocket('socket-1')
      expect(service.getSocketCount('room-1')).toBe(1)
    })
  })
})
