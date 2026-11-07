import { Prisma, UserRole } from '@/generated/prisma/client'

/** The content a request may read: every university's, one university's, or none. */
export type UniversityScope =
  { kind: 'all' } | { kind: 'university'; universityId: string } | { kind: 'none' }

/**
 * Admins read everything; anyone else with a university reads only that university's posts
 * (moderators included). No university, or no user at all, reads nothing.
 */
export function universityScope(
  user?: { role?: string | null; universityId?: string | null } | null,
): UniversityScope {
  if (user?.role === UserRole.ADMIN) return { kind: 'all' }
  if (user?.universityId) return { kind: 'university', universityId: user.universityId }
  return { kind: 'none' }
}

/** Prisma filter for the posts a scope may read. Combine it with other filters in `AND`. */
export function postInScope(scope: UniversityScope): Prisma.PostWhereInput {
  switch (scope.kind) {
    case 'all':
      return {}
    case 'university':
      return { course: { department: { faculty: { universityId: scope.universityId } } } }
    case 'none':
      return { id: { in: [] } }
  }
}

/** Prisma filter for the courses a scope may read, and through `course`, everything on them. */
export function courseInScope(scope: UniversityScope): Prisma.CourseWhereInput {
  switch (scope.kind) {
    case 'all':
      return {}
    case 'university':
      return { department: { faculty: { universityId: scope.universityId } } }
    case 'none':
      return { id: { in: [] } }
  }
}

/** Prisma filter for the decks a scope may read: the owner's or the source post's university. */
export function deckInScope(scope: UniversityScope): Prisma.DeckWhereInput {
  switch (scope.kind) {
    case 'all':
      return {}
    case 'university':
      return {
        OR: [{ owner: { universityId: scope.universityId } }, { sourcePost: postInScope(scope) }],
      }
    case 'none':
      return { id: { in: [] } }
  }
}
