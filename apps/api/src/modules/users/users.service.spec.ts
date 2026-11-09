import { Test } from '@nestjs/testing'
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '@/prisma/prisma.service'
import { FollowsService } from '../follows/follows.service'
import { ChatService } from '../chat/chat.service'
import { AuditService } from '../audit/audit.service'
import { UsersService } from './users.service'
import { UsersRepository } from './users.repository'
import { postInScope, universityScope } from '@/common/university-scope'

describe('UsersService — updateAcademicProfile', () => {
  let service: UsersService
  const member = { id: 'user1', isAnonymous: false }
  let repo: {
    findDepartmentById: jest.Mock
    findAcademicProfileOfUser: jest.Mock
    updateAcademicProfile: jest.Mock
    updateAcademicProfileIf: jest.Mock
  }

  beforeEach(async () => {
    repo = {
      findDepartmentById: jest
        .fn()
        .mockResolvedValue({ id: 'd1', faculty: { universityId: 'u1' } }),
      findAcademicProfileOfUser: jest.fn().mockResolvedValue({ universityId: 'u1' }),
      updateAcademicProfile: jest.fn((id, dto) =>
        Promise.resolve({ id, enrollmentYear: null, ...dto }),
      ),
      updateAcademicProfileIf: jest.fn((id, _expected, dto) =>
        Promise.resolve({ id, enrollmentYear: null, ...dto }),
      ),
    }

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repo },
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: FollowsService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile()

    service = module.get(UsersService)
  })

  it("saves a department from the user's own university", async () => {
    await service.updateAcademicProfile(member, { departmentId: 'd1' })
    expect(repo.updateAcademicProfileIf).toHaveBeenCalledWith(
      'user1',
      { universityId: 'u1' },
      { departmentId: 'd1' },
    )
  })

  it('409s when the stored university changed before the department was written', async () => {
    repo.updateAcademicProfileIf.mockResolvedValue(null)
    await expect(service.updateAcademicProfile(member, { departmentId: 'd1' })).rejects.toThrow(
      ConflictException,
    )
  })

  it('rejects a department from another university with 400', async () => {
    repo.findAcademicProfileOfUser.mockResolvedValue({ universityId: 'u2' })
    await expect(service.updateAcademicProfile(member, { departmentId: 'd1' })).rejects.toThrow(
      BadRequestException,
    )
    expect(repo.updateAcademicProfileIf).not.toHaveBeenCalled()
  })

  it('rejects a department when the user has no university', async () => {
    repo.findAcademicProfileOfUser.mockResolvedValue({ universityId: null })
    await expect(service.updateAcademicProfile(member, { departmentId: 'd1' })).rejects.toThrow(
      BadRequestException,
    )
  })

  it('400s on a universityId, which only uniauth sets', async () => {
    for (const universityId of ['u1', null]) {
      await expect(
        service.updateAcademicProfile(member, { departmentId: 'd1', universityId }),
      ).rejects.toThrow('University comes from your uniauth account')
    }
    expect(repo.updateAcademicProfile).not.toHaveBeenCalled()
    expect(repo.updateAcademicProfileIf).not.toHaveBeenCalled()
  })

  it('403s for a guest, who must not get a department (and with it, posting)', async () => {
    await expect(
      service.updateAcademicProfile({ id: 'guest1', isAnonymous: true }, { departmentId: 'd1' }),
    ).rejects.toThrow(ForbiddenException)
    expect(repo.findDepartmentById).not.toHaveBeenCalled()
    expect(repo.updateAcademicProfile).not.toHaveBeenCalled()
    expect(repo.updateAcademicProfileIf).not.toHaveBeenCalled()
  })

  it('saves only the enrollment year without reading the university', async () => {
    await service.updateAcademicProfile(member, { enrollmentYear: 2024 })
    expect(repo.findAcademicProfileOfUser).not.toHaveBeenCalled()
    expect(repo.updateAcademicProfile).toHaveBeenCalledWith('user1', { enrollmentYear: 2024 })
  })
})

