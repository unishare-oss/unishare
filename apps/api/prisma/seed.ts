import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { universities } from './seeds'

const pool = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter: pool })

async function main() {
  const postCount = await prisma.post.count()
  if (postCount > 0) {
    console.warn('⚠ Posts exist — skipping wipe, using upserts instead')
  } else {
    await prisma.course.deleteMany()
    await prisma.department.deleteMany()
  }

  for (const { university: uni, faculties } of universities) {
    const university = await prisma.university.upsert({
      where: { name: uni.name },
      update: {
        shortName: uni.shortName,
        logoUrl: uni.logoUrl,
        // An unset variable keeps the existing link instead of clearing it
        ...(uni.uniauthOrgId && { uniauthOrgId: uni.uniauthOrgId }),
      },
      // An empty variable is '', which would collide on the unique column
      create: { ...uni, uniauthOrgId: uni.uniauthOrgId || undefined },
    })
    console.log(`✓ ${uni.shortName}`)

    for (const fac of faculties) {
      const faculty = await prisma.faculty.upsert({
        where: { universityId_name: { universityId: university.id, name: fac.name } },
        update: {},
        create: { name: fac.name, universityId: university.id },
      })

      for (const dept of fac.departments) {
        const department = await prisma.department.upsert({
          where: { facultyId_name: { facultyId: faculty.id, name: dept.name } },
          update: {},
          create: { name: dept.name, facultyId: faculty.id },
        })

        for (const course of dept.courses) {
          await prisma.course.upsert({
            where: { code_departmentId: { code: course.code, departmentId: department.id } },
            update: { name: course.name, yearLevel: course.yearLevel ?? null },
            create: {
              code: course.code,
              name: course.name,
              departmentId: department.id,
              yearLevel: course.yearLevel ?? null,
            },
          })
        }

        console.log(`  ✓ ${faculty.name} / ${department.name} — ${dept.courses.length} courses`)
      }
    }
  }

  console.log('Done.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
