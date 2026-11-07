import { ForbiddenException } from '@nestjs/common'
import type { UserSession } from '@/auth/auth.config'
import type { CollabService } from '@/modules/collab/collab.service'
import { StorageController } from './storage.controller'
import type { StorageService } from './storage.service'
import type { PresignedUploadDto } from './dto/presigned-upload.dto'

jest.mock('@/auth/auth.config', () => ({ auth: {} }))
jest.mock('@/modules/collab/collab.service', () => ({ CollabService: class {} }))

describe('StorageController.getPresignedUploadUrl', () => {
  const storage = { generatePresignedUploadUrl: jest.fn().mockResolvedValue({ url: 'u' }) }
  const collab = { assertCanEdit: jest.fn().mockResolvedValue(undefined) }
  const controller = new StorageController(
    storage as unknown as StorageService,
    collab as unknown as CollabService,
  )
  const guest = { user: { id: 'g1', role: 'STUDENT', isAnonymous: true } } as unknown as UserSession
  const dto = (purpose: string, roomSlug?: string) =>
    ({ purpose, roomSlug, mimeType: 'image/png', uploadType: 'image' }) as PresignedUploadDto

  beforeEach(() => jest.clearAllMocks())

  it('lets a guest attach to a canvas board, leaving the edit check to the board', async () => {
    await controller.getPresignedUploadUrl(dto('board-attachment', 'room1'), guest)
    expect(collab.assertCanEdit).toHaveBeenCalledWith('room1', guest)
    expect(storage.generatePresignedUploadUrl).toHaveBeenCalled()
  })

  it('refuses a guest uploading a post attachment with 403', async () => {
    await expect(controller.getPresignedUploadUrl(dto('post-attachment'), guest)).rejects.toThrow(
      ForbiddenException,
    )
    expect(storage.generatePresignedUploadUrl).not.toHaveBeenCalled()
  })
})
