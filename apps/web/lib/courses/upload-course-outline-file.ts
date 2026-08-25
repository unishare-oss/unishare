import { storageControllerGetPresignedUploadUrl } from '@/src/lib/api/generated/storage/storage'
import {
  PresignedUploadDtoPurpose,
  PresignedUploadDtoUploadType,
  type PresignedUploadEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'
import { putToPresignedUrl, sha256Base64 } from '@/src/lib/upload'

const SUPPORTED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]

/** Uploads a syllabus/outline file to S3 via presigned PUT and returns its storage key. */
export async function uploadCourseOutlineFile(
  file: File,
): Promise<{ key: string; mimeType: string }> {
  if (!SUPPORTED_MIME_TYPES.includes(file.type)) {
    throw new Error('Only PDF and Word documents are supported')
  }

  const presignedRes = await storageControllerGetPresignedUploadUrl({
    mimeType: file.type,
    uploadType: PresignedUploadDtoUploadType.document,
    purpose: PresignedUploadDtoPurpose['course-outline'],
    checksumSha256: await sha256Base64(file),
  })

  const { url, key } = presignedRes.data as PresignedUploadEntity
  await putToPresignedUrl(url, file, file.type)

  return { key, mimeType: file.type }
}
