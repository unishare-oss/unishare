import { Injectable } from '@nestjs/common'
import { Prisma } from '@/generated/prisma/client'
import { PrismaService } from '@/prisma/prisma.service'
import { postInScope, UniversityScope } from '@/common/university-scope'

function userInScope(scope: UniversityScope): Prisma.UserWhereInput {
  switch (scope.kind) {
    case 'all':
      return {}
    case 'university':
      return { universityId: scope.universityId }
    case 'none':
      return { id: { in: [] } }
  }
}

@Injectable()
export class StatsRepository {
  constructor(private readonly prisma: PrismaService) {}

  countUsers(scope: UniversityScope) {
    return this.prisma.user.count({ where: { isAnonymous: false, AND: [userInScope(scope)] } })
  }

  countPosts(scope: UniversityScope) {
    return this.prisma.post.count({ where: { deletedAt: null, AND: [postInScope(scope)] } })
  }

  countComments(scope: UniversityScope) {
    return this.prisma.comment.count({ where: { deletedAt: null, post: postInScope(scope) } })
  }

  countReactions(scope: UniversityScope) {
    return this.prisma.reaction.count({ where: { post: postInScope(scope) } })
  }

  findTopPostsByViews(scope: UniversityScope) {
    return this.prisma.post.findMany({
      where: { deletedAt: null, status: 'APPROVED', AND: [postInScope(scope)] },
      orderBy: { views: 'desc' },
      take: 5,
      select: {
        id: true,
        title: true,
        shortCode: true,
        views: true,
        isAnonymous: true,
        _count: { select: { reactions: true } },
        author: { select: { name: true } },
      },
    })
  }

  findTopPostsByReactions(scope: UniversityScope) {
    return this.prisma.post.findMany({
      where: { deletedAt: null, status: 'APPROVED', AND: [postInScope(scope)] },
      orderBy: { reactions: { _count: 'desc' } },
      take: 5,
      select: {
        id: true,
        title: true,
        shortCode: true,
        views: true,
        isAnonymous: true,
        _count: { select: { reactions: true } },
        author: { select: { name: true } },
      },
    })
  }

  // `universityId` is bound as a parameter. Users and the posts counted for them are both
  // limited to the university; the post side joins course -> department -> faculty.
  async findTopUsersByPostCount(scope: UniversityScope) {
    if (scope.kind === 'none') return []
    const universityId = scope.kind === 'university' ? scope.universityId : null

    return this.prisma.$queryRaw<
      {
        id: string
        name: string
        image: string | null
        postCount: bigint
        departmentName: string | null
      }[]
    >(Prisma.sql`
      SELECT u.id, u.name, u.image,
             COUNT(p.id) AS "postCount",
             d.name AS "departmentName"
      FROM "user" u
      LEFT JOIN "post" p
        ON p."authorId" = u.id
        AND p."deletedAt" IS NULL
        AND p."isAnonymous" = false
        ${
          universityId
            ? Prisma.sql`AND EXISTS (
                SELECT 1 FROM "course" c
                JOIN "department" pd ON pd.id = c."departmentId"
                JOIN "faculty" f ON f.id = pd."facultyId"
                WHERE c.id = p."courseId" AND f."universityId" = ${universityId}
              )`
            : Prisma.empty
        }
      LEFT JOIN "department" d ON d.id = u."departmentId"
      ${universityId ? Prisma.sql`WHERE u."universityId" = ${universityId}` : Prisma.empty}
      GROUP BY u.id, u.name, u.image, d.name
      ORDER BY "postCount" DESC
      LIMIT 5
    `)
  }
}
