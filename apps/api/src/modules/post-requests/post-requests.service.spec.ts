import { Test, TestingModule } from '@nestjs/testing'
import { NotFoundException } from '@nestjs/common'
import { UniversityScope } from '@/common/university-scope'
import { NotificationsService } from '../notifications/notifications.service'
import { PostRequestsRepository } from './post-requests.repository'
import { PostRequestsService } from './post-requests.service'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const ADMIN: UniversityScope = { kind: 'all' }

describe('PostRequestsService — university scope', () => {
  let service: PostRequestsService
  let repo: {
    findAll: jest.Mock
    findById: jest.Mock
    findIdInScope: jest.Mock
    findCourseIdInScope: jest.Mock
    findPostIdInScope: jest.Mock
    create: jest.Mock
    findSuggestionByUser: jest.Mock
    toggleUpvote: jest.Mock
    findSuggestion: jest.Mock
    createSuggestion: jest.Mock
    deleteSuggestion: jest.Mock
    acceptSuggestion: jest.Mock
    delete: jest.Mock
  }

  beforeEach(async () => {
    // findById misses, as it does for another university's request once the scope is applied.
    repo = {
      findAll: jest.fn().mockResolvedValue({ items: [] }),
      findById: jest.fn().mockResolvedValue(null),
      findIdInScope: jest.fn().mockResolvedValue(null),
      findCourseIdInScope: jest.fn().mockResolvedValue(null),
      findPostIdInScope: jest.fn().mockResolvedValue(null),
      create: jest.fn(),
      findSuggestionByUser: jest.fn().mockResolvedValue(null),
      toggleUpvote: jest.fn(),
      findSuggestion: jest.fn().mockResolvedValue({ id: 's1', userId: 'someone-else' }),
      createSuggestion: jest.fn(),
      deleteSuggestion: jest.fn(),
      acceptSuggestion: jest.fn(),
      delete: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostRequestsService,
        { provide: PostRequestsRepository, useValue: repo },
        { provide: NotificationsService, useValue: {} },
      ],
    }).compile()

    service = module.get(PostRequestsService)
  })

  it('toggleUpvote gives 404 for a request outside the scope, with an id-only lookup', async () => {
    await expect(service.toggleUpvote('r1', 'user-1', U1)).rejects.toBeInstanceOf(NotFoundException)
    expect(repo.findIdInScope).toHaveBeenCalledWith('r1', U1)
    expect(repo.findById).not.toHaveBeenCalled()
    expect(repo.toggleUpvote).not.toHaveBeenCalled()
  })

  it('lists requests with the scope', async () => {
    await service.findAll({ departmentId: 'd1' }, U1, 'user-1')
    expect(repo.findAll).toHaveBeenCalledWith({ course: { departmentId: 'd1' } }, U1, {}, 'user-1')
  })

  it.each([
    ['findOne', (s: PostRequestsService) => s.findOne('r1', U1, 'user-1')],
    ['suggest', (s: PostRequestsService) => s.suggest('r1', { postId: 'p1' }, 'user-1', U1)],
    ['removeSuggestion', (s: PostRequestsService) => s.removeSuggestion('r1', 's1', 'user-1', U1)],
    ['acceptSuggestion', (s: PostRequestsService) => s.acceptSuggestion('r1', 's1', 'user-1', U1)],
    ['remove', (s: PostRequestsService) => s.remove('r1', 'user-1', U1)],
  ])(
    '%s gives 404, before any ownership check, for a request outside the scope',
    async (_n, call) => {
      await expect(call(service)).rejects.toBeInstanceOf(NotFoundException)
      expect(repo.findById).toHaveBeenCalledWith('r1', U1, 'user-1')
      expect(repo.findSuggestion).not.toHaveBeenCalled()
      expect(repo.toggleUpvote).not.toHaveBeenCalled()
      expect(repo.createSuggestion).not.toHaveBeenCalled()
      expect(repo.deleteSuggestion).not.toHaveBeenCalled()
      expect(repo.acceptSuggestion).not.toHaveBeenCalled()
      expect(repo.delete).not.toHaveBeenCalled()
    },
  )

  it('gives 404 when removing a suggestion that belongs to another request', async () => {
    repo.findById.mockResolvedValue({ id: 'r1' })
    repo.findSuggestion.mockResolvedValue({ id: 's1', requestId: 'r2', userId: 'user-1' })
    await expect(service.removeSuggestion('r1', 's1', 'user-1', U1)).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(repo.deleteSuggestion).not.toHaveBeenCalled()
  })

  const dto = { title: 'Need notes', courseId: 'c2' }

  it("gives 404 when creating a request on another university's course", async () => {
    await expect(service.create(dto, 'user-1', U1)).rejects.toBeInstanceOf(NotFoundException)
    expect(repo.findCourseIdInScope).toHaveBeenCalledWith('c2', U1)
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('lets an admin create a request on any course', async () => {
    repo.findCourseIdInScope.mockResolvedValue({ id: 'c2' })
    await service.create(dto, 'admin-1', ADMIN)
    expect(repo.findCourseIdInScope).toHaveBeenCalledWith('c2', ADMIN)
    expect(repo.create).toHaveBeenCalledWith({ ...dto, authorId: 'admin-1' })
  })

  it('gives 404 when suggesting a post outside the scope', async () => {
    repo.findById.mockResolvedValue({ id: 'r1', status: 'OPEN', author: { id: 'author-1' } })
    await expect(service.suggest('r1', { postId: 'p2' }, 'user-1', U1)).rejects.toBeInstanceOf(
      NotFoundException,
    )
    expect(repo.findPostIdInScope).toHaveBeenCalledWith('p2', U1)
    expect(repo.createSuggestion).not.toHaveBeenCalled()
  })
})
