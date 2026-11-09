import {
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@/prisma/prisma.service'
import { computeYearLevel } from '@/common/utils/academic-year'
import { FollowsService } from '../follows/follows.service'
import { ChatService } from '../chat/chat.service'
import { AuditService } from '../audit/audit.service'
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
    private readonly audit: AuditService,
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
    return this.toProfileView(user, viewerId === id, followerCount, followingCount, isFollowing)
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    // Name and avatar are the uniauth identity's, refreshed at every sign-in, and edited on
    // uniauth's /account page. Only unishare-owned fields change here.
    const user = await this.usersRepository.updateProfile(id, { bio: dto.bio })
    return this.toProfileView(user, true)
  }

  /** Compatibility endpoint: shared acceptance can only be recorded by UniAuth. */
  async giveConsent(id: string) {
    const user = await this.usersRepository.findById(id)
    if (user?.unicorpTermsVersion !== 1 || !user.unicorpTermsAcceptedAt)
      throw new ForbiddenException({
        code: 'consent_required',
        message: 'Complete shared Unicorp terms through UniAuth',
      })
  }

  /** Chat keys: guests can't chat, so they get none. */
  async updatePublicKey(
    { id, isAnonymous }: { id: string; isAnonymous?: boolean | null },
    publicKey: string,
  ) {
    if (isAnonymous) throw new ForbiddenException("Guests can't chat")
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

  async updateKeyBackup(
    { id, isAnonymous }: { id: string; isAnonymous?: boolean | null },
    keyBackup: string,
  ) {
    if (isAnonymous) throw new ForbiddenException("Guests can't chat")
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

  /** A guest picks the one university it browses, once; members get theirs from uniauth. */
  async setGuestUniversity(
    user: { id: string; isAnonymous?: boolean | null },
    universityId: string,
  ) {
    if (!user.isAnonymous) throw new ForbiddenException('Only guests pick a university here')
    const university = await this.usersRepository.findUniversityById(universityId)
    if (!university) throw new NotFoundException('University not found')
    const updated = await this.usersRepository.setGuestUniversityIfUnset(user.id, universityId)
    if (!updated) throw new ConflictException('You already picked a university')
    return this.toProfileView(updated, true)
  }

  async updateAcademicProfile(
    { id, isAnonymous }: { id: string; isAnonymous?: boolean | null },
    dto: UpdateAcademicProfileDto,
  ) {
    // A department is what lets someone post (PostsService.create), and guests are read-only.
    if (isAnonymous) throw new ForbiddenException('Guests have no academic profile')
    const { universityId, ...data } = dto
    if (universityId !== undefined) {
      throw new BadRequestException('University comes from your uniauth account')
    }
    if (data.departmentId === undefined && data.enrollmentYear === undefined) {
      throw new BadRequestException(
        'At least one field is required: departmentId or enrollmentYear',
      )
    }

    // The university the department was checked against; the write only applies if it still holds
    let expected: { universityId: string } | undefined
    if (data.departmentId) {
      const department = await this.usersRepository.findDepartmentById(data.departmentId)
      if (!department) throw new NotFoundException('Department not found')

      const stored = (await this.usersRepository.findAcademicProfileOfUser(id))?.universityId
      if (!stored || department.faculty.universityId !== stored) {
        throw new BadRequestException('Department is not in your university')
      }
      expected = { universityId: stored }
    }

    const user = expected
      ? await this.usersRepository.updateAcademicProfileIf(id, expected, data)
      : await this.usersRepository.updateAcademicProfile(id, data)
    if (!user) throw new ConflictException('Your profile changed while saving. Try again.')
    return this.toProfileView(user, true)
  }

  /**
   * The profile fields UserProfileEntity documents, picked one by one: the row also holds the
   * chat key backup, ban and terms state, which must never reach a response, and GET /users/:id
   * shows any member's profile to any other, so the email is only on the viewer's own.
   */
  private toProfileView(
    user: {
      id: string
      name: string
      email: string
      emailVerified: boolean
      image: string | null
      bio: string | null
      role: string
      createdAt: Date
      publicKey: string | null
      enrollmentYear: number | null
      departmentId?: string | null
      department?: unknown
      university?: unknown
      _count?: { posts: number; comments: number; savedPosts: number }
    },
    /** The viewer's own profile: only then are the email fields included. */
    self: boolean,
    followerCount = 0,
    followingCount = 0,
    isFollowing: boolean | null = null,
  ) {
    const shouldShowUpdateMajorPopup = !user.departmentId || user.enrollmentYear === null
    const base = {
      id: user.id,
      name: user.name,
      ...(self && { email: user.email, emailVerified: user.emailVerified }),
      image: user.image,
      bio: user.bio,
      role: user.role,
      department: user.department ?? null,
      university: user.university ?? null,
      enrollmentYear: user.enrollmentYear,
      createdAt: user.createdAt,
      publicKey: user.publicKey,
      shouldShowUpdateMajorPopup,
      postCount: user._count?.posts ?? 0,
      commentCount: user._count?.comments ?? 0,
      savedCount: user._count?.savedPosts ?? 0,
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
