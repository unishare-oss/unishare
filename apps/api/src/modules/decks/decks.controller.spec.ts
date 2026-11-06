import { UnauthorizedException } from '@nestjs/common'
import type { Response } from 'express'
import type { UserSession } from '@/auth/auth.config'
import { DecksController } from './decks.controller'
import type { DecksService } from './decks.service'
import type { DecksFrameAuthService } from './decks.frame-auth.service'

jest.mock('@/auth/auth.config', () => ({ auth: {} }))

describe('DecksController.frameAuthorize', () => {
  const frameAuth = { authorize: jest.fn().mockResolvedValue('generator=cookie') }
  const controller = new DecksController(
    {} as DecksService,
    frameAuth as unknown as DecksFrameAuthService,
  )
  const res = { setHeader: jest.fn() } as unknown as Response
  const session = (isAnonymous: boolean) =>
    ({ user: { id: 'u1', role: 'STUDENT', isAnonymous } }) as unknown as UserSession

  beforeEach(() => jest.clearAllMocks())

  it('answers a guest 401 like a signed-out caller, without a generator session', async () => {
    await expect(
      controller.frameAuthorize(session(true), res, '/presentation', 'GET'),
    ).rejects.toThrow(UnauthorizedException)
    expect(frameAuth.authorize).not.toHaveBeenCalled()
    expect(res.setHeader).not.toHaveBeenCalled()
  })

  it('still authorizes a member', async () => {
    await controller.frameAuthorize(session(false), res, '/presentation', 'GET')
    expect(frameAuth.authorize).toHaveBeenCalledWith('u1', '/presentation', 'STUDENT', 'GET')
    expect(res.setHeader).toHaveBeenCalledWith('Cookie', 'generator=cookie')
  })
})
