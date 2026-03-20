import { Injectable, NotFoundException } from '@nestjs/common'
import { nanoid } from 'nanoid'
import { CollabRepository } from './collab.repository'
import { CreateRoomDto } from './dto/create-room.dto'

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
}
