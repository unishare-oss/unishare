import { ForbiddenException } from '@nestjs/common'
import { ChatController } from './chat.controller'

describe('ChatController link preview', () => {
  const chatService = { getLinkPreview: jest.fn().mockResolvedValue({ url: 'https://a.test' }) }
  const controller = new ChatController(chatService as never, {} as never)

  beforeEach(() => chatService.getLinkPreview.mockClear())

  it('refuses a guest without fetching the url', () => {
    const guest = { user: { id: 'g1', isAnonymous: true } } as never
    expect(() => controller.getLinkPreview('https://a.test', guest)).toThrow(ForbiddenException)
    expect(chatService.getLinkPreview).not.toHaveBeenCalled()
  })

  it('fetches the preview for a member', async () => {
    const member = { user: { id: 'u1', isAnonymous: false } } as never
    await controller.getLinkPreview('https://a.test', member)
    expect(chatService.getLinkPreview).toHaveBeenCalledWith('https://a.test')
  })
})
