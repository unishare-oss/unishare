import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { auth } from '@/auth/auth.config'
import { PrismaService } from '@/prisma/prisma.service'
import { UniauthThemeService } from './uniauth-theme.service'

jest.mock('@/auth/auth.config', () => ({ auth: { api: { getAccessToken: jest.fn() } } }))

describe('UniauthThemeService', () => {
  const prisma = { account: { findFirst: jest.fn() } }
  const fetchMock = jest.fn()
  const originalFetch = global.fetch
  const token = auth.api.getAccessToken as jest.Mock
  let service: UniauthThemeService

  beforeEach(() => {
    jest.clearAllMocks()
    service = new UniauthThemeService(prisma as unknown as PrismaService)
    global.fetch = fetchMock
    prisma.account.findFirst.mockResolvedValue({ id: 'local-account-row' })
    token.mockResolvedValue({ accessToken: 'server-only-token' })
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ theme: 'theme-nord' }), { status: 200 }),
    )
  })
  afterAll(() => {
    global.fetch = originalFetch
  })

  it('refreshes the linked account token server-side, never using the local user as the OAuth subject', async () => {
    await expect(service.exchange('local-user', 'theme-nord')).resolves.toEqual({
      theme: 'theme-nord',
    })
    expect(prisma.account.findFirst).toHaveBeenCalledWith({
      where: { userId: 'local-user', providerId: 'uniauth' },
      select: { id: true },
    })
    expect(token).toHaveBeenCalledWith({
      body: { accountId: 'local-account-row', userId: 'local-user' },
    })
    const [url, request] = fetchMock.mock.calls[0]
    expect(String(url)).toBe('http://uniauth.test/api/preferences/theme/exchange')
    expect(request.redirect).toBe('error')
    expect(request.headers.Authorization).toMatch(/^Basic /)
    expect(JSON.parse(request.body)).toEqual({
      accessToken: 'server-only-token',
      theme: 'theme-nord',
    })
  })

  it('reads without writing a preference and permits an unset account theme', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ theme: null }), { status: 200 }))
    await expect(service.exchange('local-user')).resolves.toEqual({ theme: null })
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      accessToken: 'server-only-token',
    })
  })

  it('rejects users with no linked UniAuth account', async () => {
    prisma.account.findFirst.mockResolvedValue(null)
    await expect(service.exchange('guest')).rejects.toBeInstanceOf(UnauthorizedException)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('does not claim success when upstream rejects the request or returns an unknown theme', async () => {
    fetchMock.mockResolvedValueOnce(new Response('{}', { status: 403 }))
    await expect(service.exchange('local-user')).rejects.toBeInstanceOf(ServiceUnavailableException)
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify({ theme: 'theme-missing' }), { status: 200 }),
    )
    await expect(service.exchange('local-user')).rejects.toBeInstanceOf(ServiceUnavailableException)
  })
})
