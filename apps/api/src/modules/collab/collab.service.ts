import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { nanoid } from 'nanoid'
import { fromNodeHeaders } from 'better-auth/node'
import type { Request, Response } from 'express'
import { RoomVisibility } from '@/generated/prisma/client'
import { auth, type UserSession } from '@/auth/auth.config'
import { CollabRepository } from './collab.repository'
import { CreateRoomDto } from './dto/create-room.dto'
import { UpdateRoomDto } from './dto/update-room.dto'

@Injectable()
export class CollabService {
  constructor(private readonly collabRepository: CollabRepository) {}

  async createRoom(dto: CreateRoomDto, ownerId: string) {
    const slug = nanoid(10)
    return this.collabRepository.create({ slug, ownerId, title: dto.title })
  }

  async getRoomBySlug(slug: string) {
    const room = await this.collabRepository.findBySlug(slug)
    if (!room) throw new NotFoundException('Room not found')
    return room
  }

  async updateRoom(slug: string, dto: UpdateRoomDto, userId: string) {
    const room = await this.collabRepository.findBySlug(slug)
    if (!room) throw new NotFoundException('Room not found')
    if (room.ownerId !== userId)
      throw new ForbiddenException('Only the room owner can update settings')
    return this.collabRepository.updateVisibility(slug, dto.visibility)
  }

  async joinRoom(slug: string, session: UserSession | null, req: Request, res: Response) {
    const room = await this.collabRepository.findBySlugWithVisibility(slug)
    if (!room) throw new NotFoundException('Room not found')

    let activeSession = session
    let isAnonymous = false

    if (!activeSession) {
      // No session — create anonymous one
      const result = await auth.api.signInAnonymous({
        headers: fromNodeHeaders(req.headers),
        returnHeaders: true,
      })

      // Forward the set-cookie header to the client
      const setCookieHeader = result.headers?.get('set-cookie')
      if (setCookieHeader) {
        res.setHeader('set-cookie', setCookieHeader)
      }

      // Retrieve the full session using the returned token
      const anonSession = await auth.api.getSession({
        headers: new Headers({
          authorization: `Bearer ${result.response?.token ?? ''}`,
        }),
      })

      if (!anonSession) {
        throw new NotFoundException('Failed to create anonymous session')
      }

      activeSession = anonSession as unknown as UserSession
      isAnonymous = true
    } else {
      isAnonymous = !!(activeSession.user as unknown as Record<string, unknown>).isAnonymous
    }

    if (room.visibility === RoomVisibility.PRIVATE && isAnonymous) {
      throw new ForbiddenException('Room is private')
    }
    const isViewOnly = room.visibility === RoomVisibility.VIEW_ONLY && isAnonymous

    // displayName: for anonymous users, name was set by generateName callback in auth.config;
    // for authenticated users, use session.displayName or user.name as fallback
    const displayName =
      ((activeSession.session as unknown as Record<string, unknown>).displayName as
        | string
        | undefined) ?? activeSession.user.name

    return {
      roomSlug: room.slug,
      sessionId: activeSession.session.id,
      userId: activeSession.user.id,
      displayName,
      isAnonymous,
      isViewOnly,
      ownerId: room.ownerId,
    }
  }
}
