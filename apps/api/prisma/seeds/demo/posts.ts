import type { PostType, ReactionType } from '../../../src/generated/prisma/client'
import { DEMO, type DemoContext } from './index'

export interface DemoPost {
  id: string
  title: string
  authorId: string
  courseId: string
  approved: boolean
}

const TEMPLATES: { type: PostType; title: string; module: number | null; file: string }[] = [
  { type: 'NOTE', title: 'Module 1 lecture summary', module: 1, file: 'Module1_Summary.pdf' },
  {
    type: 'NOTE',
    title: 'Module 2 one-page cheat sheet',
    module: 2,
    file: 'Module2_CheatSheet.pdf',
  },
  {
    type: 'EXERCISE',
    title: 'Module 2 practice set with solutions',
    module: 2,
    file: 'Practice.pdf',
  },
  { type: 'NOTE', title: 'Module 3 worked examples', module: 3, file: 'Module3_Examples.pdf' },
  {
    type: 'OLD_QUESTION',
    title: 'Midterm with checked answers',
    module: null,
    file: 'Midterm.pdf',
  },
]
const REACTIONS: ReactionType[] = ['HELPFUL', 'LOVE', 'FIRE', 'WOW', 'SALUTE', 'FUNNY']
const TAGS = ['exam-prep', 'summary', 'worked-solutions', 'cheat-sheet']
const COMMENTS = [
  'This saved me before the quiz, thank you!',
  'Is page 3 from the lecture or the textbook?',
  'Clear and short. The diagrams help a lot.',
  'Could you add the answers for the last two questions?',
]

export async function seedPosts({ db, me, classmates, courses, at }: DemoContext) {
  const year = new Date().getFullYear()
  const authors = [...classmates, me]
  const posts: (DemoPost & { type: PostType })[] = []

  courses.slice(0, 6).forEach((course, courseIndex) => {
    TEMPLATES.forEach((template, templateIndex) => {
      const index = posts.length
      posts.push({
        id: `${DEMO}post-${index + 1}`,
        type: template.type,
        title: `${course.code} ${template.title}`,
        authorId: authors[(courseIndex * 2 + templateIndex) % authors.length].id,
        courseId: course.id,
        // The last two posts wait for a moderator.
        approved: index < 28,
      })
    })
  })

  await db.post.createMany({
    data: posts.map((post, index) => {
      const template = TEMPLATES[index % TEMPLATES.length]
      return {
        id: post.id,
        type: post.type,
        title: post.title,
        description: `Demo ${post.type === 'NOTE' ? 'note' : 'material'} for ${post.title}.`,
        authorId: post.authorId,
        courseId: post.courseId,
        moduleNumber: template.module,
        examYear: post.type === 'OLD_QUESTION' ? year - 1 - (index % 2) : null,
        year,
        semester: 1,
        shortCode: `demo${String(index + 1).padStart(4, '0')}`,
        status: post.approved ? 'APPROVED' : 'PENDING',
        publicationStatus: post.approved ? 'PUBLISHED' : 'PENDING_REVIEW',
        views: 12 + ((index * 37) % 240),
        trendingScore: post.approved ? (index * 13) % 50 : 0,
        summary:
          post.type === 'NOTE'
            ? 'A short walk through the main ideas of the module, with the key definitions and two worked examples.'
            : null,
        summarizedAt: post.type === 'NOTE' ? at(-1) : null,
        // Spread over the last 40 days, newest first.
        createdAt: at(-(index * 1.3) - 0.1),
      }
    }),
  })
  await db.file.createMany({
    data: posts.map((post, index) => ({
      id: `${DEMO}file-${index + 1}`,
      postId: post.id,
      // No object exists in storage for this key: previews and downloads won't open.
      key: `demo/${post.id}.pdf`,
      name: `${post.title.replace(/[^A-Za-z0-9]+/g, '_')}.pdf`,
      size: 180_000 + index * 41_000,
      mimeType: 'application/pdf',
      // Keeps the ingest worker from trying to read a file that isn't there.
      ingestStatus: 'UNSUPPORTED' as const,
    })),
  })

  const approved = posts.filter((post) => post.approved)
  const everyone = [...classmates, me]
  await db.reaction.createMany({
    data: approved.flatMap((post, postIndex) =>
      everyone
        .filter((_, userIndex) => (postIndex + userIndex) % 3 !== 0)
        .map((user, userIndex) => ({
          postId: post.id,
          userId: user.id,
          type: REACTIONS[(postIndex + userIndex) % 4 === 0 ? (userIndex % 5) + 1 : 0],
        })),
    ),
  })
  await db.savedPost.createMany({
    data: approved.flatMap((post, postIndex) =>
      everyone
        .filter((_, userIndex) => (postIndex * 2 + userIndex) % 4 === 0)
        .map((user) => ({ postId: post.id, userId: user.id })),
    ),
  })
  await db.postView.createMany({
    data: approved.flatMap((post, postIndex) =>
      everyone
        .filter((_, userIndex) => (postIndex + userIndex) % 2 === 0)
        .map((user) => ({ postId: post.id, userId: user.id })),
    ),
  })

  // Two comments and one reply on the ten newest posts; `me` joins every third thread.
  const commented = approved.slice(0, 10)
  await db.comment.createMany({
    data: commented.flatMap((post, postIndex) => [
      {
        id: `${DEMO}comment-${postIndex + 1}-a`,
        postId: post.id,
        userId: classmates[postIndex % classmates.length].id,
        content: COMMENTS[postIndex % COMMENTS.length],
        createdAt: at(-postIndex - 0.5),
      },
      {
        id: `${DEMO}comment-${postIndex + 1}-b`,
        postId: post.id,
        userId: postIndex % 3 === 0 ? me.id : classmates[(postIndex + 3) % classmates.length].id,
        content: COMMENTS[(postIndex + 2) % COMMENTS.length],
        createdAt: at(-postIndex - 0.4),
      },
    ]),
  })
  await db.comment.createMany({
    data: commented.map((post, postIndex) => ({
      id: `${DEMO}comment-${postIndex + 1}-reply`,
      postId: post.id,
      parentId: `${DEMO}comment-${postIndex + 1}-a`,
      userId: post.authorId,
      content: 'Good point, I updated the file.',
      createdAt: at(-postIndex - 0.3),
    })),
  })

  // Reuse a tag that already has the name; create (and own) the rest.
  const existing = await db.tag.findMany({ where: { name: { in: TAGS } } })
  const missing = TAGS.filter((name) => !existing.some((tag) => tag.name === name))
  await db.tag.createMany({
    data: missing.map((name) => ({ id: `${DEMO}tag-${name}`, name, slug: name })),
  })
  const tags = await db.tag.findMany({ where: { name: { in: TAGS } } })
  await db.postTag.createMany({
    data: approved.map((post, index) => ({ postId: post.id, tagId: tags[index % tags.length].id })),
  })

  console.log(`✓ ${posts.length} posts (${posts.length - approved.length} waiting for review)`)
  return posts
}
