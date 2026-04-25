import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '../src/generated/prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string })
const prisma = new PrismaClient({ adapter })

async function main() {
  const [messages, participants, rooms, keys] = await Promise.all([
    prisma.chatMessage.deleteMany(),
    prisma.chatRoomParticipant.deleteMany(),
    prisma.chatRoom.deleteMany(),
    prisma.user.updateMany({ data: { publicKey: null } }),
  ])

  console.log(`Deleted ${messages.count} messages`)
  console.log(`Deleted ${participants.count} participants`)
  console.log(`Deleted ${rooms.count} chat rooms`)
  console.log(`Cleared public keys on ${keys.count} users`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
