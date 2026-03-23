import { Injectable, Logger } from '@nestjs/common'
import * as Y from 'yjs'
import { CollabRepository } from './collab.repository'

interface RoomEntry {
  doc: Y.Doc
  timer: ReturnType<typeof setTimeout> | null
  idleTimer: ReturnType<typeof setTimeout> | null
}

@Injectable()
export class CollabRoomService {
  private readonly logger = new Logger(CollabRoomService.name)
  private readonly rooms = new Map<string, RoomEntry>()
  private readonly socketToRoom = new Map<string, string>()

  /** GC delay in ms — 60s after last client leaves (keep short on low-RAM servers) */
  private readonly GC_DELAY = parseInt(process.env.COLLAB_GC_DELAY_MS ?? '60000', 10)

  /** Idle save delay — 30 seconds after last Yjs update */
  private readonly IDLE_SAVE_DELAY = 30_000

  constructor(private readonly collabRepository: CollabRepository) {}

  async getOrCreate(slug: string): Promise<Y.Doc> {
    if (this.rooms.has(slug)) {
      return this.rooms.get(slug)!.doc
    }
    const doc = new Y.Doc()
    this.rooms.set(slug, { doc, timer: null, idleTimer: null })
    this.logger.log(`Created Y.Doc for room ${slug}`)

    const snapshot = await this.collabRepository.getSnapshot(slug)
    if (snapshot) {
      Y.applyUpdate(doc, new Uint8Array(snapshot))
      this.logger.log(`Restored snapshot for room ${slug}`)
    }

    // Lazy migration: old snapshots stored elements in Y.Array('elements').
    // New code uses Y.Map('elementsMap') + Y.Array('elementOrder').
    // If the map is empty but the old array has data, migrate in-place and save.
    const oldArr = doc.getArray<Record<string, unknown>>('elements')
    const newMap = doc.getMap<Record<string, unknown>>('elementsMap')
    const newOrder = doc.getArray<string>('elementOrder')

    if (oldArr.length > 0 && newMap.size === 0) {
      this.logger.log(`Migrating room ${slug}: ${oldArr.length} elements from Y.Array → Y.Map`)
      const elements = oldArr.toArray()
      doc.transact(() => {
        for (const el of elements) {
          if (el && typeof el.id === 'string') {
            newMap.set(el.id, el)
          }
        }
        const ids = elements
          .filter((el) => el && typeof el.id === 'string')
          .map((el) => el.id as string)
        newOrder.insert(0, ids)
      })
      await this.saveSnapshot(slug)
      this.logger.log(`Migration complete for room ${slug}`)
    }

    return doc
  }

  getDoc(slug: string): Y.Doc | undefined {
    return this.rooms.get(slug)?.doc
  }

  getRoomForSocket(socketId: string): string | undefined {
    return this.socketToRoom.get(socketId)
  }

  registerSocket(socketId: string, slug: string): void {
    this.socketToRoom.set(socketId, slug)
    const entry = this.rooms.get(slug)
    if (entry?.timer) {
      clearTimeout(entry.timer)
      entry.timer = null
      this.logger.log(`Cancelled GC timer for room ${slug}`)
    }
  }

  removeSocket(socketId: string): void {
    const slug = this.socketToRoom.get(socketId)
    this.socketToRoom.delete(socketId)
    if (!slug) return

    const remaining = [...this.socketToRoom.values()].filter((s) => s === slug)
    if (remaining.length === 0) {
      const entry = this.rooms.get(slug)
      if (entry) {
        // Flush snapshot before scheduling GC
        void this.flushSnapshot(slug)
        entry.timer = setTimeout(() => {
          if (entry.idleTimer) clearTimeout(entry.idleTimer)
          entry.doc.destroy()
          this.rooms.delete(slug)
          this.logger.log(`GC: destroyed Y.Doc for room ${slug}`)
        }, this.GC_DELAY)
        this.logger.log(`Scheduled GC for room ${slug} in ${this.GC_DELAY}ms`)
      }
    }
  }

  resetIdleTimer(slug: string): void {
    const entry = this.rooms.get(slug)
    if (!entry) return
    if (entry.idleTimer) clearTimeout(entry.idleTimer)
    entry.idleTimer = setTimeout(() => {
      void this.saveSnapshot(slug)
    }, this.IDLE_SAVE_DELAY)
  }

  async flushSnapshot(slug: string): Promise<void> {
    const entry = this.rooms.get(slug)
    if (!entry) return
    if (entry.idleTimer) {
      clearTimeout(entry.idleTimer)
      entry.idleTimer = null
    }
    await this.saveSnapshot(slug)
  }

  private async saveSnapshot(slug: string): Promise<void> {
    const entry = this.rooms.get(slug)
    if (!entry) return
    try {
      const snapshot = Y.encodeStateAsUpdate(entry.doc)
      await this.collabRepository.saveSnapshot(slug, snapshot)
      this.logger.log(`Saved snapshot for room ${slug}`)
    } catch (err) {
      this.logger.warn(`Failed to save snapshot for room ${slug}`, err)
    }
  }

  /** For testing: check if a room exists in memory */
  hasRoom(slug: string): boolean {
    return this.rooms.has(slug)
  }

  /** For testing: get socket count for a room */
  getSocketCount(slug: string): number {
    return [...this.socketToRoom.values()].filter((s) => s === slug).length
  }
}
