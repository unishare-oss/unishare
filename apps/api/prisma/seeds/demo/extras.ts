import { DEMO, type DemoContext } from './index'
import type { DemoPost } from './posts'

export async function seedExtras(
  { db, me, classmates, moderator, courses, at }: DemoContext,
  posts: DemoPost[],
) {
  const approved = posts.filter((post) => post.approved)

  // Exams: two on consecutive days (Today's back-to-back warning), three later, one past.
  const examDays = [3, 4, 8, 12, 20, -5]
  await db.exam.createMany({
    data: examDays.map((days, index) => {
      const course = courses[index % courses.length]
      const startsAt = at(days, index % 2 === 0 ? 9 : 13)
      return {
        id: `${DEMO}exam-${index + 1}`,
        courseId: course.id,
        title: `${course.code} ${index < 3 ? 'Midterm' : 'Final'}`,
        examRoom: index === 2 ? null : `CB2${300 + index}`,
        notes: 'Bring your student card. Closed book.',
        startsAt,
        endsAt: new Date(startsAt.getTime() + 3 * 60 * 60 * 1000),
        createdBy: moderator.id,
      }
    }),
  })

  await db.follow.createMany({
    data: [
      { followerId: me.id, followingId: classmates[0].id },
      { followerId: me.id, followingId: classmates[1].id },
      { followerId: classmates[2].id, followingId: me.id },
      { followerId: classmates[3].id, followingId: me.id },
    ],
  })

  await db.readingList.create({
    data: {
      id: `${DEMO}list-1`,
      userId: me.id,
      name: 'Midterm revision',
      description: 'What to read before the midterms.',
      isPublic: true,
      posts: { create: approved.slice(0, 4).map((post) => ({ postId: post.id })) },
    },
  })

  // Requests: two open with upvotes, one already fulfilled by a demo post.
  await db.postRequest.createMany({
    data: [
      {
        id: `${DEMO}request-1`,
        title: `Need ${courses[0].code} Module 3 notes`,
        description: 'I missed two lectures.',
        courseId: courses[0].id,
        authorId: classmates[4].id,
        createdAt: at(-2),
      },
      {
        id: `${DEMO}request-2`,
        title: `Any ${courses[1].code} final from last year?`,
        courseId: courses[1].id,
        authorId: me.id,
        createdAt: at(-4),
      },
      {
        id: `${DEMO}request-3`,
        title: `${courses[0].code} midterm with answers`,
        courseId: courses[0].id,
        authorId: classmates[5].id,
        status: 'FULFILLED',
        fulfilledByPostId: approved[4].id,
        createdAt: at(-9),
      },
    ],
  })
  await db.postRequestUpvote.createMany({
    data: [
      ...classmates.slice(0, 5).map((user) => ({ userId: user.id, requestId: `${DEMO}request-1` })),
      { userId: me.id, requestId: `${DEMO}request-1` },
      ...classmates.slice(0, 2).map((user) => ({ userId: user.id, requestId: `${DEMO}request-2` })),
    ],
  })
  await db.postRequestFulfillment.createMany({
    data: [
      {
        id: `${DEMO}fulfil-1`,
        requestId: `${DEMO}request-3`,
        postId: approved[4].id,
        userId: classmates[0].id,
      },
      {
        id: `${DEMO}fulfil-2`,
        requestId: `${DEMO}request-2`,
        postId: approved[9].id,
        userId: classmates[1].id,
      },
    ],
  })

  // For the admin pages: two pending reports and two feedback entries.
  await db.report.createMany({
    data: [
      {
        id: `${DEMO}report-1`,
        postId: approved[6].id,
        userId: classmates[2].id,
        reason: 'COPYRIGHT',
        comment: 'This looks scanned from the textbook.',
      },
      { id: `${DEMO}report-2`, postId: approved[11].id, userId: classmates[3].id, reason: 'SPAM' },
    ],
  })
  await db.feedback.createMany({
    data: [
      {
        id: `${DEMO}feedback-1`,
        type: 'FEEDBACK',
        message: 'Please add a dark mode for the PDF viewer.',
        userId: classmates[0].id,
      },
      {
        id: `${DEMO}feedback-2`,
        type: 'BUG_REPORT',
        message: 'The file list is cut off on my phone.',
        userId: classmates[1].id,
      },
    ],
  })

  await db.room.create({
    data: {
      id: `${DEMO}board-1`,
      slug: `${DEMO}study-board`,
      title: 'Revision mind map',
      ownerId: me.id,
    },
  })

  const questions = [
    [
      'Which statement about the topic is correct?',
      ['The first one', 'The second one', 'The third one', 'None of them'],
      1,
    ],
    ['What does the main definition require?', ['Only A', 'Only B', 'Both A and B', 'Neither'], 2],
    ['Which example fits the rule?', ['Example 1', 'Example 2', 'Example 3', 'Example 4'], 0],
    ['What is the usual first step?', ['Guess', 'Draw the table', 'Skip it', 'Ask a friend'], 1],
  ] as const
  await db.quiz.create({
    data: {
      id: `${DEMO}quiz-1`,
      courseId: courses[0].id,
      moduleNumber: 2,
      title: `${courses[0].code} Module 2 quick check`,
      description: 'Four questions on the module.',
      isPublished: true,
      createdBy: moderator.id,
      questionsCount: questions.length,
      questions: {
        create: questions.map(([content, options, correctAnswer], index) => ({
          id: `${DEMO}question-${index + 1}`,
          content,
          options: [...options],
          correctAnswer,
          explanation: 'See the worked example in the module notes.',
        })),
      },
      // `me` finished it once, with three of four right.
      sessions: {
        create: {
          id: `${DEMO}session-1`,
          studentId: me.id,
          score: 3,
          totalPoints: questions.length,
          attemptedAt: at(-1),
          completedAt: at(-1),
          timeSpentSec: 240,
          questionAttempts: {
            create: questions.map(([, , correctAnswer], index) => ({
              id: `${DEMO}attempt-${index + 1}`,
              questionId: `${DEMO}question-${index + 1}`,
              studentAnswer: index === 3 ? 0 : correctAnswer,
              isCorrect: index !== 3,
              timeSpentSec: 60,
            })),
          },
        },
      },
    },
  })

  const myPost = posts.find((post) => post.authorId === me.id && post.approved)
  const commentOnMine = myPost
    ? await db.comment.findFirst({ where: { postId: myPost.id, userId: { not: me.id } } })
    : null
  await db.notification.createMany({
    data: [
      {
        id: `${DEMO}notif-1`,
        userId: me.id,
        type: 'EXAM_REMINDER',
        message: `${courses[0].code} Midterm is in 3 days`,
        examId: `${DEMO}exam-1`,
        createdAt: at(0),
      },
      {
        id: `${DEMO}notif-2`,
        userId: me.id,
        type: 'NEW_POST_FROM_FOLLOWED',
        message: `${classmates[0].name} shared a new note`,
        postId: approved[0].id,
        createdAt: at(0),
      },
      {
        id: `${DEMO}notif-3`,
        userId: me.id,
        type: 'REQUEST_SUGGESTION_ADDED',
        message: `${classmates[1].name} suggested a post for your request`,
        requestId: `${DEMO}request-2`,
        createdAt: at(-1),
      },
      {
        id: `${DEMO}notif-4`,
        userId: me.id,
        type: 'CHAT_MESSAGE',
        message: 'New messages in Year study group',
        chatRoomId: `${DEMO}chat-study`,
        createdAt: at(0),
      },
      ...(myPost
        ? [
            {
              id: `${DEMO}notif-5`,
              userId: me.id,
              type: 'POST_APPROVED' as const,
              message: `Your post "${myPost.title}" was approved`,
              postId: myPost.id,
              read: true,
              createdAt: at(-3),
            },
          ]
        : []),
      ...(myPost && commentOnMine
        ? [
            {
              id: `${DEMO}notif-6`,
              userId: me.id,
              type: 'COMMENT_ADDED' as const,
              message: 'Someone commented on your post',
              postId: myPost.id,
              commentId: commentOnMine.id,
              read: true,
              createdAt: at(-2),
            },
          ]
        : []),
    ],
  })

  console.log(
    `✓ ${examDays.length} exams, 3 requests, 2 reports, 2 feedback, 1 list, 1 board, 1 quiz, notifications`,
  )
}
