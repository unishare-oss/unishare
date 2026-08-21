import { Test, TestingModule } from '@nestjs/testing'
import { INestApplication } from '@nestjs/common'
import { IoAdapter } from '@nestjs/platform-socket.io'
import { io, Socket as ClientSocket } from 'socket.io-client'
import * as Y from 'yjs'
import { StorageService } from '@/modules/storage/storage.service'
import { CollabGateway } from './collab.gateway'
import { CollabRoomService } from './collab.room.service'
import { CollabRepository } from './collab.repository'

// Mock auth so tests don't hit the DB
jest.mock('@/auth/auth.config', () => ({
  auth: {
    api: {
      getSession: jest.fn((opts: { headers: Headers }) => {
        const cookie = opts.headers.get('cookie') ?? ''
        if (cookie.includes('better-auth.session_token=valid')) {
          // Derive a unique user id from the token suffix so clients can be distinguished
          const match = cookie.match(/better-auth\.session_token=([^\s;]+)/)
          const token = match ? match[1] : 'valid'
          return Promise.resolve({
            user: { id: `user-${token}`, name: 'Test User' },
            session: { id: `sess-${token}` },
          })
        }
        return Promise.resolve(null)
      }),
    },
  },
}))

jest.setTimeout(15000)

describe('CollabGateway (integration)', () => {
  let app: INestApplication
  let port: number
  let activeClients: ClientSocket[] = []

  const mockRepository = {
    findBySlug: jest.fn((slug: string) => {
      // Accept any slug that starts with a known prefix so each test can use a unique room
      if (
        slug === 'test-room' ||
        slug === 'other-room' ||
        slug.startsWith('relay-room-') ||
        slug.startsWith('state-room-') ||
        slug.startsWith('isolation-room-')
      ) {
        return Promise.resolve({ id: '1', slug })
      }
      return Promise.resolve(null)
    }),
    getSnapshot: jest.fn().mockResolvedValue(null),
    saveSnapshot: jest.fn().mockResolvedValue(undefined),
  }

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CollabGateway,
        CollabRoomService,
        { provide: CollabRepository, useValue: mockRepository },
        {
          provide: StorageService,
          useValue: {
            generatePresignedDownloadUrl: jest.fn().mockResolvedValue('https://example.com/signed'),
          },
        },
      ],
    }).compile()

    app = module.createNestApplication()
    app.useWebSocketAdapter(new IoAdapter(app))
    await app.listen(0)

    const addr = app.getHttpServer().address()
    port = typeof addr === 'string' ? 0 : (addr as { port: number }).port
  })

  afterAll(async () => {
    await app.close()
  })

  afterEach(() => {
    for (const client of activeClients) {
      if (client.connected) {
        client.disconnect()
      }
    }
    activeClients = []
  })

  function connectClient(opts: { cookie?: string } = {}): ClientSocket {
    const client = io(`http://localhost:${port}/collab`, {
      transports: ['websocket'],
      extraHeaders: {
        cookie: opts.cookie ?? 'better-auth.session_token=valid-token',
      },
    })
    activeClients.push(client)
    return client
  }

  function waitForEvent<T>(socket: ClientSocket, event: string, timeoutMs = 5000): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for event "${event}" after ${timeoutMs}ms`))
      }, timeoutMs)

      socket.once(event, (data: T) => {
        clearTimeout(timer)
        resolve(data)
      })
    })
  }

  it('relays yjs-update to other clients in same room', async () => {
    const roomSlug = 'relay-room-1'
    const clientA = connectClient({ cookie: 'better-auth.session_token=valid-token-A' })
    const clientB = connectClient({ cookie: 'better-auth.session_token=valid-token-B' })

    const joinedA = waitForEvent(clientA, 'room-joined')
    const joinedB = waitForEvent(clientB, 'room-joined')

    clientA.emit('join-room', roomSlug)
    clientB.emit('join-room', roomSlug)

    await Promise.all([joinedA, joinedB])

    // Use a valid Yjs update — raw bytes like [1,2,3] fail Y.applyUpdate and the relay never fires
    const sourceDoc = new Y.Doc()
    sourceDoc.getText('content').insert(0, 'relay-test')
    const validUpdate = Buffer.from(Y.encodeStateAsUpdate(sourceDoc))

    const updateReceivedByB = waitForEvent<Buffer | ArrayBuffer>(clientB, 'yjs-update')

    clientA.emit('yjs-update', validUpdate)

    const received = await updateReceivedByB
    const bytes = Buffer.isBuffer(received) ? received : Buffer.from(received as ArrayBuffer)
    expect(bytes.length).toBeGreaterThan(0)
    // Verify the received bytes decode to the same Y.Doc state
    const decodedDoc = new Y.Doc()
    Y.applyUpdate(decodedDoc, new Uint8Array(bytes))
    expect(decodedDoc.getText('content').toString()).toBe('relay-test')
  })

  it('does NOT relay yjs-update to client in different room', async () => {
    const clientA = connectClient({ cookie: 'better-auth.session_token=valid-token-C' })
    const clientB = connectClient({ cookie: 'better-auth.session_token=valid-token-D' })

    const joinedA = waitForEvent(clientA, 'room-joined')
    const joinedB = waitForEvent(clientB, 'room-joined')

    clientA.emit('join-room', 'isolation-room-1')
    clientB.emit('join-room', 'isolation-room-2')

    await Promise.all([joinedA, joinedB])

    const updateListener = jest.fn()
    clientB.on('yjs-update', updateListener)

    // Use a valid Yjs update so the server can actually relay it (even though clientB shouldn't receive it)
    const isolationDoc = new Y.Doc()
    isolationDoc.getText('x').insert(0, 'isolated')
    clientA.emit('yjs-update', Buffer.from(Y.encodeStateAsUpdate(isolationDoc)))

    await new Promise((resolve) => setTimeout(resolve, 500))

    expect(updateListener).not.toHaveBeenCalled()
  })

  it('new joiner receives full Y.Doc state', async () => {
    const roomSlug = 'state-room-1'
    const clientA = connectClient({ cookie: 'better-auth.session_token=valid-token-E' })

    const joinedA = waitForEvent(clientA, 'room-joined')
    clientA.emit('join-room', roomSlug)
    await joinedA

    // clientA writes a Y.Doc update and emits it so the server merges it
    const sourceDoc = new Y.Doc()
    sourceDoc.getText('content').insert(0, 'hello integration')
    const update = Y.encodeStateAsUpdate(sourceDoc)
    clientA.emit('yjs-update', Buffer.from(update))

    // Allow server to process
    await new Promise((resolve) => setTimeout(resolve, 100))

    // New joiner connects and joins the same room
    const clientB = connectClient({ cookie: 'better-auth.session_token=valid-token-F' })

    const joinedB = waitForEvent<{ slug: string; state: Buffer | number[] }>(clientB, 'room-joined')
    clientB.emit('join-room', roomSlug)
    const { state } = await joinedB

    // Apply the received state to a fresh Y.Doc
    const receivedDoc = new Y.Doc()
    const stateBytes = Array.isArray(state)
      ? new Uint8Array(state)
      : new Uint8Array(state as Buffer)
    Y.applyUpdate(receivedDoc, stateBytes)

    expect(receivedDoc.getText('content').toString()).toBe('hello integration')
  })

  it('rejects connection without valid session cookie', async () => {
    const unauthClient = connectClient({ cookie: '' })

    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Timeout: expected connect_error')), 5000)

      unauthClient.on('connect_error', (err: Error) => {
        clearTimeout(timer)
        expect(err.message).toContain('Unauthorized')
        expect(unauthClient.connected).toBe(false)
        resolve()
      })

      unauthClient.on('connect', () => {
        clearTimeout(timer)
        reject(new Error('Expected connection to be rejected but it connected'))
      })
    })
  })
})
