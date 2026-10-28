import { FollowsService } from './follows.service'

describe('FollowsService', () => {
  const repo = { filterConnected: jest.fn(), findMentionable: jest.fn() }
  const service = new FollowsService(repo as any)

  beforeEach(() => jest.resetAllMocks())

  it('keepConnected dedupes, drops the author and keeps only connected ids', async () => {
    repo.filterConnected.mockImplementation((_a: string, ids: string[]) =>
      Promise.resolve(ids.filter((id) => id === 'b')),
    )

    const result = await service.keepConnected('a', ['b', 'b', 'a', 'stranger'])

    expect(repo.filterConnected).toHaveBeenCalledWith('a', ['b', 'stranger'])
    expect(result).toEqual(['b'])
  })

  it('getMentionable defaults q to an empty prefix', async () => {
    repo.findMentionable.mockResolvedValue([])
    await service.getMentionable('me')
    expect(repo.findMentionable).toHaveBeenCalledWith('me', '')
  })
})
