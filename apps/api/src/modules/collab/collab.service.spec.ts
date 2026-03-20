import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import type { Request, Response } from 'express'
import { auth } from '@/auth/auth.config'
import { CollabService } from './collab.service'
import { CollabRepository } from './collab.repository'

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
    findBySlugWithGuestFlag: jest.Mock
  }

  const mockReq = { headers: {} } as unknown as Request
  const mockRes = { setHeader: jest.fn() } as unknown as Response

  const mockRoom = {
    id: 'room-1',
    slug: 'abc1234567',
    title: null,
    ownerId: 'user-1',
    isGuestEditingAllowed: true,
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
      findBySlugWithGuestFlag: jest.fn(),
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
      const mockRoom = {
        id: 'room-1',
        slug: 'abc1234567',
        ownerId: 'user-1',
        title: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        snapshot: null,
      }
      repository.findBySlug.mockResolvedValue(mockRoom)

      const result = await service.getRoomBySlug('abc1234567')

      expect(result).toBe(mockRoom)
      expect(repository.findBySlug).toHaveBeenCalledWith('abc1234567')
    })

    it('should throw NotFoundException when room not found', async () => {
      repository.findBySlug.mockResolvedValue(null)

      await expect(service.getRoomBySlug('nonexistent')).rejects.toThrow(NotFoundException)
    })
  })

  describe('joinRoom', () => {
    const signInAnonymousMock = auth.api.signInAnonymous as jest.Mock
    const getSessionMock = auth.api.getSession as jest.Mock

    it('should call signInAnonymous and return isAnonymous: true when no session', async () => {
      repository.findBySlugWithGuestFlag.mockResolvedValue(mockRoom)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      const result = await service.joinRoom('abc1234567', null, mockReq, mockRes)

      expect(signInAnonymousMock).toHaveBeenCalledTimes(1)
      expect(result.isAnonymous).toBe(true)
    })

    it('should forward set-cookie header when creating anonymous session', async () => {
      repository.findBySlugWithGuestFlag.mockResolvedValue(mockRoom)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      await service.joinRoom('abc1234567', null, mockReq, mockRes)

      expect((mockRes as unknown as { setHeader: jest.Mock }).setHeader).toHaveBeenCalledWith(
        'set-cookie',
        expect.any(String),
      )
    })

    it('should skip signInAnonymous and return existing session when session provided', async () => {
      repository.findBySlugWithGuestFlag.mockResolvedValue(mockRoom)

      const result = await service.joinRoom(
        'abc1234567',
        mockAuthSession as unknown as import('@/auth/auth.config').UserSession,
        mockReq,
        mockRes,
      )

      expect(signInAnonymousMock).not.toHaveBeenCalled()
      expect(result.userId).toBe('user-auth-1')
    })

    it('should set isViewOnly: true for anonymous user when editing is disabled', async () => {
      repository.findBySlugWithGuestFlag.mockResolvedValue({
        ...mockRoom,
        isGuestEditingAllowed: false,
      })
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      const result = await service.joinRoom('abc1234567', null, mockReq, mockRes)

      expect(result.isViewOnly).toBe(true)
    })

    it('should set isViewOnly: false for authenticated user when editing is disabled', async () => {
      repository.findBySlugWithGuestFlag.mockResolvedValue({
        ...mockRoom,
        isGuestEditingAllowed: false,
      })

      const result = await service.joinRoom(
        'abc1234567',
        mockAuthSession as unknown as import('@/auth/auth.config').UserSession,
        mockReq,
        mockRes,
      )

      expect(result.isViewOnly).toBe(false)
    })

    it('should throw NotFoundException for nonexistent room', async () => {
      repository.findBySlugWithGuestFlag.mockResolvedValue(null)

      await expect(service.joinRoom('nonexistent', null, mockReq, mockRes)).rejects.toThrow(
        NotFoundException,
      )
    })

    it('should return displayName from user.name for anonymous session (set by generateName)', async () => {
      repository.findBySlugWithGuestFlag.mockResolvedValue(mockRoom)
      signInAnonymousMock.mockResolvedValue(mockAnonSignInResult)
      getSessionMock.mockResolvedValue(mockAnonSessionResult)

      const result = await service.joinRoom('abc1234567', null, mockReq, mockRes)

      // anonymous user.name is set by generateName callback (generateGuestDisplayName)
      expect(result.displayName).toBe('Purple Penguin')
    })
  })
})
