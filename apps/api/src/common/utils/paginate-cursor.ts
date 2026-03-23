import { CursorPaginatedResult } from '@unishare/types'

interface PrismaModel<T> {
  findMany: (args: any) => Promise<T[]>
}

export interface CursorPaginationOptions {
  cursor?: string
  limit?: number
  direction?: 'asc' | 'desc'
  cursorField?: string
}

/**
 * Utility for cursor-based pagination (ideal for chat, infinite scrolling)
 */
export async function paginateWithCursor<T extends { id: string }>(
  model: PrismaModel<T>,
  args: any,
  { cursor, limit = 20, direction = 'desc', cursorField = 'id' }: CursorPaginationOptions,
): Promise<CursorPaginatedResult<T>> {
  // Take one extra to check if there's more
  const take = limit + 1

  const queryArgs: any = {
    ...args,
    take: direction === 'asc' ? take : -take,
    orderBy: { [cursorField]: direction },
  }

  if (cursor) {
    queryArgs.cursor = { [cursorField]: cursor }
    queryArgs.skip = 1 // Skip the cursor itself
  }

  const items = await model.findMany(queryArgs)

  const hasMore = items.length > limit
  if (hasMore) {
    items.pop() // Remove the extra item
  }

  const nextCursor = hasMore ? items[items.length - 1].id : null

  return {
    items,
    nextCursor,
    hasMore,
  }
}
