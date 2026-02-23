-- Role enum transition
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'ADMIN'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'ADMIN' TO 'SUPER_ADMIN';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'Role' AND e.enumlabel = 'ISSUER'
  ) THEN
    ALTER TYPE "Role" RENAME VALUE 'ISSUER' TO 'VERIFIED_ISSUER';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type
    WHERE typname = 'IssuerStatus'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'IssuerStatus' AND e.enumlabel = 'PENDING'
    ) OR NOT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'IssuerStatus' AND e.enumlabel = 'REJECTED'
    ) THEN
      ALTER TABLE "issuers"
        ALTER COLUMN "status" DROP DEFAULT;
      ALTER TYPE "IssuerStatus" RENAME TO "IssuerStatus_old";
      CREATE TYPE "IssuerStatus" AS ENUM ('PENDING', 'ACTIVE', 'REVOKED', 'REJECTED');
      ALTER TABLE "issuers"
        ALTER COLUMN "status" TYPE "IssuerStatus"
        USING ("status"::text::"IssuerStatus");
      DROP TYPE "IssuerStatus_old";
    END IF;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'InstitutionStatus') THEN
    CREATE TYPE "InstitutionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WalletRotationStatus') THEN
    CREATE TYPE "WalletRotationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
  END IF;
END $$;

-- Institutions governance fields
ALTER TABLE "institutions"
  ADD COLUMN IF NOT EXISTS "status" "InstitutionStatus",
  ADD COLUMN IF NOT EXISTS "verified" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "admin_wallet" VARCHAR(42),
  ADD COLUMN IF NOT EXISTS "requested_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewed_by_id" TEXT,
  ADD COLUMN IF NOT EXISTS "review_notes" VARCHAR(512);

UPDATE "institutions"
SET "status" = 'APPROVED'
WHERE "status" IS NULL;

ALTER TABLE "institutions"
  ALTER COLUMN "status" SET DEFAULT 'PENDING',
  ALTER COLUMN "status" SET NOT NULL;

UPDATE "institutions"
SET "verified" = TRUE
WHERE "status" = 'APPROVED';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institutions_requested_by_id_fkey'
  ) THEN
    ALTER TABLE "institutions"
      ADD CONSTRAINT "institutions_requested_by_id_fkey"
      FOREIGN KEY ("requested_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'institutions_reviewed_by_id_fkey'
  ) THEN
    ALTER TABLE "institutions"
      ADD CONSTRAINT "institutions_reviewed_by_id_fkey"
      FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "institutions_status_idx" ON "institutions"("status");
CREATE INDEX IF NOT EXISTS "institutions_verified_idx" ON "institutions"("verified");
CREATE INDEX IF NOT EXISTS "institutions_admin_wallet_idx" ON "institutions"("admin_wallet");
CREATE UNIQUE INDEX IF NOT EXISTS "institutions_admin_wallet_key" ON "institutions"("admin_wallet");

-- Issuer governance fields
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issuers' AND column_name = 'approvedAt'
  ) THEN
    ALTER TABLE "issuers" RENAME COLUMN "approvedAt" TO "approved_at";
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'issuers' AND column_name = 'revokedAt'
  ) THEN
    ALTER TABLE "issuers" RENAME COLUMN "revokedAt" TO "revoked_at";
  END IF;
END $$;

ALTER TABLE "issuers"
  ADD COLUMN IF NOT EXISTS "wallet_address" VARCHAR(42),
  ADD COLUMN IF NOT EXISTS "approved" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "requested_at" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "review_notes" VARCHAR(512);

UPDATE "issuers" i
SET "wallet_address" = u."walletAddress"
FROM "users" u
WHERE i."userId" = u."id"
  AND i."wallet_address" IS NULL;

UPDATE "issuers"
SET "requested_at" = COALESCE("requested_at", "createdAt")
WHERE "requested_at" IS NULL;

UPDATE "issuers"
SET "approved" = CASE WHEN "status" = 'ACTIVE' THEN TRUE ELSE FALSE END;

UPDATE "issuers"
SET "approved_at" = NULL
WHERE "status" <> 'ACTIVE';

ALTER TABLE "issuers"
  ALTER COLUMN "wallet_address" SET NOT NULL,
  ALTER COLUMN "requested_at" SET NOT NULL,
  ALTER COLUMN "approved_at" DROP NOT NULL,
  ALTER COLUMN "approved_at" DROP DEFAULT,
  ALTER COLUMN "status" SET DEFAULT 'PENDING';

