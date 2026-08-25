import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

type UploadType = 'document' | 'image' | 'video' | 'encrypted-blob'

const FILE_TYPE_CONFIG: Record<UploadType, { allowedMimeTypes: string[]; maxSize: number }> = {
  document: {
    allowedMimeTypes: [
      // Office documents
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      // LibreOffice
      'application/vnd.oasis.opendocument.text',
      'application/vnd.oasis.opendocument.presentation',
      'application/vnd.oasis.opendocument.spreadsheet',
      // E-books
      'application/epub+zip',
      // Text / code
      'text/plain',
      'text/markdown',
      'text/html',
      'text/css',
      'text/csv',
      'application/json',
      // Archives
      'application/zip',
      'application/x-zip-compressed',
      'application/x-tar',
      'application/gzip',
      // Images
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'image/tiff',
      'image/bmp',
      'image/avif',
      'image/heic',
      'image/heif',
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  image: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
  video: {
    allowedMimeTypes: [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
    ],
    maxSize: 500 * 1024 * 1024, // 500MB
  },
  // Client-side AES-GCM ciphertext (board images — see docs/board-e2e-encryption/planning.md).
  // The real image MIME type is meaningless once encrypted, so only one "type" is allowed.
  'encrypted-blob': {
    allowedMimeTypes: ['application/octet-stream'],
    maxSize: 10 * 1024 * 1024, // 10MB — matches the plaintext `image` cap plus GCM/base64 overhead
  },
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name)
  /** Server-side operations. Uses S3_INTERNAL_ENDPOINT when configured. */
  private s3Client: S3Client
  /** Presigning only. Always the browser-reachable S3_ENDPOINT. */
  private signingClient: S3Client
  private bucket: string
  private publicUrl: string
  private readonly partEtagCache = new Map<string, Map<number, string>>()

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    // Two endpoints, two clients.
    //
    // S3_ENDPOINT must be reachable by BROWSERS, because presigned URLs are
    // signed for a specific host -- sign one against an in-cluster address and
    // the browser cannot use it. Every other operation (head, delete, the whole
    // multipart flow) is server-to-server and has no such requirement.
    //
    // Left as one endpoint, a self-hosted setup sends server-side calls out to
    // the public internet and back to reach storage sitting beside it: added
    // latency on every request, plus a hard dependency on the ingress/CDN path
    // for operations that never needed it. S3_INTERNAL_ENDPOINT lets those take
    // the direct route (e.g. http://garage.garage.svc.cluster.local:3900).
    //
    // Optional: unset, both clients use S3_ENDPOINT and behaviour is unchanged.
    const publicEndpoint = this.config.getOrThrow<string>('S3_ENDPOINT')
    const internalEndpoint = this.config.get<string>('S3_INTERNAL_ENDPOINT') ?? publicEndpoint

    const shared = {
      region: this.config.get('S3_REGION') ?? 'auto',
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow('S3_SECRET_ACCESS_KEY'),
      },
    }

    this.s3Client = new S3Client({ ...shared, endpoint: internalEndpoint })
    this.signingClient = new S3Client({
      ...shared,
      endpoint: publicEndpoint,
      requestChecksumCalculation: 'WHEN_REQUIRED',
    })

    this.bucket = this.config.getOrThrow('S3_BUCKET')
    this.publicUrl = this.config.getOrThrow('STORAGE_PUBLIC_URL')
  }

  async generatePresignedUploadUrl(
    folder: string,
    mimeType: string,
    uploadType: UploadType = 'document',
    { expiresIn = 3600, checksumSha256 }: { expiresIn?: number; checksumSha256?: string } = {},
  ): Promise<{ url: string; key: string; publicUrl: string }> {
    const typeConfig = FILE_TYPE_CONFIG[uploadType]

    if (!typeConfig.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${typeConfig.allowedMimeTypes.join(', ')}`,
      )
    }

    const key = `${folder}/${this.generateFileName(mimeType)}`
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
      ...(checksumSha256 && { ChecksumSHA256: checksumSha256 }),
    })
    // signingClient, not s3Client: the browser performs this PUT.
    const url = await getSignedUrl(this.signingClient, command, { expiresIn })

    return { url, key, publicUrl: this.getPublicUrl(key) }
  }

  async generatePresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    this.assertSafeKey(key)
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    // signingClient, not s3Client: the browser performs this GET.
    return getSignedUrl(this.signingClient, command, { expiresIn })
  }

  /** Fetches an object's bytes directly (e.g. to run text extraction server-side). */
  async getObjectBuffer(key: string): Promise<Buffer> {
    this.assertSafeKey(key)
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    const response = await this.s3Client.send(command)
    const bytes = await response.Body?.transformToByteArray()
    if (!bytes) throw new InternalServerErrorException(`Empty object body for key ${key}`)
    return Buffer.from(bytes)
  }

  async uploadBuffer(
    folder: string,
    buffer: Buffer,
    mimeType: string,
    uploadType: UploadType = 'document',
  ): Promise<{ key: string; publicUrl: string }> {
    this.assertSafeKey(folder)
    const typeConfig = FILE_TYPE_CONFIG[uploadType]
    if (!typeConfig.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${typeConfig.allowedMimeTypes.join(', ')}`,
      )
    }
    const key = `${folder}/${this.generateFileName(mimeType)}`
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
    })
    await this.s3Client.send(command)
    return { key, publicUrl: this.getPublicUrl(key) }
  }

  /**
   * Turns a stored `publicUrl` (built by getPublicUrl, e.g. on a chat message or
   * room avatar) into a fresh presigned GET so the browser can actually load it —
   * the bucket has no anonymous-read/website mode, so the raw publicUrl alone is
   * never fetchable. Swallows failures (e.g. a legacy value that isn't one of our
   * keys) so one bad record can't break an entire message list.
   */
  async resolveDownloadUrl(url: string | null | undefined): Promise<string | null> {
    if (!url) return null
    try {
      const key = this.extractKeyFromUrl(url)
      return await this.generatePresignedDownloadUrl(key)
    } catch (err) {
      this.logger.warn(`Could not resolve download URL for ${url}: ${err}`)
      return null
    }
  }

  private assertSafeKey(key: string): void {
    if (!/^[a-zA-Z0-9/_\-.]+$/.test(key) || key.includes('..')) {
      throw new InternalServerErrorException('Invalid storage key')
    }
  }

  async fileExists(key: string): Promise<boolean> {
    this.assertSafeKey(key)
    try {
      await this.s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }))
      return true
    } catch {
      return false
    }
  }

  async deleteFile(key: string): Promise<void> {
    this.assertSafeKey(key)
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key })
    await this.s3Client.send(command)
  }

  /** Deletes every object under a folder prefix, e.g. `boards/{slug}/` on room deletion. */
  async deleteFolder(prefix: string): Promise<void> {
    this.assertSafeKey(prefix)
    let continuationToken: string | undefined
    do {
      const listing = await this.s3Client.send(
        new ListObjectsV2Command({
          Bucket: this.bucket,
          Prefix: `${prefix}/`,
          ContinuationToken: continuationToken,
        }),
      )
      const keys = (listing.Contents ?? []).flatMap((obj) => (obj.Key ? [{ Key: obj.Key }] : []))
      if (keys.length > 0) {
        await this.s3Client.send(
          new DeleteObjectsCommand({ Bucket: this.bucket, Delete: { Objects: keys } }),
        )
      }
      continuationToken = listing.IsTruncated ? listing.NextContinuationToken : undefined
    } while (continuationToken)
  }

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`
  }

  extractKeyFromUrl(url: string): string {
    return url.replace(`${this.publicUrl}/`, '')
  }

  getAllowedMimeTypes(uploadType: UploadType): string[] {
    return FILE_TYPE_CONFIG[uploadType].allowedMimeTypes
  }

  getMaxFileSize(uploadType: UploadType): number {
    return FILE_TYPE_CONFIG[uploadType].maxSize
  }

  private generateFileName(mimeType: string): string {
    const ext = MIME_EXTENSIONS[mimeType] ?? 'bin'
    const random = crypto.randomBytes(8).toString('hex')
    return `${Date.now()}-${random}.${ext}`
  }

  async createMultipartUpload(
    folder: string,
    mimeType: string,
    uploadType: UploadType,
  ): Promise<{ uploadId: string; key: string }> {
    const typeConfig = FILE_TYPE_CONFIG[uploadType]
    if (!typeConfig.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${typeConfig.allowedMimeTypes.join(', ')}`,
      )
    }
    const key = `${folder}/${this.generateFileName(mimeType)}`
    const command = new CreateMultipartUploadCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: mimeType,
    })
    const result = await this.s3Client.send(command)
    return { uploadId: result.UploadId!, key }
  }

  async uploadPart(
    key: string,
    uploadId: string,
    partNumber: number,
    chunk: Buffer,
  ): Promise<{ etag: string }> {
    this.assertSafeKey(key)
    const result = await this.s3Client.send(
      new UploadPartCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
        Body: chunk,
      }),
    )
    const etag = result.ETag!
    if (!this.partEtagCache.has(uploadId)) {
      this.partEtagCache.set(uploadId, new Map())
    }
    this.partEtagCache.get(uploadId)!.set(partNumber, etag)
    return { etag }
  }

  async completeMultipartUpload(key: string, uploadId: string): Promise<void> {
    this.assertSafeKey(key)
    const partMap = this.partEtagCache.get(uploadId)
    if (!partMap || partMap.size === 0) {
      throw new BadRequestException('No uploaded parts found for this upload session')
    }
    const parts = Array.from(partMap.entries())
      .sort(([a], [b]) => a - b)
      .map(([PartNumber, ETag]) => ({ PartNumber, ETag }))
    await this.s3Client.send(
      new CompleteMultipartUploadCommand({
        Bucket: this.bucket,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: { Parts: parts },
      }),
    )
    this.partEtagCache.delete(uploadId)
  }

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    this.assertSafeKey(key)
    await this.s3Client.send(
      new AbortMultipartUploadCommand({ Bucket: this.bucket, Key: key, UploadId: uploadId }),
    )
    this.partEtagCache.delete(uploadId)
  }
}

const MIME_EXTENSIONS: Record<string, string> = {
  // Office
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  // LibreOffice
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.presentation': 'odp',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  // E-books
  'application/epub+zip': 'epub',
  // Text / code
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/html': 'html',
  'text/css': 'css',
  'text/csv': 'csv',
  'application/json': 'json',
  // Archives
  'application/zip': 'zip',
  'application/x-zip-compressed': 'zip',
  'application/x-tar': 'tar',
  'application/gzip': 'gz',
  // Images
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/tiff': 'tiff',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
  'image/heic': 'heic',
  'image/heif': 'heif',
  // Video
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/x-matroska': 'mkv',
}
