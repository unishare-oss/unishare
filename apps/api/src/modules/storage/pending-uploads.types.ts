export interface PendingUploadReference {
  key: string
  mimeType: string
}

export interface PendingUploadFile {
  key: string
  name: string
  size: number
  mimeType: string
}

export const PENDING_UPLOAD_TTL_MS = 24 * 60 * 60 * 1000
