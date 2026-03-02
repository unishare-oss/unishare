import { PaginatedResult } from '@unishare/types'
import { PaginationDto } from '../dto/pagination.dto'

export async function paginate<T>(
  model: { findMany: (args: object) => Promise<T[]>; count: (args?: object) => Promise<number> },
  args: object,
  { page = 1, limit = 20 }: PaginationDto,
): Promise<PaginatedResult<T>> {
  const skip = (page - 1) * limit

  const countArgs = { ...(args as Record<string, unknown>) }
  delete countArgs.include
  delete countArgs.select
  delete countArgs.orderBy

  const [data, total] = await Promise.all([
    model.findMany({ ...args, skip, take: limit }),
    model.count(countArgs),
  ])

  return {
    items: data,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  }
}
