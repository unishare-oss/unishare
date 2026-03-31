-- CreateIndex
CREATE INDEX "post_searchVector_idx" ON "post" USING GIN ("searchVector");
