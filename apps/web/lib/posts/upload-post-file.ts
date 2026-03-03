import { storageControllerGetPresignedUploadUrl } from '@/src/lib/api/generated/storage/storage'
import {
  PresignedUploadDtoPurpose,
  PresignedUploadDtoUploadType,
  type PresignedUploadEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'

export async function uploadPostFile(file: File) {
  const uploadType = file.type.startsWith('image/')
    ? PresignedUploadDtoUploadType.image
    : PresignedUploadDtoUploadType.document

  const presignedRes = await storageControllerGetPresignedUploadUrl({
    mimeType: file.type,
    uploadType,
    purpose: PresignedUploadDtoPurpose['post-attachment'],
  })

  const { url, key } = presignedRes.data as PresignedUploadEntity

  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': file.type },
  })

  return {
    key,
    name: file.name,
    size: file.size,
    mimeType: file.type,
  }
}
