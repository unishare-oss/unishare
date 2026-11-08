import { FeedbackService } from './feedback.service'
import { FeedbackRepository } from './feedback.repository'

describe('FeedbackService.findAll', () => {
  function setup() {
    const prisma = {
      feedback: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    }
    const service = new FeedbackService(new FeedbackRepository(prisma as never))
    return { prisma, service }
  }

  it("limits a moderator to feedback from their own university's members", async () => {
    const { prisma, service } = setup()
    await service.findAll({ type: 'BUG_REPORT' } as never, {
      kind: 'university',
      universityId: 'u1',
    })
    const where = { AND: [{ type: 'BUG_REPORT' }, { user: { universityId: 'u1' } }] }
    expect(prisma.feedback.findMany).toHaveBeenCalledWith(expect.objectContaining({ where }))
    expect(prisma.feedback.count).toHaveBeenCalledWith({ where })
  })

  it('shows an admin every university', async () => {
    const { prisma, service } = setup()
    await service.findAll({} as never, { kind: 'all' })
    expect(prisma.feedback.count).toHaveBeenCalledWith({ where: { AND: [{}, {}] } })
  })

  it('shows a moderator with no university nothing', async () => {
    const { prisma, service } = setup()
    await service.findAll({} as never, { kind: 'none' })
    expect(prisma.feedback.count).toHaveBeenCalledWith({
      where: { AND: [{}, { user: { id: { in: [] } } }] },
    })
  })
})
