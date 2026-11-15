// Demo data for manual testing, built around one existing account.
//   pnpm --filter api db:seed-demo -- --as you@example.com [--role MODERATOR]
//   pnpm --filter api db:seed-demo -- --remove
// Every row it creates has an id starting with "demo-", so --remove deletes only its own rows.
import * as dotenv from 'dotenv'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient, UserRole } from '../../../src/generated/prisma/client'
import { seedChat } from './chat'
import { seedExtras } from './extras'
import { seedPosts } from './posts'

dotenv.config()

export const DEMO = 'demo-'
const DAY = 24 * 60 * 60 * 1000

export type Db = PrismaClient
export interface DemoContext {
  db: Db
  me: { id: string; name: string }
  /** Classmates, in the same department as `me`. */
  classmates: { id: string; name: string }[]
  moderator: { id: string; name: string }
  /** Courses of the department, the viewer's year level first. */
  courses: { id: string; code: string; name: string }[]
  /** A date `days` from now (negative = past), at `hour` when given. */
  at: (days: number, hour?: number) => Date
}

const PEOPLE = [
  ['Arthit Kaewmanee', -1],
  ['Nam Thongchai', 0],
  ['Ploy Srisuk', 0],
  ['Somsak Panya', 0],
  ['Lin Wattana', 1],
  ['Kanya Boonmee', 1],
  ['Tawan Rattanakul', 2],
  ['Mali Chaiyasit', -1],
] as const

function at(days: number, hour?: number): Date {
  const date = new Date(Date.now() + days * DAY)
  if (hour !== undefined) date.setHours(hour, 0, 0, 0)
  return date
}

const byDemoId = { id: { startsWith: DEMO } }

async function remove(db: Db) {
  // Put back the role each account had before the seed changed it.
  const roleMarkers = await db.feedback.findMany({ where: { id: { startsWith: `${DEMO}role-` } } })
  for (const marker of roleMarkers) {
    if (!marker.userId) continue
    await db.user.update({
      where: { id: marker.userId },
      data: { role: marker.message as UserRole },
    })
  }

  // Order matters: rows without a cascade go before the rows they point at.
  const counts = {
    notifications: await db.notification.deleteMany({ where: byDemoId }),
    chatRooms: await db.chatRoom.deleteMany({ where: byDemoId }),
    quizzes: await db.quiz.deleteMany({ where: byDemoId }),
    reports: await db.report.deleteMany({ where: byDemoId }),
    requests: await db.postRequest.deleteMany({ where: byDemoId }),
    readingLists: await db.readingList.deleteMany({ where: byDemoId }),
    comments: await db.comment.deleteMany({ where: byDemoId }),
    posts: await db.post.deleteMany({ where: byDemoId }),
    exams: await db.exam.deleteMany({ where: byDemoId }),
    boards: await db.room.deleteMany({ where: byDemoId }),
    feedback: await db.feedback.deleteMany({ where: byDemoId }),
    tags: await db.tag.deleteMany({ where: byDemoId }),
    users: await db.user.deleteMany({ where: byDemoId }),
  }
  for (const [name, { count }] of Object.entries(counts)) {
    if (count > 0) console.log(`  removed ${count} ${name}`)
  }
}

async function main() {
  if (process.env.NODE_ENV === 'production')
    throw new Error('The demo seed never runs in production.')

  const args = process.argv.slice(2)
  const option = (name: string) => {
    const index = args.indexOf(name)
    return index === -1 ? undefined : args[index + 1]
  }

  const db = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL as string }),
  })
  try {
    console.log('Removing earlier demo data…')
    await remove(db)
    if (args.includes('--remove')) return

    const email = option('--as')
    if (!email) throw new Error('Pass --as <email> of an existing account, or --remove.')
    const me = await db.user.findUnique({ where: { email } })
    if (!me) throw new Error(`No account with email ${email}.`)
    if (!me.departmentId || !me.enrollmentYear) {
      throw new Error('That account needs a department and an enrollment year first.')
    }

    const role = option('--role') as UserRole | undefined
    if (role && role !== me.role) {
      if (!Object.values(UserRole).includes(role)) throw new Error(`Unknown role ${role}.`)
      await db.feedback.create({
        data: { id: `${DEMO}role-${me.id}`, type: 'FEEDBACK', message: me.role, userId: me.id },
      })
      await db.user.update({ where: { id: me.id }, data: { role } })
      console.log(`✓ ${me.name} is now ${role} (was ${me.role}; --remove puts it back)`)
    }

    const people = PEOPLE.map(([name, yearOffset], index) => ({
      id: `${DEMO}user-${index + 1}`,
      name,
      email: `${name.toLowerCase().replace(' ', '.')}@demo.unishare.test`,
      emailVerified: true,
      departmentId: me.departmentId,
      universityId: me.universityId,
      enrollmentYear: me.enrollmentYear! + yearOffset,
      role: (index === PEOPLE.length - 1 ? 'MODERATOR' : 'STUDENT') as UserRole,
      bio: 'Demo classmate.',
      consentGivenAt: new Date(),
    }))
    await db.user.createMany({ data: people })
    console.log(`✓ ${people.length} classmates`)

    const allCourses = await db.course.findMany({
      where: { departmentId: me.departmentId },
      orderBy: { code: 'asc' },
    })
    if (allCourses.length === 0)
      throw new Error('That department has no courses; run the base seed.')
    // Academic year level, as the app shows it (enrolled 2024 → Year 3 in 2026).
    const yearLevel = new Date().getFullYear() - me.enrollmentYear + 1
    const courses = [
      ...allCourses.filter((course) => course.yearLevel === yearLevel),
      ...allCourses.filter((course) => course.yearLevel !== yearLevel),
    ]

    const context: DemoContext = {
      db,
      me,
      classmates: people.slice(0, -1),
      moderator: people[people.length - 1],
      courses,
      at,
    }
    const posts = await seedPosts(context)
    await seedChat(context)
    await seedExtras(context, posts)
    console.log('Done.')
  } finally {
    await db.$disconnect()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
