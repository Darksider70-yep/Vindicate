-- Create enums
CREATE TYPE "Role" AS ENUM ('ADMIN', 'INSTITUTION_ADMIN', 'ISSUER', 'STUDENT', 'VERIFIER');
CREATE TYPE "IssuerStatus" AS ENUM ('ACTIVE', 'REVOKED');
CREATE TYPE "CredentialStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- Institutions
CREATE TABLE "institutions" (
  "id" TEXT PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(64) NOT NULL UNIQUE,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Users
CREATE TABLE "users" (
  "id" TEXT PRIMARY KEY,
  "walletAddress" VARCHAR(42) NOT NULL UNIQUE,
  "role" "Role" NOT NULL,
  "institutionId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "users_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "institutions" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Issuers
CREATE TABLE "issuers" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE,
  "institutionId" TEXT NOT NULL,
  "approvedById" TEXT,
  "status" "IssuerStatus" NOT NULL DEFAULT 'ACTIVE',
  "approvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "revokedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "issuers_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "users" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "issuers_institutionId_fkey"
    FOREIGN KEY ("institutionId") REFERENCES "institutions" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "issuers_approvedById_fkey"
    FOREIGN KEY ("approvedById") REFERENCES "users" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- Credentials
CREATE TABLE "credentials" (
  "id" TEXT PRIMARY KEY,
  "credential_id" BIGINT NOT NULL UNIQUE,
  "student_id" TEXT NOT NULL,
  "issuer_id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "student_address" VARCHAR(42) NOT NULL,
  "issuer_address" VARCHAR(42) NOT NULL,
  "credential_hash" VARCHAR(66) NOT NULL UNIQUE,
  "ipfs_cid" VARCHAR(255) NOT NULL,
  "file_checksum" VARCHAR(64) NOT NULL,
  "file_name" VARCHAR(255) NOT NULL,
  "mime_type" VARCHAR(128) NOT NULL,
  "metadata" JSONB,
  "encrypted" BOOLEAN NOT NULL DEFAULT FALSE,
  "status" "CredentialStatus" NOT NULL DEFAULT 'ACTIVE',
  "tx_hash" VARCHAR(66) NOT NULL,
  "issued_at" TIMESTAMP(3) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credentials_student_id_fkey"
    FOREIGN KEY ("student_id") REFERENCES "users" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "credentials_issuer_id_fkey"
    FOREIGN KEY ("issuer_id") REFERENCES "users" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "credentials_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Credential keys (encryption metadata)
CREATE TABLE "credential_keys" (
  "id" TEXT PRIMARY KEY,
  "credential_id" TEXT NOT NULL UNIQUE,
  "key_version" INTEGER NOT NULL DEFAULT 1,
  "cipher_algorithm" VARCHAR(64) NOT NULL,
  "key_wrap_algorithm" VARCHAR(64) NOT NULL,
  "wrapped_data_key" VARCHAR(1024) NOT NULL,
  "wrap_iv" VARCHAR(64) NOT NULL,
  "wrap_tag" VARCHAR(64) NOT NULL,
  "data_iv" VARCHAR(64) NOT NULL,
  "data_tag" VARCHAR(64) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credential_keys_credential_id_fkey"
    FOREIGN KEY ("credential_id") REFERENCES "credentials" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Revocations
CREATE TABLE "revocations" (
  "id" TEXT PRIMARY KEY,
  "credentialId" TEXT NOT NULL UNIQUE,
  "revokedById" TEXT NOT NULL,
  "reason" VARCHAR(512) NOT NULL,
  "txHash" VARCHAR(66) NOT NULL,
  "revokedAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "revocations_credentialId_fkey"
    FOREIGN KEY ("credentialId") REFERENCES "credentials" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "revocations_revokedById_fkey"
    FOREIGN KEY ("revokedById") REFERENCES "users" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

-- Hash blacklist
CREATE TABLE "hash_blacklist" (
  "id" TEXT PRIMARY KEY,
  "credential_hash" VARCHAR(66) NOT NULL UNIQUE,
  "reason" VARCHAR(512) NOT NULL,
  "actor_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "hash_blacklist_actor_user_id_fkey"
    FOREIGN KEY ("actor_user_id") REFERENCES "users" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

-- SIWE nonces
CREATE TABLE "auth_nonces" (
  "id" TEXT PRIMARY KEY,
  "walletAddress" VARCHAR(42) NOT NULL,
  "nonce" VARCHAR(128) NOT NULL UNIQUE,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX "institutions_code_idx" ON "institutions" ("code");
CREATE INDEX "users_walletAddress_idx" ON "users" ("walletAddress");
CREATE INDEX "users_institutionId_idx" ON "users" ("institutionId");
CREATE INDEX "issuers_institutionId_idx" ON "issuers" ("institutionId");
CREATE INDEX "issuers_status_idx" ON "issuers" ("status");

CREATE INDEX "credentials_credential_hash_idx" ON "credentials" ("credential_hash");
CREATE INDEX "credentials_file_checksum_idx" ON "credentials" ("file_checksum");
CREATE INDEX "credentials_ipfs_cid_idx" ON "credentials" ("ipfs_cid");
CREATE INDEX "credentials_student_address_idx" ON "credentials" ("student_address");
CREATE INDEX "credentials_issuer_address_idx" ON "credentials" ("issuer_address");
CREATE INDEX "credentials_status_idx" ON "credentials" ("status");
CREATE INDEX "credentials_student_id_idx" ON "credentials" ("student_id");
CREATE INDEX "credentials_issuer_id_idx" ON "credentials" ("issuer_id");
CREATE INDEX "credentials_institution_id_idx" ON "credentials" ("institution_id");
CREATE INDEX "credentials_issued_at_idx" ON "credentials" ("issued_at");

CREATE INDEX "revocations_revokedById_idx" ON "revocations" ("revokedById");
CREATE INDEX "revocations_revokedAt_idx" ON "revocations" ("revokedAt");

CREATE INDEX "hash_blacklist_credential_hash_idx" ON "hash_blacklist" ("credential_hash");

CREATE INDEX "auth_nonces_walletAddress_idx" ON "auth_nonces" ("walletAddress");
CREATE INDEX "auth_nonces_expiresAt_idx" ON "auth_nonces" ("expiresAt");