CREATE UNIQUE INDEX IF NOT EXISTS "issuers_wallet_address_key" ON "issuers"("wallet_address");
CREATE INDEX IF NOT EXISTS "issuers_wallet_address_idx" ON "issuers"("wallet_address");
CREATE INDEX IF NOT EXISTS "issuers_approved_idx" ON "issuers"("approved");

-- Auth nonce hardening
ALTER TABLE "auth_nonces"
  ADD COLUMN IF NOT EXISTS "ip_address" VARCHAR(64),
  ADD COLUMN IF NOT EXISTS "attempts" INTEGER NOT NULL DEFAULT 0;

-- Auth session + refresh lifecycle
CREATE TABLE IF NOT EXISTS "auth_sessions" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "wallet_address" VARCHAR(42) NOT NULL,
  "chain_id" INTEGER NOT NULL,
  "user_agent" VARCHAR(512),
  "ip_address" VARCHAR(64),
  "csrf_token_hash" VARCHAR(128),
  "expires_at" TIMESTAMP(3) NOT NULL,
  "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revoked_at" TIMESTAMP(3),
  "revoke_reason" VARCHAR(255),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "auth_sessions_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "auth_sessions_user_id_idx" ON "auth_sessions"("user_id");
CREATE INDEX IF NOT EXISTS "auth_sessions_wallet_address_idx" ON "auth_sessions"("wallet_address");
CREATE INDEX IF NOT EXISTS "auth_sessions_expires_at_idx" ON "auth_sessions"("expires_at");
CREATE INDEX IF NOT EXISTS "auth_sessions_revoked_at_idx" ON "auth_sessions"("revoked_at");

CREATE TABLE IF NOT EXISTS "refresh_tokens" (
  "id" TEXT PRIMARY KEY,
  "session_id" TEXT NOT NULL,
  "token_hash" VARCHAR(128) NOT NULL UNIQUE,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "revoked_at" TIMESTAMP(3),
  "replaced_by_token_id" TEXT UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_session_id_fkey"
    FOREIGN KEY ("session_id") REFERENCES "auth_sessions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "refresh_tokens_replaced_by_token_id_fkey"
    FOREIGN KEY ("replaced_by_token_id") REFERENCES "refresh_tokens"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "refresh_tokens_session_id_idx" ON "refresh_tokens"("session_id");
CREATE INDEX IF NOT EXISTS "refresh_tokens_expires_at_idx" ON "refresh_tokens"("expires_at");
CREATE INDEX IF NOT EXISTS "refresh_tokens_revoked_at_idx" ON "refresh_tokens"("revoked_at");

CREATE TABLE IF NOT EXISTS "token_blocklist" (
  "id" TEXT PRIMARY KEY,
  "jti" VARCHAR(64) NOT NULL UNIQUE,
  "user_id" TEXT,
  "reason" VARCHAR(255) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "token_blocklist_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "token_blocklist_expires_at_idx" ON "token_blocklist"("expires_at");
CREATE INDEX IF NOT EXISTS "token_blocklist_user_id_idx" ON "token_blocklist"("user_id");

CREATE TABLE IF NOT EXISTS "wallet_rotation_requests" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL,
  "old_wallet_address" VARCHAR(42) NOT NULL,
  "new_wallet_address" VARCHAR(42) NOT NULL,
  "status" "WalletRotationStatus" NOT NULL DEFAULT 'PENDING',
  "reason" VARCHAR(512) NOT NULL,
  "requested_by_id" TEXT NOT NULL,
  "reviewed_by_id" TEXT,
  "review_note" VARCHAR(512),
  "reviewed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "wallet_rotation_requests_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "wallet_rotation_requests_requested_by_id_fkey"
    FOREIGN KEY ("requested_by_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "wallet_rotation_requests_reviewed_by_id_fkey"
    FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "wallet_rotation_requests_user_id_idx" ON "wallet_rotation_requests"("user_id");
CREATE INDEX IF NOT EXISTS "wallet_rotation_requests_new_wallet_address_idx" ON "wallet_rotation_requests"("new_wallet_address");
CREATE INDEX IF NOT EXISTS "wallet_rotation_requests_status_idx" ON "wallet_rotation_requests"("status");

ALTER TABLE "users"
  ALTER COLUMN "role" SET DEFAULT 'STUDENT';
