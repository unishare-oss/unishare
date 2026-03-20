import { Injectable, Logger } from '@nestjs/common'
import * as Y from 'yjs'

interface RoomEntry {
  doc: Y.Doc
  timer: ReturnType<typeof setTimeout> | null
}

@Injectable()
export class CollabRoomService {
  private readonly logger = new Logger(CollabRoomService.name)
  private readonly rooms = new Map<string, RoomEntry>()
  private readonly socketToRoom = new Map<string, string>()

  /** GC delay in ms — 5 minutes after last client leaves */
  private readonly GC_DELAY = 5 * 60 * 1000

  getOrCreate(slug: string): Y.Doc {
    if (!this.rooms.has(slug)) {
      this.rooms.set(slug, { doc: new Y.Doc(), timer: null })
      this.logger.log(`Created Y.Doc for room ${slug}`)
    }
    return this.rooms.get(slug)!.doc
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
        entry.timer = setTimeout(() => {
          entry.doc.destroy()
          this.rooms.delete(slug)
          this.logger.log(`GC: destroyed Y.Doc for room ${slug}`)
        }, this.GC_DELAY)
        this.logger.log(`Scheduled GC for room ${slug} in ${this.GC_DELAY}ms`)
      }
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
