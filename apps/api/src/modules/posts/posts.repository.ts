import { Injectable } from '@nestjs/common'
import { PostStatus, PostType, Prisma, ReactionType, UserRole } from '@/generated/prisma/client'
import { PaginationDto } from '@/common/dto/pagination.dto'
import { paginate } from '@/common/utils/paginate'
import { PrismaService } from '@/prisma/prisma.service'

type ViewerContext = {
  id?: string
  role?: UserRole
}

const postInclude = (viewerId?: string): Prisma.PostInclude => ({
  author: {
    select: {
      id: true,
      name: true,
      image: true,
      enrollmentYear: true,
      department: { select: { id: true, name: true } },
    },
  },
  course: {
    select: {
      id: true,
      code: true,
      name: true,
      department: { select: { id: true, name: true } },
    },
  },
  files: {
    select: {
      id: true,
      key: true,
      name: true,
      size: true,
      mimeType: true,
      createdAt: true,
      downloads: true,
    },
  },
  reactions: { select: { type: true, userId: true } },
  tags: {
    select: {
      tag: { select: { id: true, name: true, slug: true, color: true } },
    },
  },
  _count: {
    select: {
      comments: { where: { deletedAt: null } },
      savedBy: true,
    },
  },
  ...(viewerId ? { savedBy: { where: { userId: viewerId }, select: { userId: true } } } : {}),
})

function mapPost<T>(
  post: T,
  viewer?: ViewerContext,
): Omit<T, 'savedBy' | 'reactions'> & {
  savedByCurrentUser: boolean
  reactionCounts: Record<string, number>
  userReaction: string | null
  isOwner: boolean
} {
  const {
    savedBy,
    reactions,
    tags,
    author,
    isAnonymous,
    authorId,
    deletedAt: _deletedAt,
    courseId: _courseId,
    ...rest
  } = post as any
  const viewerId = viewer?.id
  const isAnonymousValue = isAnonymous ?? false

  const isPrivileged = viewer?.role === UserRole.MODERATOR || viewer?.role === UserRole.ADMIN
  const isOwner = viewerId != null && authorId === viewerId

  const reactionCounts: Record<string, number> = {}
  let userReaction: string | null = null
  for (const r of reactions ?? []) {
    reactionCounts[r.type] = (reactionCounts[r.type] ?? 0) + 1
    if (viewerId && r.userId === viewerId) userReaction = r.type
  }

  const base = {
    ...rest,
    tags: (tags ?? []).map((pt: any) => pt.tag),
    isAnonymous: isAnonymousValue,
    isOwner,
    savedByCurrentUser: Array.isArray(savedBy) && savedBy.length > 0,
    reactionCounts,
    userReaction,
  }

  if (isAnonymousValue) {
    if (isPrivileged) return { ...base, author }
    return base
  }

  return { ...base, author }
}

