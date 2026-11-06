import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateAcademicProfileDto } from './dto/update-academic-profile.dto'
import { Prisma } from '@/generated/prisma/client'

/** The academic profile fields a member may write (the university comes from uniauth). */
type AcademicProfileData = Omit<UpdateAcademicProfileDto, 'universityId'>

@Injectable()
export class UsersRepository {
  constructor(private readonly prisma: PrismaService) {}

  private readonly countInclude = {
    department: true,
    university: { select: { id: true, name: true, shortName: true, logoUrl: true } },
    _count: {
      select: {
        posts: { where: { deletedAt: null, status: 'APPROVED', isAnonymous: false } },
        comments: { where: { deletedAt: null } },
        savedPosts: true,
      },
    },
  } as const

  exportData(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        bio: true,
        image: true,
        enrollmentYear: true,
        createdAt: true,
        consentGivenAt: true,
        unicorpTermsVersion: true,
        unicorpTermsAcceptedAt: true,
        department: { select: { id: true, name: true } },
        posts: {
          where: { deletedAt: null },
          select: {
            id: true,
            title: true,
            description: true,
            type: true,
            status: true,
            createdAt: true,
            course: { select: { id: true, name: true, code: true } },
          },
        },
        comments: {
          where: { deletedAt: null },
          select: { id: true, content: true, postId: true, createdAt: true },
        },
        reactions: {
          select: { postId: true, type: true },
        },
        savedPosts: {
          select: { postId: true, savedAt: true },
        },
        following: {
          select: { following: { select: { id: true, name: true } }, createdAt: true },
        },
        followers: {
          select: { follower: { select: { id: true, name: true } }, createdAt: true },
        },
        readingLists: {
          select: {
            id: true,
            name: true,
            createdAt: true,
            posts: { select: { postId: true, addedAt: true } },
          },
        },
        postRequests: {
          select: { id: true, title: true, description: true, createdAt: true },
        },
      },
    })
  }

  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      include: this.countInclude,
    })
  }

  updateProfile(id: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: this.countInclude,
    })
  }

  findDepartmentById(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
      select: { id: true, faculty: { select: { universityId: true } } },
    })
  }

  findAcademicProfileOfUser(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { universityId: true },
    })
  }

  /**
   * Writes only while the user's stored university still equals `expected`, so a concurrent
   * university change can't pair a department with another university. Null when it changed.
   */
  updateAcademicProfileIf(
    id: string,
    expected: { universityId: string },
    dto: AcademicProfileData,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({ where: { id, ...expected }, data: dto })
      if (count === 0) return null
      return tx.user.findUnique({ where: { id }, include: this.countInclude })
    })
  }

  updateAcademicProfile(id: string, dto: AcademicProfileData) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      include: this.countInclude,
    })
  }

  findUniversityById(id: string) {
    return this.prisma.university.findUnique({ where: { id }, select: { id: true } })
  }

  /** Sets a guest's university only while it has none. Null when it already had one. */
  setGuestUniversityIfUnset(id: string, universityId: string) {
    return this.prisma.$transaction(async (tx) => {
      const { count } = await tx.user.updateMany({
        where: { id, isAnonymous: true, universityId: null },
        data: { universityId },
      })
      if (count === 0) return null
      return tx.user.findUnique({ where: { id }, include: this.countInclude })
    })
  }

  updatePublicKey(id: string, publicKey: string) {
    return this.prisma.user.update({
      where: { id },
      data: { publicKey },
      select: { id: true, publicKey: true },
    })
  }

  findPublicKey(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { id: true, publicKey: true },
    })
  }

  deleteDmRooms(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.chatRoom.deleteMany({
      where: { type: 'DM', participants: { some: { userId: id } } },
    })
  }

  leaveGroupRooms(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.chatRoomParticipant.deleteMany({
      where: { userId: id, room: { type: 'GROUP' } },
    })
  }

  clearPublicKey(id: string, tx: Prisma.TransactionClient = this.prisma) {
    return tx.user.update({
      where: { id },
      data: { publicKey: null, keyBackup: null },
      select: { id: true },
    })
  }

  clearAllPublicKeys() {
    return this.prisma.user.updateMany({
      where: { publicKey: { not: null } },
      data: { publicKey: null, keyBackup: null },
    })
  }

  updateKeyBackup(id: string, keyBackup: string) {
    return this.prisma.user.update({
      where: { id },
      data: { keyBackup },
      select: { id: true },
    })
  }

  findKeyBackup(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: { keyBackup: true },
    })
  }

  clearKeyBackup(id: string) {
    return this.prisma.user.update({
      where: { id },
      data: { keyBackup: null },
      select: { id: true },
    })
  }
}
