ALTER TABLE "carts" ADD COLUMN "mergedAt" TIMESTAMPTZ(3);
ALTER TABLE "carts" ADD CONSTRAINT "carts_merge_guest_only" CHECK ("mergedAt" IS NULL OR "sessionId" IS NOT NULL);
CREATE TABLE "auth_throttles" (
  "key" TEXT PRIMARY KEY,
  "attempts" INTEGER NOT NULL CHECK ("attempts" >= 1),
  "resetsAt" TIMESTAMPTZ(3) NOT NULL
);
CREATE INDEX "auth_throttles_resetsAt_idx" ON "auth_throttles" ("resetsAt");
