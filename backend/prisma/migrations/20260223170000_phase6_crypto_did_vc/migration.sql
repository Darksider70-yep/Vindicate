DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerifiableCredentialStatus') THEN
    CREATE TYPE "VerifiableCredentialStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'OfflineQrTokenStatus') THEN
    CREATE TYPE "OfflineQrTokenStatus" AS ENUM ('ISSUED', 'CONSUMED', 'EXPIRED', 'REVOKED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ZkChallengeStatus') THEN
    CREATE TYPE "ZkChallengeStatus" AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "did_identities" (
  "id" TEXT PRIMARY KEY,
  "did" VARCHAR(255) NOT NULL UNIQUE,
  "method" VARCHAR(32) NOT NULL,
  "network" VARCHAR(64) NOT NULL,
  "controller_address" VARCHAR(42) NOT NULL,
  "user_id" TEXT,
  "institution_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "current_document_id" TEXT UNIQUE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "did_identities_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "did_identities_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "did_documents" (
  "id" TEXT PRIMARY KEY,
  "did_identity_id" TEXT NOT NULL,
  "document_cid" VARCHAR(255),
  "document_hash" VARCHAR(66) NOT NULL,
  "document" JSONB NOT NULL,
  "created_by_user_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "did_documents_did_identity_id_fkey"
    FOREIGN KEY ("did_identity_id") REFERENCES "did_identities"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "did_documents_created_by_user_id_fkey"
    FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'did_identities_current_document_id_fkey'
  ) THEN
    ALTER TABLE "did_identities"
      ADD CONSTRAINT "did_identities_current_document_id_fkey"
      FOREIGN KEY ("current_document_id") REFERENCES "did_documents"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "verifiable_credentials" (
  "id" TEXT PRIMARY KEY,
  "credential_db_id" TEXT UNIQUE,
  "issuer_user_id" TEXT NOT NULL,
  "subject_user_id" TEXT NOT NULL,
  "institution_id" TEXT NOT NULL,
  "issuer_did" VARCHAR(255) NOT NULL,
  "subject_did" VARCHAR(255) NOT NULL,
  "issuer_did_identity_id" TEXT,
  "subject_did_identity_id" TEXT,
  "vc_hash" VARCHAR(66) NOT NULL UNIQUE,
  "credential_hash" VARCHAR(66) NOT NULL,
  "merkle_root" VARCHAR(66) NOT NULL,
  "merkle_leaves" JSONB NOT NULL,
  "vc_document" JSONB NOT NULL,
  "proof_type" VARCHAR(128) NOT NULL,
  "proof_signature" VARCHAR(255) NOT NULL,
  "proof_created_at" TIMESTAMP(3) NOT NULL,
  "chain_anchors" JSONB,
  "status" "VerifiableCredentialStatus" NOT NULL DEFAULT 'ACTIVE',
  "revoked_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "verifiable_credentials_credential_db_id_fkey"
    FOREIGN KEY ("credential_db_id") REFERENCES "credentials"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "verifiable_credentials_issuer_user_id_fkey"
    FOREIGN KEY ("issuer_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "verifiable_credentials_subject_user_id_fkey"
    FOREIGN KEY ("subject_user_id") REFERENCES "users"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "verifiable_credentials_institution_id_fkey"
    FOREIGN KEY ("institution_id") REFERENCES "institutions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "verifiable_credentials_issuer_did_identity_id_fkey"
    FOREIGN KEY ("issuer_did_identity_id") REFERENCES "did_identities"("id")
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "verifiable_credentials_subject_did_identity_id_fkey"
    FOREIGN KEY ("subject_did_identity_id") REFERENCES "did_identities"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "offline_qr_tokens" (
  "id" TEXT PRIMARY KEY,
  "vc_id" TEXT NOT NULL,
  "token_nonce" VARCHAR(128) NOT NULL UNIQUE,
  "token_hash" VARCHAR(66) NOT NULL UNIQUE,
  "verifier_challenge_hash" VARCHAR(66),
  "issuer_signature" VARCHAR(255) NOT NULL,
  "status" "OfflineQrTokenStatus" NOT NULL DEFAULT 'ISSUED',
  "issued_at" TIMESTAMP(3) NOT NULL,
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offline_qr_tokens_vc_id_fkey"
    FOREIGN KEY ("vc_id") REFERENCES "verifiable_credentials"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "zk_proof_challenges" (
  "id" TEXT PRIMARY KEY,
  "vc_id" TEXT NOT NULL,
  "challenge" VARCHAR(128) NOT NULL UNIQUE,
  "challenge_hash" VARCHAR(66) NOT NULL UNIQUE,
  "verifier_did" VARCHAR(255) NOT NULL,
  "subject_did" VARCHAR(255) NOT NULL,
  "status" "ZkChallengeStatus" NOT NULL DEFAULT 'PENDING',
  "expires_at" TIMESTAMP(3) NOT NULL,
  "consumed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zk_proof_challenges_vc_id_fkey"
    FOREIGN KEY ("vc_id") REFERENCES "verifiable_credentials"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "zk_proof_submissions" (
  "id" TEXT PRIMARY KEY,
  "challenge_id" TEXT NOT NULL,
  "nullifier_hash" VARCHAR(66) NOT NULL UNIQUE,
  "proof" JSONB NOT NULL,
  "public_signals" JSONB NOT NULL,
  "verification_method" VARCHAR(64) NOT NULL,
  "verified" BOOLEAN NOT NULL,
  "verified_at" TIMESTAMP(3),
  "expires_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "zk_proof_submissions_challenge_id_fkey"
    FOREIGN KEY ("challenge_id") REFERENCES "zk_proof_challenges"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "did_identities_user_id_idx" ON "did_identities"("user_id");
CREATE INDEX IF NOT EXISTS "did_identities_institution_id_idx" ON "did_identities"("institution_id");
CREATE INDEX IF NOT EXISTS "did_identities_controller_address_idx" ON "did_identities"("controller_address");
CREATE INDEX IF NOT EXISTS "did_identities_is_active_idx" ON "did_identities"("is_active");

CREATE INDEX IF NOT EXISTS "did_documents_did_identity_id_idx" ON "did_documents"("did_identity_id");
CREATE INDEX IF NOT EXISTS "did_documents_document_hash_idx" ON "did_documents"("document_hash");

CREATE INDEX IF NOT EXISTS "verifiable_credentials_issuer_user_id_idx" ON "verifiable_credentials"("issuer_user_id");
CREATE INDEX IF NOT EXISTS "verifiable_credentials_subject_user_id_idx" ON "verifiable_credentials"("subject_user_id");
CREATE INDEX IF NOT EXISTS "verifiable_credentials_institution_id_idx" ON "verifiable_credentials"("institution_id");
CREATE INDEX IF NOT EXISTS "verifiable_credentials_issuer_did_idx" ON "verifiable_credentials"("issuer_did");
CREATE INDEX IF NOT EXISTS "verifiable_credentials_subject_did_idx" ON "verifiable_credentials"("subject_did");
CREATE INDEX IF NOT EXISTS "verifiable_credentials_credential_hash_idx" ON "verifiable_credentials"("credential_hash");
CREATE INDEX IF NOT EXISTS "verifiable_credentials_status_idx" ON "verifiable_credentials"("status");

CREATE INDEX IF NOT EXISTS "offline_qr_tokens_vc_id_idx" ON "offline_qr_tokens"("vc_id");
CREATE INDEX IF NOT EXISTS "offline_qr_tokens_status_idx" ON "offline_qr_tokens"("status");
CREATE INDEX IF NOT EXISTS "offline_qr_tokens_expires_at_idx" ON "offline_qr_tokens"("expires_at");

CREATE INDEX IF NOT EXISTS "zk_proof_challenges_vc_id_idx" ON "zk_proof_challenges"("vc_id");
CREATE INDEX IF NOT EXISTS "zk_proof_challenges_status_idx" ON "zk_proof_challenges"("status");
CREATE INDEX IF NOT EXISTS "zk_proof_challenges_expires_at_idx" ON "zk_proof_challenges"("expires_at");

CREATE INDEX IF NOT EXISTS "zk_proof_submissions_challenge_id_idx" ON "zk_proof_submissions"("challenge_id");
CREATE INDEX IF NOT EXISTS "zk_proof_submissions_verified_idx" ON "zk_proof_submissions"("verified");
CREATE INDEX IF NOT EXISTS "zk_proof_submissions_expires_at_idx" ON "zk_proof_submissions"("expires_at");
