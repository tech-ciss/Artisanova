ALTER TABLE "orders" ADD COLUMN "accessTokenExpiresAt" TIMESTAMPTZ(3);
CREATE TABLE "checkout_drafts" (
 "id" TEXT PRIMARY KEY, "tokenHash" TEXT NOT NULL UNIQUE, "cartId" TEXT NOT NULL,
 "ownerKey" TEXT NOT NULL, "data" JSONB NOT NULL, "fingerprint" TEXT NOT NULL,
 "expiresAt" TIMESTAMPTZ(3) NOT NULL, "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "orderId" TEXT UNIQUE,
 CONSTRAINT "checkout_drafts_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "carts"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "checkout_drafts_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE,
 CONSTRAINT "checkout_drafts_expiration" CHECK ("expiresAt" > "createdAt")
);
CREATE INDEX "checkout_drafts_expiresAt_idx" ON "checkout_drafts" ("expiresAt");
CREATE INDEX "checkout_drafts_cartId_idx" ON "checkout_drafts" ("cartId");
