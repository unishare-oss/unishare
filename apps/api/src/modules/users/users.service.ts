import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FollowsService } from '../follows/follows.service'
import { UsersRepository } from './users.repository'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'

@Injectable()
export class UsersService {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly config: ConfigService,
    private readonly followsService: FollowsService,
  ) {}

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

  async updateAcademicProfile(id: string, dto: UpdateAcademicProfileDto) {
    if (dto.departmentId === undefined && dto.enrollmentYear === undefined) {
      throw new BadRequestException(
        'At least one field is required: departmentId or enrollmentYear',
      )
    }

    if (dto.departmentId !== undefined && dto.departmentId !== null) {
      const department = await this.usersRepository.findDepartmentById(dto.departmentId)
      if (!department) throw new NotFoundException('Department not found')
    }

    const user = await this.usersRepository.updateAcademicProfile(id, dto)
    return this.toProfileView(user)
  }

  private toProfileView(
    user: {
      enrollmentYear: number | null
      departmentId?: string | null
      _count?: { posts: number; comments: number; savedPosts: number }
      [key: string]: unknown
    },
    followerCount = 0,
    followingCount = 0,
    isFollowing: boolean | null = null,
  ) {
    const { _count, departmentId, ...rest } = user

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
    const now = new Date()
    const currentAcademicYear =
      now.getMonth() + 1 >= academicStartMonth ? now.getFullYear() : now.getFullYear() - 1
    const yearLevel = Math.max(1, currentAcademicYear - user.enrollmentYear + 1)

    return { ...base, yearLevel }
  }
}
