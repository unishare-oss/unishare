import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { cs } from './seeds/cs'
import { it } from './seeds/it'
import { dsi } from './seeds/dsi'

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter: pool })

const departments = [cs, it, dsi]

async function main() {
  console.log('Seeding departments and courses...')

  const postCount = await prisma.post.count()
  if (postCount > 0) {
    console.warn('⚠ Posts exist — skipping wipe, using upserts instead')
  } else {
    await prisma.course.deleteMany()
    await prisma.department.deleteMany()
  }

  for (const dept of departments) {
    const department = await prisma.department.upsert({
      where: { name: dept.name },
      update: {},
      create: { name: dept.name },
    })

    for (const course of dept.courses) {
      await prisma.course.upsert({
        where: { code_departmentId: { code: course.code, departmentId: department.id } },
        update: { name: course.name },
        create: { code: course.code, name: course.name, departmentId: department.id },
      })
    }

    console.log(`✓ ${department.name} — ${dept.courses.length} courses`)
  }

  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
