import { Injectable, Logger } from '@nestjs/common'
import { CollabRepository } from './collab.repository'

interface RoomEntry {
  elements: Map<string, Record<string, unknown>>
  timer: ReturnType<typeof setTimeout> | null
  idleTimer: ReturnType<typeof setTimeout> | null
}

@Injectable()
export class CollabRoomService {
  private readonly logger = new Logger(CollabRoomService.name)
  private readonly rooms = new Map<string, RoomEntry>()
  private readonly socketToRoom = new Map<string, string>()

  private readonly GC_DELAY = parseInt(process.env.COLLAB_GC_DELAY_MS ?? '15000', 10)
  private readonly IDLE_SAVE_DELAY = 30_000

  constructor(private readonly collabRepository: CollabRepository) {}

  async getOrLoadElements(slug: string): Promise<Record<string, unknown>[]> {
    if (!this.rooms.has(slug)) {
      const entry: RoomEntry = { elements: new Map(), timer: null, idleTimer: null }
      this.rooms.set(slug, entry)
      this.logger.log(`Created room entry for ${slug}`)

      const snapshot = await this.collabRepository.getSnapshot(slug)
      if (snapshot) {
        try {
          const parsed = JSON.parse(Buffer.from(snapshot).toString('utf8')) as Record<
            string,
            unknown
          >[]
          for (const el of parsed) {
            if (el.id && typeof el.id === 'string') entry.elements.set(el.id, el)
          }
          this.logger.log(`Restored ${entry.elements.size} elements for room ${slug}`)
        } catch {
          this.logger.warn(`Failed to parse snapshot for room ${slug}, starting empty`)
        }
      }
    }
    return [...this.rooms.get(slug)!.elements.values()]
  }

  mergeElements(slug: string, incoming: Record<string, unknown>[]): void {
    const entry = this.rooms.get(slug)
    if (!entry) return
    for (const el of incoming) {
      if (!el.id || typeof el.id !== 'string') continue
      const stored = entry.elements.get(el.id)
      const incomingVersion = typeof el.version === 'number' ? el.version : 0
      const storedVersion = stored && typeof stored.version === 'number' ? stored.version : -1
      if (incomingVersion >= storedVersion) {
        entry.elements.set(el.id, el)
      }
    }
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
        void this.flushSnapshot(slug)
        entry.timer = setTimeout(() => {
          if (entry.idleTimer) clearTimeout(entry.idleTimer)
          this.rooms.delete(slug)
          this.logger.log(`GC: removed room ${slug}`)
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
      const elements = [...entry.elements.values()]
      const json = JSON.stringify(elements)
      await this.collabRepository.saveSnapshot(slug, new Uint8Array(Buffer.from(json, 'utf8')))
      this.logger.log(`Saved snapshot for room ${slug} (${elements.length} elements)`)
    } catch (err) {
      this.logger.warn(`Failed to save snapshot for room ${slug}`, err)
    }
  }

  hasRoom(slug: string): boolean {
    return this.rooms.has(slug)
  }

  getSocketCount(slug: string): number {
    return [...this.socketToRoom.values()].filter((s) => s === slug).length
  }
}
