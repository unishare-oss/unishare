import { storageControllerGetPresignedUploadUrl } from '@/src/lib/api/generated/storage/storage'
import {
  PresignedUploadDtoPurpose,
  PresignedUploadDtoUploadType,
  type PresignedUploadEntity,
} from '@/src/lib/api/generated/unishareAPI.schemas'

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

export async function uploadPostFile(file: File) {
  const mimeType = getUploadMimeType(file)
  if (!mimeType) throw new Error('Unsupported file type')

  const uploadType = mimeType.startsWith('image/')
    ? PresignedUploadDtoUploadType.image
    : PresignedUploadDtoUploadType.document

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

  return {
    key,
    name: file.name,
    size: file.size,
    mimeType,
  }
}
