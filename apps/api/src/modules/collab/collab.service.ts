import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common'
import { nanoid } from 'nanoid'
import { fromNodeHeaders } from 'better-auth/node'
import * as bcrypt from 'bcryptjs'
import type { Request, Response } from 'express'
import { RoomVisibility } from '@/generated/prisma/client'
import { auth, type UserSession } from '@/auth/auth.config'
import { CollabRepository } from './collab.repository'
import { CreateRoomDto } from './dto/create-room.dto'
import { UpdateRoomDto } from './dto/update-room.dto'
import { JoinRoomBodyDto } from './dto/join-room-body.dto'
import { RoomEntity } from './entities/room.entity'

@Injectable()
export class CollabService {
  constructor(private readonly collabRepository: CollabRepository) {}

  async createRoom(dto: CreateRoomDto, ownerId: string) {
    const slug = nanoid(10)
    const passwordHash = dto.password ? await bcrypt.hash(dto.password, 10) : undefined
    const room = await this.collabRepository.create({
      slug,
      ownerId,
      title: dto.title,
      visibility: dto.visibility,
      passwordHash,
    })
    return this.toRoomResponse(room)
  }

  async getRoomBySlug(slug: string) {
    const room = await this.collabRepository.findBySlug(slug)
    if (!room) throw new NotFoundException('Room not found')
    return this.toRoomResponse(room)
  }

  async getRoomsByOwner(ownerId: string) {
    const rooms = await this.collabRepository.findByOwner(ownerId)
    return rooms.map((room) => this.toRoomResponse(room))
  }

  async deleteRoom(slug: string, userId: string) {
    const room = await this.collabRepository.findBySlug(slug)
    if (!room) throw new NotFoundException('Room not found')
    if (room.ownerId !== userId)
      throw new ForbiddenException('Only the room owner can delete this room')
    await this.collabRepository.deleteBySlug(slug)
  }

  async updateRoom(slug: string, dto: UpdateRoomDto, userId: string) {
    const room = await this.collabRepository.findBySlug(slug)
    if (!room) throw new NotFoundException('Room not found')
    if (room.ownerId !== userId)
      throw new ForbiddenException('Only the room owner can update settings')
    const updateData: {
      title?: string
      visibility?: RoomVisibility
      passwordHash?: string | null
    } = {}
    if (dto.visibility !== undefined) updateData.visibility = dto.visibility
    if (dto.title !== undefined) updateData.title = dto.title
    if (dto.password !== undefined) {
      if (dto.password === null) {
        updateData.passwordHash = null
      } else {
        updateData.passwordHash = await bcrypt.hash(dto.password, 10)
      }
    }
    if (Object.keys(updateData).length === 0) return this.toRoomResponse(room)
    const updated = await this.collabRepository.updateRoom(slug, updateData)
    return this.toRoomResponse(updated)
  }

  async joinRoom(
    slug: string,
    body: JoinRoomBodyDto,
    session: UserSession | null,
    req: Request,
    res: Response,
  ) {
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

      // Retrieve the full session using the cookie that was just set.
      // The set-cookie value contains the session token — use it directly so
      // getSession doesn't rely on a Bearer token field that may be absent.
      const cookieMatch = setCookieHeader?.match(
        /((?:__Secure-)?better-auth\.session_token=[^;,]+)/,
      )
      const anonSession = await auth.api.getSession({
        headers: new Headers({
          cookie: cookieMatch?.[1] ?? '',
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

    // Password protection — check AFTER visibility (PRIVATE takes precedence per D-04)
    if (
      room.passwordHash !== null &&
      room.passwordHash !== undefined &&
      activeSession.user.id !== room.ownerId
    ) {
      if (body.pwVerified === true) {
        // Sentinel from sessionStorage — tab already verified password (D-22)
      } else if (!body.password) {
        throw new UnauthorizedException('Password required')
      } else {
        const passwordValid = await bcrypt.compare(body.password, room.passwordHash)
        if (!passwordValid) {
          throw new UnauthorizedException('Incorrect password')
        }
      }
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

  private toRoomResponse(room: Record<string, unknown>): RoomEntity {
    const { passwordHash, ...rest } = room as Record<string, unknown> & {
      passwordHash?: string | null
    }
    return {
      ...(rest as Omit<RoomEntity, 'hasPassword'>),
      hasPassword: passwordHash !== null && passwordHash !== undefined,
    }
  }
}