@Injectable()
export class PostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: {
      shortCode: string
      authorId: string
      courseId: string
      type: PostType
      title?: string
      description?: string
      externalUrl?: string
      isAnonymous?: boolean
      examYear?: number
      moduleNumber?: number
      year?: number
      semester?: number
    },
    viewer?: ViewerContext,
  ) {
    return this.prisma.post
      .create({ data, include: postInclude(viewer?.id) })
      .then((post) => mapPost({ ...post, savedBy: [] }, viewer))
  }

  async findAll(where: Prisma.PostWhereInput, pagination: PaginationDto, viewer?: ViewerContext) {
    const result = await paginate(
      this.prisma.post,
      { where, orderBy: { createdAt: 'desc' }, include: postInclude(viewer?.id) },
      pagination,
    )
    return { ...result, items: result.items.map((p) => mapPost(p, viewer)) }
  }

  async findByIds(ids: string[], viewer?: ViewerContext) {
    const posts = await this.prisma.post.findMany({
      where: { id: { in: ids }, deletedAt: null },
      include: postInclude(viewer?.id),
    })
    return posts.map((p) => mapPost(p, viewer))
  }

  async findById(id: string, viewer?: ViewerContext) {
    const post = await this.prisma.post.findUnique({
      where: { id, deletedAt: null },
      include: postInclude(viewer?.id),
    })
    return post ? mapPost(post, viewer) : null
  }

  async findByShortCode(shortCode: string, viewer?: ViewerContext) {
    const post = await this.prisma.post.findUnique({
      where: { shortCode, deletedAt: null },
      include: postInclude(viewer?.id),
    })
    return post ? mapPost(post, viewer) : null
  }

  findCourseDepartmentById(courseId: string) {
    return this.prisma.course.findUnique({
      where: { id: courseId },
      select: { id: true, departmentId: true },
    })
  }

  findCommentTarget(id: string) {
    return this.prisma.post.findUnique({
      where: { id, deletedAt: null },
      select: { id: true },
    })
  }

  findNotificationTarget(id: string) {
    return this.prisma.post.findUnique({
      where: { id, deletedAt: null },
      select: { id: true, authorId: true, title: true },
    })
  }

  update(id: string, data: Prisma.PostUpdateInput, viewer?: ViewerContext) {
    return this.prisma.post
      .update({ where: { id }, data, include: postInclude(viewer?.id) })
      .then((p) => mapPost(p, viewer))
  }

  async recordView(postId: string, userId: string) {
    const existing = await this.prisma.postView.findUnique({
      where: { userId_postId: { userId, postId } },
    })
    if (!existing) {
      await this.prisma.postView.create({ data: { userId, postId } })
      await this.prisma.post.update({ where: { id: postId }, data: { views: { increment: 1 } } })
    }
  }

  async toggleReaction(postId: string, viewer: ViewerContext & { id: string }, type: ReactionType) {
    const existing = await this.prisma.reaction.findUnique({
      where: { userId_postId: { userId: viewer.id, postId } },
    })
    if (existing?.type === type) {
      await this.prisma.reaction.delete({
        where: { userId_postId: { userId: viewer.id, postId } },
      })
    } else {
      await this.prisma.reaction.upsert({
        where: { userId_postId: { userId: viewer.id, postId } },
        create: { userId: viewer.id, postId, type },
        update: { type },
      })
    }
    return this.findById(postId, viewer)
  }

  softDelete(id: string) {
    return this.prisma.post.update({ where: { id }, data: { deletedAt: new Date() } })
  }

  updateStatus(id: string, status: PostStatus, viewer?: ViewerContext) {
    return this.prisma.post
      .update({ where: { id }, data: { status }, include: postInclude(viewer?.id) })
      .then((p) => mapPost(p, viewer))
  }

  savePost(postId: string, userId: string) {
    return this.prisma.savedPost.upsert({
      where: { userId_postId: { userId, postId } },
      create: { userId, postId },
      update: {},
    })
  }

  unsavePost(postId: string, userId: string) {
    return this.prisma.savedPost.delete({
      where: { userId_postId: { userId, postId } },
    })
  }

  async findSaved(viewer: ViewerContext & { id: string }, pagination: PaginationDto) {
    const result = await paginate(
      this.prisma.post,
      {
        where: { savedBy: { some: { userId: viewer.id } }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: postInclude(viewer.id),
      },
      pagination,
    )
    return { ...result, items: result.items.map((p) => mapPost(p, viewer)) }
  }

  async findByReadingList(listId: string, viewer: ViewerContext, pagination: PaginationDto) {
    const result = await paginate(
      this.prisma.post,
      {
        where: { readingListItems: { some: { listId } }, deletedAt: null },
        orderBy: { createdAt: 'desc' },
        include: postInclude(viewer?.id),
      },
      pagination,
    )
    return { ...result, items: result.items.map((p) => mapPost(p, viewer)) }
  }
}
