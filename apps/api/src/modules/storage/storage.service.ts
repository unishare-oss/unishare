import {
  AbortMultipartUploadCommand,
  CompleteMultipartUploadCommand,
  CreateMultipartUploadCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
  UploadPartCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  OnModuleInit,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as crypto from 'crypto'

type UploadType = 'document' | 'image' | 'video'

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
}

@Injectable()
export class StorageService implements OnModuleInit {
  private s3Client: S3Client
  private bucket: string
  private publicUrl: string
  private readonly partEtagCache = new Map<string, Map<number, string>>()

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    this.s3Client = new S3Client({
      region: this.config.get('S3_REGION') ?? 'auto',
      endpoint: this.config.getOrThrow('S3_ENDPOINT'),
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.getOrThrow('S3_ACCESS_KEY_ID'),
        secretAccessKey: this.config.getOrThrow('S3_SECRET_ACCESS_KEY'),
      },
    })

    this.bucket = this.config.getOrThrow('S3_BUCKET')
    this.publicUrl = this.config.getOrThrow('STORAGE_PUBLIC_URL')
  }

  async generatePresignedUploadUrl(
    folder: string,
    mimeType: string,
    uploadType: UploadType = 'document',
    expiresIn = 3600,
  ): Promise<{ url: string; key: string; publicUrl: string }> {
    const typeConfig = FILE_TYPE_CONFIG[uploadType]

    if (!typeConfig.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${typeConfig.allowedMimeTypes.join(', ')}`,
      )
    }

    const key = `${folder}/${this.generateFileName(mimeType)}`
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mimeType })
    const url = await getSignedUrl(this.s3Client, command, { expiresIn })

    return { url, key, publicUrl: this.getPublicUrl(key) }
  }

  async generatePresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
    this.assertSafeKey(key)
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key })
    return getSignedUrl(this.s3Client, command, { expiresIn })
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

  getPublicUrl(key: string): string {
    return `${this.publicUrl}/${key}`
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
  'image/png': 'png',
  'image/webp': 'webp',
  // Video
  'video/mp4': 'mp4',
  'video/webm': 'webm',
  'video/ogg': 'ogv',
  'video/quicktime': 'mov',
  'video/x-msvideo': 'avi',
  'video/x-matroska': 'mkv',
}
