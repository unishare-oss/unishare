-- AlterTable
ALTER TABLE "user" ADD COLUMN     "identityStatus" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "identityVersion" INTEGER;

-- CreateTable
CREATE TABLE "identity_event_receipt" (
    "eventId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "identity_event_receipt_pkey" PRIMARY KEY ("eventId")
);

-- CreateTable
CREATE TABLE "identity_reconcile" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "cursor" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "identity_reconcile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "identity_event_receipt_receivedAt_idx" ON "identity_event_receipt"("receivedAt");
