-- CreateTable
CREATE TABLE "room" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT,
    "ownerId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "snapshot" BYTEA,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_slug_key" ON "room"("slug");

-- CreateIndex
CREATE INDEX "room_ownerId_idx" ON "room"("ownerId");

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
