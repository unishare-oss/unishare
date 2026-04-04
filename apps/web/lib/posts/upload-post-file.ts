import {
  storageControllerAbortMultipartUpload,
  storageControllerCompleteMultipartUpload,
  storageControllerCreateMultipartUpload,
  storageControllerGetPresignedUploadUrl,
  storageControllerUploadPart,
} from '@/src/lib/api/generated/storage/storage'
import {
  PresignedUploadDtoPurpose,
  PresignedUploadDtoUploadType,
  type MultipartUploadEntity,
  type PresignedUploadEntity,
  type UploadedPartEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'

const MULTIPART_THRESHOLD = 10 * 1024 * 1024 // 10MB — use multipart above this
const CHUNK_SIZE = 5 * 1024 * 1024 // 5MB per part (S3 minimum)
const MAX_PARALLEL_CHUNKS = 3

function getFileExtension(name: string): string {
  const parts = name.toLowerCase().split('.')
  return parts.length > 1 ? (parts.at(-1) ?? '') : ''
}

function getUploadMimeType(file: File): string {
  const ext = getFileExtension(file.name)

  if (ext === 'json') return 'application/json'
  if (ext === 'md' || ext === 'markdown') return 'text/markdown'

  const codeExts = new Set([
    'txt',
    'js',
    'jsx',
    'ts',
    'tsx',
    'py',
    'java',
    'go',
    'rs',
    'sql',
    'sh',
    'yml',
    'yaml',
  ])

  if (codeExts.has(ext)) return 'text/plain'

  return file.type
}

function getUploadType(mimeType: string): PresignedUploadDtoUploadType {
  if (mimeType.startsWith('image/')) return PresignedUploadDtoUploadType.image
  if (mimeType.startsWith('video/')) return PresignedUploadDtoUploadType.video
  return PresignedUploadDtoUploadType.document
}

async function uploadMultipart(
  file: File,
  mimeType: string,
  onProgress?: (pct: number) => void,
): Promise<{ key: string; name: string; size: number; mimeType: string }> {
  const uploadType = getUploadType(mimeType)

  const createRes = await storageControllerCreateMultipartUpload({
    mimeType,
    uploadType,
    purpose: PresignedUploadDtoPurpose['post-attachment'],
  })
  const { uploadId, key } = createRes.data as MultipartUploadEntity

  const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
  let completedChunks = 0

  try {
    // Upload chunks via API (proxy to R2) with limited concurrency
    for (let i = 0; i < totalChunks; i += MAX_PARALLEL_CHUNKS) {
      const batch = Array.from(
        { length: Math.min(MAX_PARALLEL_CHUNKS, totalChunks - i) },
        (_, j) => i + j,
      )

      await Promise.all(
        batch.map(async (chunkIndex) => {
          const partNumber = chunkIndex + 1
          const start = chunkIndex * CHUNK_SIZE
          const end = Math.min(start + CHUNK_SIZE, file.size)
          const chunk = file.slice(start, end)

          // Send chunk to API — API uploads to R2 and caches the ETag server-side
          const res = await storageControllerUploadPart({
            key,
            uploadId,
            partNumber,
            chunk,
          })
          const { etag } = res.data as UploadedPartEntity
          if (!etag) throw new Error(`Part ${partNumber} upload returned no ETag`)

          completedChunks++
          onProgress?.(Math.round((completedChunks / totalChunks) * 100))
        }),
      )
    }

    await storageControllerCompleteMultipartUpload({ key, uploadId })

    return { key, name: file.name, size: file.size, mimeType }
  } catch (err) {
    await storageControllerAbortMultipartUpload({ key, uploadId }).catch(() => {})
    throw err
  }
}

export async function uploadPostFile(
  file: File,
  onProgress?: (pct: number) => void,
): Promise<{ key: string; name: string; size: number; mimeType: string }> {
  const mimeType = getUploadMimeType(file)
  if (!mimeType) throw new Error('Unsupported file type')

  if (file.size > MULTIPART_THRESHOLD) {
    return uploadMultipart(file, mimeType, onProgress)
  }

  const uploadType = getUploadType(mimeType)

  const presignedRes = await storageControllerGetPresignedUploadUrl({
    mimeType,
    uploadType,
    purpose: PresignedUploadDtoPurpose['post-attachment'],
  })

  const { url, key } = presignedRes.data as PresignedUploadEntity

  await fetch(url, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': mimeType },
  })

  onProgress?.(100)

  return { key, name: file.name, size: file.size, mimeType }
}