describe('UsersService — setGuestUniversity', () => {
  let service: UsersService
  let repo: { findUniversityById: jest.Mock; setGuestUniversityIfUnset: jest.Mock }
  const guest = { id: 'guest1', isAnonymous: true }

  beforeEach(async () => {
    repo = {
      findUniversityById: jest.fn().mockResolvedValue({ id: 'u1' }),
      setGuestUniversityIfUnset: jest.fn((id, universityId) =>
        Promise.resolve({ id, enrollmentYear: null, universityId, role: 'STUDENT' }),
      ),
    }
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repo },
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: FollowsService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile()
    service = module.get(UsersService)
  })

  it("sets a guest's university, which then scopes its reads to that university", async () => {
    await service.setGuestUniversity(guest, 'u1')
    expect(repo.setGuestUniversityIfUnset).toHaveBeenCalledWith('guest1', 'u1')

    // The stored university is what the session carries next request.
    const stored = await repo.setGuestUniversityIfUnset.mock.results[0].value
    const scope = universityScope(stored)
    expect(scope).toEqual({ kind: 'university', universityId: 'u1' })
    expect(postInScope(scope)).toEqual({
      course: { department: { faculty: { universityId: 'u1' } } },
    })
  })

  it('409s when the guest already picked one', async () => {
    repo.setGuestUniversityIfUnset.mockResolvedValue(null)
    await expect(service.setGuestUniversity(guest, 'u1')).rejects.toThrow(ConflictException)
  })

  it('404s on an unknown university without writing', async () => {
    repo.findUniversityById.mockResolvedValue(null)
    await expect(service.setGuestUniversity(guest, 'nope')).rejects.toThrow(NotFoundException)
    expect(repo.setGuestUniversityIfUnset).not.toHaveBeenCalled()
  })

  it('403s for a member, whose university comes from uniauth', async () => {
    for (const isAnonymous of [false, null, undefined]) {
      await expect(service.setGuestUniversity({ id: 'user1', isAnonymous }, 'u1')).rejects.toThrow(
        ForbiddenException,
      )
    }
    expect(repo.findUniversityById).not.toHaveBeenCalled()
    expect(repo.setGuestUniversityIfUnset).not.toHaveBeenCalled()
  })
})

describe('UsersService — findById', () => {
  const row = {
    id: 'u1',
    name: 'Ada',
    email: 'ada@example.com',
    emailVerified: true,
    image: null,
    bio: 'hi',
    role: 'STUDENT',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-01'),
    publicKey: 'pub',
    keyBackup: 'wrapped-private-key',
    banned: true,
    banReason: 'spam',
    banExpires: new Date('2030-01-01'),
    isAnonymous: false,
    consentGivenAt: new Date(),
    unicorpTermsVersion: 1,
    unicorpTermsAcceptedAt: new Date(),
    identityVersion: 3,
    identityStatus: 'active',
    enrollmentYear: null,
    departmentId: 'd1',
    universityId: 'uni1',
    department: { id: 'd1', name: 'CS', code: 'CS' },
    university: { id: 'uni1', name: 'MFU', shortName: 'MFU', logoUrl: null },
    _count: { posts: 2, comments: 3, savedPosts: 4 },
  }

  const makeService = async () => {
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: { findById: jest.fn().mockResolvedValue(row) } },
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        {
          provide: FollowsService,
          useValue: {
            countFollowers: jest.fn().mockResolvedValue(5),
            countFollowing: jest.fn().mockResolvedValue(6),
            isFollowing: jest.fn().mockResolvedValue(true),
          },
        },
        { provide: ChatService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile()
    return module.get(UsersService)
  }

  it("returns only the documented fields of another user's profile: no email, key backup, ban or terms state", async () => {
    const view = await (await makeService()).findById('u1', 'viewer')

    expect(Object.keys(view).sort()).toEqual(
      [
        'id',
        'name',
        'image',
        'bio',
        'role',
        'department',
        'university',
        'enrollmentYear',
        'createdAt',
        'publicKey',
        'shouldShowUpdateMajorPopup',
        'postCount',
        'commentCount',
        'savedCount',
        'followerCount',
        'followingCount',
        'isFollowing',
        'yearLevel',
      ].sort(),
    )
    expect(view).not.toHaveProperty('keyBackup')
    expect(view).not.toHaveProperty('email')
    expect(view).toMatchObject({ postCount: 2, followerCount: 5, isFollowing: true })
  })

  it("includes the email only on the viewer's own profile", async () => {
    const view = await (await makeService()).findById('u1', 'u1')
    expect(view).toMatchObject({ email: 'ada@example.com', emailVerified: true, isFollowing: null })
  })
})

describe('UsersService — chat keys', () => {
  let service: UsersService
  let repo: { updatePublicKey: jest.Mock; updateKeyBackup: jest.Mock }

  beforeEach(async () => {
    repo = { updatePublicKey: jest.fn(), updateKeyBackup: jest.fn() }
    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: UsersRepository, useValue: repo },
        { provide: PrismaService, useValue: {} },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: FollowsService, useValue: {} },
        { provide: ChatService, useValue: {} },
        { provide: AuditService, useValue: {} },
      ],
    }).compile()
    service = module.get(UsersService)
  })

  it('403s a guest storing a public key or key backup: guests cannot chat', async () => {
    const guest = { id: 'g1', isAnonymous: true }
    await expect(service.updatePublicKey(guest, 'pub')).rejects.toThrow(ForbiddenException)
    await expect(service.updateKeyBackup(guest, 'backup')).rejects.toThrow(ForbiddenException)
    expect(repo.updatePublicKey).not.toHaveBeenCalled()
    expect(repo.updateKeyBackup).not.toHaveBeenCalled()
  })

  it("stores a member's keys", async () => {
    const member = { id: 'u1', isAnonymous: false }
    await service.updatePublicKey(member, 'pub')
    await service.updateKeyBackup(member, 'backup')
    expect(repo.updatePublicKey).toHaveBeenCalledWith('u1', 'pub')
    expect(repo.updateKeyBackup).toHaveBeenCalledWith('u1', 'backup')
  })
})
