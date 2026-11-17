-- CreateTable
CREATE TABLE "pending_upload" (
    "key" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "cleanupReservedAt" TIMESTAMP(3),

    CONSTRAINT "pending_upload_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "pending_upload_expiresAt_idx" ON "pending_upload"("expiresAt");
