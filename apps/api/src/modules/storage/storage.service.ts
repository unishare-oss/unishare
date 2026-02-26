import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
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

type UploadType = 'document' | 'image'

const FILE_TYPE_CONFIG: Record<UploadType, { allowedMimeTypes: string[]; maxSize: number }> = {
  document: {
    allowedMimeTypes: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    maxSize: 50 * 1024 * 1024, // 50MB
  },
  image: {
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
    maxSize: 10 * 1024 * 1024, // 10MB
  },
}

@Injectable()
export class StorageService implements OnModuleInit {
  private s3Client: S3Client
  private bucket: string
  private publicUrl: string

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
  ): Promise<{ url: string; key: string }> {
    const typeConfig = FILE_TYPE_CONFIG[uploadType]

    if (!typeConfig.allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        `Invalid file type. Allowed: ${typeConfig.allowedMimeTypes.join(', ')}`,
      )
    }

    const key = `${folder}/${this.generateFileName(mimeType)}`
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: mimeType })
    const url = await getSignedUrl(this.s3Client, command, { expiresIn })

    return { url, key }
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
}

const MIME_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
