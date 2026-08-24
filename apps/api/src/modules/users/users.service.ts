import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@/prisma/prisma.service'
import { computeYearLevel } from '@/common/utils/academic-year'
import { FollowsService } from '../follows/follows.service'
import { ChatService } from '../chat/chat.service'
import { UsersRepository } from './users.repository'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly followsService: FollowsService,
    private readonly chatService: ChatService,
  ) {}

  async exportData(id: string) {
    return this.usersRepository.exportData(id)
  }

  async findById(id: string, viewerId?: string) {
    const user = await this.usersRepository.findById(id)
    if (!user) throw new NotFoundException('User not found')
    const [followerCount, followingCount, isFollowing] = await Promise.all([
      this.followsService.countFollowers(id),
      this.followsService.countFollowing(id),
      viewerId && viewerId !== id ? this.followsService.isFollowing(viewerId, id) : null,
    ])
    return this.toProfileView(user, followerCount, followingCount, isFollowing)
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.usersRepository.updateProfile(id, dto)
    return this.toProfileView(user)
  }

  async updatePublicKey(id: string, publicKey: string) {
    return this.usersRepository.updatePublicKey(id, publicKey)
  }

  async clearMyKeys(id: string) {
    const [groupRooms, user] = await Promise.all([
      this.chatService.getGroupRoomIds(id),
      this.usersRepository.findById(id),
    ])

    await this.prisma.$transaction(async (tx) => {
      await this.usersRepository.deleteDmRooms(id, tx)
      await this.usersRepository.leaveGroupRooms(id, tx)
      await this.usersRepository.clearPublicKey(id, tx)
    })

    if (groupRooms.length > 0 && user?.name) {
      await this.chatService.notifyKeyRemoval(
        groupRooms.map((r) => r.id),
        user.name,
      )
    }
  }

  async clearAllPublicKeys() {
    return this.usersRepository.clearAllPublicKeys()
  }

  async getPublicKey(id: string) {
    const user = await this.usersRepository.findPublicKey(id)
    if (!user) throw new NotFoundException('User not found')
    return user
  }

  async updateKeyBackup(id: string, keyBackup: string) {
    return this.usersRepository.updateKeyBackup(id, keyBackup)
  }

  async getKeyBackup(id: string) {
    const user = await this.usersRepository.findKeyBackup(id)
    if (!user) throw new NotFoundException('User not found')
    return { keyBackup: user.keyBackup }
  }

  async clearKeyBackup(id: string) {
    return this.usersRepository.clearKeyBackup(id)
  }

  async updateAcademicProfile(id: string, dto: UpdateAcademicProfileDto) {
    if (
      dto.departmentId === undefined &&
      dto.enrollmentYear === undefined &&
      dto.universityId === undefined
    ) {
      throw new BadRequestException(
        'At least one field is required: departmentId, universityId or enrollmentYear',
      )
    }

    if (dto.departmentId !== undefined && dto.departmentId !== null) {
      const department = await this.usersRepository.findDepartmentById(dto.departmentId)
      if (!department) throw new NotFoundException('Department not found')
    }

    if (dto.universityId !== undefined && dto.universityId !== null) {
      const university = await this.usersRepository.findUniversityById(dto.universityId)
      if (!university) throw new NotFoundException('University not found')
    }

    const user = await this.usersRepository.updateAcademicProfile(id, dto)
    return this.toProfileView(user)
  }

  private toProfileView(
    user: {
      enrollmentYear: number | null
      departmentId?: string | null
      universityId?: string | null
      _count?: { posts: number; comments: number; savedPosts: number }
      [key: string]: unknown
    },
    followerCount = 0,
    followingCount = 0,
    isFollowing: boolean | null = null,
  ) {
    const { _count, departmentId, universityId, ...rest } = user

    const shouldShowUpdateMajorPopup = !departmentId || user.enrollmentYear === null
    const base = {
      ...rest,
      shouldShowUpdateMajorPopup,
      postCount: _count?.posts ?? 0,
      commentCount: _count?.comments ?? 0,
      savedCount: _count?.savedPosts ?? 0,
      followerCount,
      followingCount,
      isFollowing,
    }

    if (user.enrollmentYear === null) {
      return { ...base, yearLevel: null }
    }

    const academicStartMonth = this.config.get<number>('ACADEMIC_START_MONTH', 9)
    const yearLevel = computeYearLevel(user.enrollmentYear, new Date(), academicStartMonth)

    return { ...base, yearLevel }
  }
}
