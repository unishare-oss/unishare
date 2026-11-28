import { Injectable } from '@nestjs/common'
import { PrismaService } from '@/prisma/prisma.service'
import type { PendingUploadReference } from './pending-uploads.types'

const CLEANUP_BATCH_SIZE = 100

@Injectable()
export class PendingUploadsRepository {
  constructor(private readonly prisma: PrismaService) {}

  static claimableWhere(ownerId: string, references: PendingUploadReference[], now = new Date()) {
    return {
      ownerId,
      expiresAt: { gt: now },
      cleanupReservedAt: null,
      OR: references.map(({ key, mimeType }) => ({ key, mimeType })),
    }
  }

  register(ownerId: string, key: string, mimeType: string, expiresAt: Date) {
    return this.prisma.pendingUpload.create({ data: { key, ownerId, mimeType, expiresAt } })
  }

  findByKey(key: string) {
    return this.prisma.pendingUpload.findUnique({ where: { key } })
  }

  findClaimableByKey(ownerId: string, reference: PendingUploadReference) {
    return this.prisma.pendingUpload.findFirst({
      where: PendingUploadsRepository.claimableWhere(ownerId, [reference]),
    })
  }

  findAvailable(ownerId: string, references: PendingUploadReference[]) {
    return this.prisma.pendingUpload.findMany({
      where: PendingUploadsRepository.claimableWhere(ownerId, references),
    })
  }

  findExpired(now: Date, reclaimBefore: Date) {
    return this.prisma.pendingUpload.findMany({
      where: {
        expiresAt: { lte: now },
        OR: [{ cleanupReservedAt: null }, { cleanupReservedAt: { lt: reclaimBefore } }],
      },
      orderBy: { expiresAt: 'asc' },
      take: CLEANUP_BATCH_SIZE,
      select: { key: true },
    })
  }

  reserveExpired(key: string, now: Date, reclaimBefore: Date) {
    return this.prisma.pendingUpload.updateMany({
      where: {
        key,
        expiresAt: { lte: now },
        OR: [{ cleanupReservedAt: null }, { cleanupReservedAt: { lt: reclaimBefore } }],
      },
      data: { cleanupReservedAt: now },
    })
  }

  deleteReserved(key: string, reservedAt: Date) {
    return this.prisma.pendingUpload.deleteMany({ where: { key, cleanupReservedAt: reservedAt } })
  }

  releaseReservation(key: string, reservedAt: Date) {
    return this.prisma.pendingUpload.updateMany({
      where: { key, cleanupReservedAt: reservedAt },
      data: { cleanupReservedAt: null },
    })
  }
}
