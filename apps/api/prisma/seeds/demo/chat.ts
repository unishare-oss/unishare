import { DEMO, type DemoContext } from './index'

// Seeded rooms have no room key, so the app treats them as unencrypted and shows the
// messages as plain text. The seed can't write end-to-end encrypted messages: only a
// browser holding the keys can.
const GROUP_TALK = [
  'Did anyone finish the Module 2 practice set?',
  'Almost. Question 4 is tricky.',
  'I uploaded my solutions to the course page.',
  'Thanks! Are we still meeting at the library tomorrow?',
  'Yes, 3 pm, second floor.',
  'Can someone share last year’s midterm?',
  'It’s in Old exams now.',
  'See you all tomorrow.',
]
const DM_TALK = [
  'Hey, do you have the notes from today?',
  'Yes, give me a minute.',
  'Sent. Check the course page.',
  'Got it, thanks a lot!',
]

export async function seedChat({ db, me, classmates, at }: DemoContext) {
  const rooms = [
    {
      key: 'study',
      type: 'GROUP' as const,
      name: 'Year study group',
      others: classmates.slice(0, 4),
      talk: GROUP_TALK,
      unread: 3,
    },
    {
      key: 'project',
      type: 'GROUP' as const,
      name: 'Project team',
      others: classmates.slice(4, 6),
      talk: GROUP_TALK.slice(0, 5),
      unread: 0,
    },
    {
      key: 'dm-1',
      type: 'DM' as const,
      name: null,
      others: classmates.slice(0, 1),
      talk: DM_TALK,
      unread: 2,
    },
    {
      key: 'dm-2',
      type: 'DM' as const,
      name: null,
      others: classmates.slice(1, 2),
      talk: DM_TALK.slice(0, 2),
      unread: 0,
    },
  ]

  for (const room of rooms) {
    const id = `${DEMO}chat-${room.key}`
    const people = [me, ...room.others]
    // One message every 20 minutes, ending 5 minutes ago.
    const sentAt = (index: number) =>
      new Date(at(0).getTime() - (room.talk.length - index) * 20 * 60_000 + 15 * 60_000)

    await db.chatRoom.create({ data: { id, type: room.type, name: room.name } })
    await db.chatRoomParticipant.createMany({
      data: people.map((person) => ({
        id: `${id}-${person.id}`,
        roomId: id,
        userId: person.id,
        joinedAt: at(-7),
        // `me` last read just before the unread messages; everyone else is up to date.
        lastReadAt:
          person.id === me.id && room.unread > 0
            ? new Date(sentAt(room.talk.length - room.unread).getTime() - 60_000)
            : at(0),
      })),
    })
    await db.chatMessage.createMany({
      data: [
        ...(room.type === 'GROUP'
          ? [
              {
                id: `${id}-msg-0`,
                roomId: id,
                type: 'SYSTEM' as const,
                content: `${room.others[0].name} created the group`,
                createdAt: at(-7),
              },
            ]
          : []),
        ...room.talk.map((content, index) => ({
          id: `${id}-msg-${index + 1}`,
          roomId: id,
          type: 'TEXT' as const,
          content,
          // The last messages come from others, so they count as unread for `me`.
          userId: (index >= room.talk.length - room.unread
            ? room.others[index % room.others.length]
            : people[index % people.length]
          ).id,
          createdAt: sentAt(index),
        })),
      ],
    })
    // One threaded reply in each group.
    if (room.type === 'GROUP') {
      await db.chatMessage.create({
        data: {
          id: `${id}-msg-reply`,
          roomId: id,
          type: 'TEXT',
          parentId: `${id}-msg-2`,
          userId: room.others[0].id,
          content: 'Try drawing the table first, it gets easier.',
          createdAt: sentAt(2),
        },
      })
    }
  }
  console.log(`✓ ${rooms.length} chats (2 groups, 2 DMs), unencrypted`)
}
