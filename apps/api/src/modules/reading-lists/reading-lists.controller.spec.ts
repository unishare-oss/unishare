import { UniversityScope } from '@/common/university-scope'
import { ReadingListsController } from './reading-lists.controller'

const U1: UniversityScope = { kind: 'university', universityId: 'u1' }
const session = { user: { id: 'user-1', role: 'STUDENT' } } as any

describe('ReadingListsController university scope', () => {
  let readingLists: { findOne: jest.Mock; addPost: jest.Mock }
  let posts: { getReadingListPosts: jest.Mock }
  let controller: ReadingListsController

  beforeEach(() => {
    readingLists = { findOne: jest.fn().mockResolvedValue({}), addPost: jest.fn() }
    posts = { getReadingListPosts: jest.fn() }
    controller = new ReadingListsController(readingLists as any, posts as any)
  })

  it("reads a list's posts with the requester's scope", async () => {
    await controller.getListPosts('list-1', {}, session, U1)
    expect(posts.getReadingListPosts).toHaveBeenCalledWith(
      'list-1',
      U1,
      {},
      {
        id: 'user-1',
        role: 'STUDENT',
      },
    )
  })
})
