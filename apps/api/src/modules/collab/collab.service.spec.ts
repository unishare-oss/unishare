import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException, ForbiddenException, UnauthorizedException } from '@nestjs/common'
import type { Request, Response } from 'express'
import * as bcrypt from 'bcryptjs'
import { auth } from '@/auth/auth.config'
import { CollabService } from './collab.service'
import { CollabRepository } from './collab.repository'

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2a$10$hashedvalue'),
  compare: jest.fn(),
}))

// Mock auth module — factory must not reference variables declared in outer scope
// (jest.mock is hoisted above variable declarations)
jest.mock('@/auth/auth.config', () => ({
  auth: {
    api: {
      signInAnonymous: jest.fn(),
      getSession: jest.fn(),
    },
  },
}))

jest.mock('better-auth/node', () => ({
  fromNodeHeaders: jest.fn().mockReturnValue(new Headers()),
}))

describe('CollabService', () => {
  let service: CollabService
  let repository: {
    create: jest.Mock
    findBySlug: jest.Mock
    findBySlugWithVisibility: jest.Mock
    updateVisibility: jest.Mock
    findByOwner: jest.Mock
    deleteBySlug: jest.Mock
    updateRoom: jest.Mock
  }

  const mockReq = { headers: {} } as unknown as Request
  const mockRes = { setHeader: jest.fn() } as unknown as Response

  const mockRoom = {
    id: 'room-1',
    slug: 'abc1234567',
    title: null,
    ownerId: 'user-1',
    visibility: 'OPEN',
  }

  const mockAnonSignInResult = {
    response: { token: 'anon-token-xyz', user: { id: 'user-anon-1', name: 'Purple Penguin' } },
    headers: new Headers({ 'set-cookie': 'better-auth.session=xyz' }),
  }

  const mockAnonSessionResult = {
    session: { id: 'sess-anon-1', displayName: null },
    user: { id: 'user-anon-1', name: 'Purple Penguin', isAnonymous: true },
  }

  const mockAuthSession = {
    session: { id: 'sess-auth-1', displayName: null },
    user: { id: 'user-auth-1', name: 'John Doe', isAnonymous: false },
  }

  beforeEach(async () => {
    jest.clearAllMocks()

    repository = {
      create: jest.fn(),
      findBySlug: jest.fn(),
      findBySlugWithVisibility: jest.fn(),
      updateVisibility: jest.fn(),
      findByOwner: jest.fn(),
      deleteBySlug: jest.fn(),
      updateRoom: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [CollabService, { provide: CollabRepository, useValue: repository }],
    }).compile()

    service = module.get<CollabService>(CollabService)
  })

  describe('createRoom', () => {
    it('should call repository.create with ownerId and a 10-char slug', async () => {
      const mockRoom = {
        id: 'room-1',
        slug: 'abc1234567',
        ownerId: 'user-1',
        title: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshot: null,
      }
      repository.create.mockResolvedValue(mockRoom)

      await service.createRoom({ title: undefined }, 'user-1')

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          ownerId: 'user-1',
          slug: expect.stringMatching(/^.{10}$/),
        }),
      )
    })

    it('should pass title to repository when provided', async () => {
      const mockRoom = {
        id: 'room-1',
        slug: 'abc1234567',
        ownerId: 'user-1',
        title: 'Study Session',
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshot: null,
      }
      repository.create.mockResolvedValue(mockRoom)

      await service.createRoom({ title: 'Study Session' }, 'user-1')

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Study Session',
        }),
      )
    })

    it('should generate different slugs on consecutive calls', async () => {
      repository.create.mockResolvedValue({})

      await service.createRoom({}, 'user-1')
      await service.createRoom({}, 'user-1')

      const firstSlug = repository.create.mock.calls[0][0].slug
      const secondSlug = repository.create.mock.calls[1][0].slug
      expect(firstSlug).not.toBe(secondSlug)
    })

    it('should return the created room', async () => {
      const mockRoom = {
        id: 'room-1',
        slug: 'abc1234567',
        ownerId: 'user-1',
        title: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshot: null,
      }
      repository.create.mockResolvedValue(mockRoom)

      const result = await service.createRoom({}, 'user-1')

      expect(result).toBe(mockRoom)
    })
  })

  describe('getRoomBySlug', () => {
    it('should return room when found', async () => {
      const mockRoomFull = {
        id: 'room-1',
        slug: 'abc1234567',
        ownerId: 'user-1',
        title: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshot: null,
        passwordHash: null,
      }
      repository.findBySlug.mockResolvedValue(mockRoomFull)

      const result = await service.getRoomBySlug('abc1234567')

      expect(result.slug).toBe('abc1234567')
      expect(repository.findBySlug).toHaveBeenCalledWith('abc1234567')
    })

    it('should throw NotFoundException when room not found', async () => {
      repository.findBySlug.mockResolvedValue(null)

      await expect(service.getRoomBySlug('nonexistent')).rejects.toThrow(NotFoundException)
    })

    it('should return hasPassword: true when room has passwordHash', async () => {
      repository.findBySlug.mockResolvedValue({
        ...mockRoom,
        passwordHash: '$2a$10$hash',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.getRoomBySlug('abc1234567')

      expect(result.hasPassword).toBe(true)
      expect((result as any).passwordHash).toBeUndefined()
    })

    it('should return hasPassword: false when room has no passwordHash', async () => {
      repository.findBySlug.mockResolvedValue({
        ...mockRoom,
        passwordHash: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const result = await service.getRoomBySlug('abc1234567')

      expect(result.hasPassword).toBe(false)
      expect((result as any).passwordHash).toBeUndefined()
    })
  })

  describe('joinRoom', () => {
    const signInAnonymousMock = auth.api.signInAnonymous as unknown as jest.Mock
    const getSessionMock = auth.api.getSession as unknown as jest.Mock

    it('should call signInAnonymous and return isAnonymous: true when no session', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(mockRoom)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      const result = await service.joinRoom('abc1234567', {}, null, mockReq, mockRes)

      expect(signInAnonymousMock).toHaveBeenCalledTimes(1)
      expect(result.isAnonymous).toBe(true)
    })

    it('should forward set-cookie header when creating anonymous session', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(mockRoom)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      await service.joinRoom('abc1234567', {}, null, mockReq, mockRes)

      expect((mockRes as unknown as { setHeader: jest.Mock }).setHeader).toHaveBeenCalledWith(
        'set-cookie',
        expect.any(String),
      )
    })

    it('should skip signInAnonymous and return existing session when session provided', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(mockRoom)

      const result = await service.joinRoom(
        'abc1234567',
        {},
        mockAuthSession as unknown as import('@/auth/auth.config').UserSession,
        mockReq,
        mockRes,
      )

      expect(signInAnonymousMock).not.toHaveBeenCalled()
      expect(result.userId).toBe('user-auth-1')
    })

    it('should set isViewOnly: true for anonymous user on VIEW_ONLY room', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue({
        ...mockRoom,
        visibility: 'VIEW_ONLY',
      })
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      const result = await service.joinRoom('abc1234567', {}, null, mockReq, mockRes)

      expect(result.isViewOnly).toBe(true)
    })

    it('should set isViewOnly: false for authenticated user on VIEW_ONLY room', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue({
        ...mockRoom,
        visibility: 'VIEW_ONLY',
      })

      const result = await service.joinRoom(
        'abc1234567',
        {},
        mockAuthSession as unknown as import('@/auth/auth.config').UserSession,
        mockReq,
        mockRes,
      )

      expect(result.isViewOnly).toBe(false)
    })

    it('should throw ForbiddenException for anonymous user on PRIVATE room', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue({
        ...mockRoom,
        visibility: 'PRIVATE',
      })
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      await expect(service.joinRoom('abc1234567', {}, null, mockReq, mockRes)).rejects.toThrow(
        ForbiddenException,
      )
    })

    it('should return isViewOnly: false for authenticated user on PRIVATE room', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue({
        ...mockRoom,
        visibility: 'PRIVATE',
      })
      const result = await service.joinRoom(
        'abc1234567',
        {},
        mockAuthSession as unknown as import('@/auth/auth.config').UserSession,
        mockReq,
        mockRes,
      )
      expect(result.isViewOnly).toBe(false)
    })

    it('should throw NotFoundException for nonexistent room', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(null)

      await expect(service.joinRoom('nonexistent', {}, null, mockReq, mockRes)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should return displayName from user.name for anonymous session (set by generateName)', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(mockRoom)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      const result = await service.joinRoom('abc1234567', {}, null, mockReq, mockRes)

      // anonymous user.name is set by generateName callback (generateGuestDisplayName)
      expect(result.displayName).toBe('Purple Penguin')
    })

    it('should return ownerId in joinRoom response', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(mockRoom)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)
      const result = await service.joinRoom('abc1234567', {}, null, mockReq, mockRes)
      expect(result.ownerId).toBe('user-1')
    })

    // --- Password protection tests ---
    const mockRoomWithPassword = {
      id: 'room-1',
      slug: 'abc1234567',
      title: null,
      ownerId: 'user-1',
      visibility: 'OPEN',
      passwordHash: '$2a$10$hashedvalue',
    }

    it('should throw UnauthorizedException when no password supplied on protected room', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(mockRoomWithPassword)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      await expect(service.joinRoom('abc1234567', {}, null, mockReq, mockRes)).rejects.toThrow(
        UnauthorizedException,
      )
    })

    it('should throw UnauthorizedException with "Incorrect password" when wrong password', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(mockRoomWithPassword)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(false)

      await expect(
        service.joinRoom('abc1234567', { password: 'wrong' }, null, mockReq, mockRes),
      ).rejects.toThrow('Incorrect password')
    })

    it('should succeed when correct password supplied on protected room', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(mockRoomWithPassword)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)
      ;(bcrypt.compare as jest.Mock).mockResolvedValue(true)

      const result = await service.joinRoom(
        'abc1234567',
        { password: 'correct' },
        null,
        mockReq,
        mockRes,
      )
      expect(result.roomSlug).toBe('abc1234567')
    })

    it('should skip password check for owner of protected room (D-07)', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(mockRoomWithPassword)
      // Owner session — user.id matches room.ownerId
      const ownerSession = {
        session: { id: 'sess-owner', displayName: null },
        user: { id: 'user-1', name: 'Owner', isAnonymous: false },
      }

      const result = await service.joinRoom(
        'abc1234567',
        {},
        ownerSession as unknown as import('@/auth/auth.config').UserSession,
        mockReq,
        mockRes,
      )
      expect(bcrypt.compare).not.toHaveBeenCalled()
      expect(result.roomSlug).toBe('abc1234567')
    })

    it('should skip password check when body.pwVerified is true (D-22 sentinel)', async () => {
      repository.findBySlugWithVisibility.mockResolvedValue(mockRoomWithPassword)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      const result = await service.joinRoom(
        'abc1234567',
        { pwVerified: true },
        null,
        mockReq,
        mockRes,
      )
      expect(bcrypt.compare).not.toHaveBeenCalled()
      expect(result.roomSlug).toBe('abc1234567')
    })
  })

  describe('updateRoom', () => {
    it('should update visibility when called by owner', async () => {
      repository.findBySlug.mockResolvedValue(mockRoom)
      repository.updateRoom.mockResolvedValue({ ...mockRoom, visibility: 'VIEW_ONLY' })

      const result = await service.updateRoom(
        'abc1234567',
        { visibility: 'VIEW_ONLY' as any },
        'user-1',
      )

      expect(repository.updateRoom).toHaveBeenCalledWith('abc1234567', { visibility: 'VIEW_ONLY' })
      expect(result.visibility).toBe('VIEW_ONLY')
    })

    it('should throw ForbiddenException when called by non-owner', async () => {
      repository.findBySlug.mockResolvedValue(mockRoom)

      await expect(
        service.updateRoom('abc1234567', { visibility: 'PRIVATE' as any }, 'user-999'),
      ).rejects.toThrow(ForbiddenException)
    })

    it('should throw NotFoundException when room not found', async () => {
      repository.findBySlug.mockResolvedValue(null)

      await expect(
        service.updateRoom('nonexistent', { visibility: 'OPEN' as any }, 'user-1'),
      ).rejects.toThrow(NotFoundException)
    })
  })

  describe('getRoomsByOwner', () => {
    it('should call repository.findByOwner with the ownerId', async () => {
      repository.findByOwner.mockResolvedValue([
        { ...mockRoom, passwordHash: null, createdAt: new Date(), updatedAt: new Date() },
      ])

      await service.getRoomsByOwner('user-1')

      expect(repository.findByOwner).toHaveBeenCalledWith('user-1')
    })

    it('should return the array from repository.findByOwner', async () => {
      repository.findByOwner.mockResolvedValue([
        { ...mockRoom, passwordHash: null, createdAt: new Date(), updatedAt: new Date() },
      ])

      const result = await service.getRoomsByOwner('user-1')

      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('abc1234567')
    })

    it('should return hasPassword on each room', async () => {
      repository.findByOwner.mockResolvedValue([
        { ...mockRoom, passwordHash: '$2a$10$hash', createdAt: new Date(), updatedAt: new Date() },
        {
          ...mockRoom,
          slug: 'xyz',
          passwordHash: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])

      const result = await service.getRoomsByOwner('user-1')

      expect(result[0].hasPassword).toBe(true)
      expect(result[1].hasPassword).toBe(false)
      expect((result[0] as any).passwordHash).toBeUndefined()
    })
  })

  describe('deleteRoom', () => {
    it('should throw NotFoundException when room not found', async () => {
      repository.findBySlug.mockResolvedValue(null)

      await expect(service.deleteRoom('abc1234567', 'user-1')).rejects.toThrow(NotFoundException)
    })

    it('should throw ForbiddenException when caller is not room owner', async () => {
      repository.findBySlug.mockResolvedValue(mockRoom)

      await expect(service.deleteRoom('abc1234567', 'user-999')).rejects.toThrow(ForbiddenException)
    })

    it('should call repository.deleteBySlug when caller is owner', async () => {
      repository.findBySlug.mockResolvedValue(mockRoom)
      repository.deleteBySlug.mockResolvedValue(undefined)

      await service.deleteRoom('abc1234567', 'user-1')

      expect(repository.deleteBySlug).toHaveBeenCalledWith('abc1234567')
    })
  })

  describe('updateRoom with title', () => {
    it('should call repository.updateRoom with title only when dto has only title', async () => {
      repository.findBySlug.mockResolvedValue(mockRoom)
      repository.updateRoom.mockResolvedValue({ ...mockRoom, title: 'New Title' })

      await service.updateRoom('abc1234567', { title: 'New Title' }, 'user-1')

      expect(repository.updateRoom).toHaveBeenCalledWith('abc1234567', { title: 'New Title' })
    })

    it('should call repository.updateRoom with both title and visibility when both present', async () => {
      repository.findBySlug.mockResolvedValue(mockRoom)
      repository.updateRoom.mockResolvedValue({ ...mockRoom, title: 'New', visibility: 'PRIVATE' })

      await service.updateRoom(
        'abc1234567',
        { title: 'New', visibility: 'PRIVATE' as any },
        'user-1',
      )

      expect(repository.updateRoom).toHaveBeenCalledWith('abc1234567', {
        title: 'New',
        visibility: 'PRIVATE',
      })
    })

    it('should return existing room without calling repository.updateRoom when dto is empty', async () => {
      repository.findBySlug.mockResolvedValue(mockRoom)

      const result = await service.updateRoom('abc1234567', {}, 'user-1')

      expect(repository.updateRoom).not.toHaveBeenCalled()
      expect(result.slug).toBe(mockRoom.slug)
      expect(result.ownerId).toBe(mockRoom.ownerId)
    })

    it('should hash password and pass passwordHash to repository when dto.password is a string', async () => {
      repository.findBySlug.mockResolvedValue(mockRoom)
      repository.updateRoom.mockResolvedValue({ ...mockRoom, passwordHash: '$2a$10$hashedvalue' })

      await service.updateRoom('abc1234567', { password: 'secret' }, 'user-1')

      expect(bcrypt.hash).toHaveBeenCalledWith('secret', 10)
      expect(repository.updateRoom).toHaveBeenCalledWith('abc1234567', {
        passwordHash: '$2a$10$hashedvalue',
      })
    })

    it('should pass passwordHash: null to repository when dto.password is null', async () => {
      repository.findBySlug.mockResolvedValue(mockRoom)
      repository.updateRoom.mockResolvedValue({ ...mockRoom, passwordHash: null })

      await service.updateRoom('abc1234567', { password: null }, 'user-1')

      expect(repository.updateRoom).toHaveBeenCalledWith('abc1234567', { passwordHash: null })
    })
  })
})
