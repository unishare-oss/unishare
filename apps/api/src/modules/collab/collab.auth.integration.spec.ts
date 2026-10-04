import { Test } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { io, Socket } from 'socket.io-client'
import { StorageService } from '@/modules/storage/storage.service'
import { auth } from '@/auth/auth.config'
import { CollabGateway } from './collab.gateway'
import { CollabRoomService } from './collab.room.service'
import { CollabRepository } from './collab.repository'

jest.mock('@/auth/auth.config', () => ({
  auth: { api: { getSession: jest.fn() } },
}))

describe('Board socket authentication', () => {
  let app: INestApplication
  let url: string
  let client: Socket | undefined
  const getSession = auth.api.getSession as jest.Mock

  beforeAll(async () => {
    const module = await Test.createTestingModule({
      providers: [
        CollabGateway,
        {
          provide: CollabRoomService,
          useValue: {
            getOrLoadRoom: jest.fn().mockResolvedValue({ elements: [], files: [] }),
            registerSocket: jest.fn(),
            getRoomForSocket: jest.fn(),
            removeSocket: jest.fn(),
          },
        },
        {
          provide: CollabRepository,
          useValue: {
            findBySlug: jest.fn().mockResolvedValue({
              slug: 'test-board',
              visibility: 'OPEN',
              ownerId: 'user-1',
            }),
          },
        },
        { provide: StorageService, useValue: {} },
      ],
    }).compile()
    app = module.createNestApplication()
    app.useWebSocketAdapter(new IoAdapter(app))
    await app.listen(0, '127.0.0.1')
    url = `http://127.0.0.1:${app.getHttpServer().address().port}/collab`
  })

  afterEach(() => client?.disconnect())
  afterAll(async () => app.close())

  function connect(cookie: string) {
    client = io(url, {
      transports: ['websocket'],
      extraHeaders: { cookie },
      reconnection: false,
    })
    return client
  }

  it.each(['unishare.session_token', '__Secure-unishare.session_token'])(
    'joins a board with a validated %s cookie',
    async (cookieName) => {
      const cookie = `${cookieName}=valid-session`
      getSession.mockImplementation(async ({ headers }: { headers: Headers }) =>
        headers.get('cookie') === cookie
          ? { user: { id: 'user-1', name: 'Test User' }, session: { id: 'session-1' } }
          : null,
      )
      const socket = connect(cookie)
      const joined = new Promise((resolve, reject) => {
        socket.once('connect_error', reject)
        socket.once('room-joined', resolve)
      })
      socket.emit('join-room', 'test-board')

      await expect(joined).resolves.toEqual({ slug: 'test-board', elements: [], files: [] })
    },
  )

  it.each(['', 'unishare.session_token=invalid', '__Secure-unishare.session_token=expired'])(
    'rejects a handshake when session validation fails (%s)',
    async (cookie) => {
      getSession.mockResolvedValue(null)
      const socket = connect(cookie)
      const rejected = new Promise<Error>((resolve, reject) => {
        socket.once('connect_error', resolve)
        socket.once('connect', () => reject(new Error('Unexpected authenticated connection')))
      })

      await expect(rejected).resolves.toHaveProperty('message', 'Unauthorized')
      expect(socket.connected).toBe(false)
    },
  )
})
