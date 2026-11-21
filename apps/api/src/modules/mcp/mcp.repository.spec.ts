import { McpRepository } from './mcp.repository'
import type { PrismaService } from '@/prisma/prisma.service'

describe('McpRepository', () => {
  it('finds the department, role, and university scope for a user', async () => {
    const user = { departmentId: 'dept-1', role: 'STUDENT', universityId: 'uni-1' }
    const prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(user),
      },
    }
    const repository = new McpRepository(prisma as unknown as PrismaService)

    await expect(repository.findUserAccess('user-1')).resolves.toEqual(user)
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { departmentId: true, role: true, universityId: true },
    })
  })
})
