import { Injectable, Logger } from '@nestjs/common'
import { CollabRepository } from './collab.repository'

export interface RoomFileMeta {
  fileId: string
  key: string
  mimeType: string
}

interface RoomEntry {
  elements: Map<string, Record<string, unknown>>
  files: Map<string, RoomFileMeta>
  timer: ReturnType<typeof setTimeout> | null
  idleTimer: ReturnType<typeof setTimeout> | null
}

/** Legacy snapshots are a bare elements array; new ones are `{ elements, files }`. */
function parseSnapshot(json: string): {
  elements: Record<string, unknown>[]
  files: RoomFileMeta[]
} {
  const parsed = JSON.parse(json) as unknown
  if (Array.isArray(parsed)) return { elements: parsed as Record<string, unknown>[], files: [] }
  const shaped = parsed as { elements?: Record<string, unknown>[]; files?: RoomFileMeta[] }
  return { elements: shaped.elements ?? [], files: shaped.files ?? [] }
}

@Injectable()
export class CollabRoomService {
  private readonly logger = new Logger(CollabRoomService.name)
  private readonly rooms = new Map<string, RoomEntry>()
  private readonly socketToRoom = new Map<string, string>()

  private readonly GC_DELAY = parseInt(process.env.COLLAB_GC_DELAY_MS ?? '15000', 10)
  private readonly IDLE_SAVE_DELAY = 30_000

  constructor(private readonly collabRepository: CollabRepository) {}

  async getOrLoadRoom(
    slug: string,
  ): Promise<{ elements: Record<string, unknown>[]; files: RoomFileMeta[] }> {
    if (!this.rooms.has(slug)) {
      const entry: RoomEntry = {
        elements: new Map(),
        files: new Map(),
        timer: null,
        idleTimer: null,
      }
      this.rooms.set(slug, entry)
      this.logger.log(`Created room entry for ${slug}`)

      const snapshot = await this.collabRepository.getSnapshot(slug)
      if (snapshot) {
        try {
          const { elements, files } = parseSnapshot(Buffer.from(snapshot).toString('utf8'))
          for (const el of elements) {
            if (el.id && typeof el.id === 'string') entry.elements.set(el.id, el)
          }
          for (const file of files) {
            entry.files.set(file.fileId, file)
          }
          this.logger.log(
            `Restored ${entry.elements.size} elements, ${entry.files.size} files for room ${slug}`,
          )
        } catch {
          this.logger.warn(`Failed to parse snapshot for room ${slug}, starting empty`)
        }
      }
    }
    const entry = this.rooms.get(slug)!
    return { elements: [...entry.elements.values()], files: [...entry.files.values()] }
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

  /** Registers a newly-uploaded file's metadata so late joiners can fetch+decrypt it too. */
  registerFile(slug: string, file: RoomFileMeta): void {
    const entry = this.rooms.get(slug)
    if (!entry) return
    entry.files.set(file.fileId, file)
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
      const files = [...entry.files.values()]
      const json = JSON.stringify({ elements, files })
      await this.collabRepository.saveSnapshot(slug, new Uint8Array(Buffer.from(json, 'utf8')))
      this.logger.log(
        `Saved snapshot for room ${slug} (${elements.length} elements, ${files.length} files)`,
      )
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
