-- The uniauth session (ID token sid) each unishare session came from, so a back-channel
-- logout for one device ends only that device's sessions.
ALTER TABLE "session" ADD COLUMN "uniauthSid" TEXT;
CREATE INDEX "session_uniauthSid_idx" ON "session"("uniauthSid");
