# Vindicate

Vindicate is a full-stack credential verification platform that anchors credential integrity on-chain, stores files on IPFS, and adds role-based governance for institutions and issuers.

## What is in this repo

- `frontend`: React + Vite app (SIWE login, governance dashboard, verification view).
- `backend`: Express + Prisma API (auth, credentials, governance, DID, VC, ZK endpoints).
- `smart-contracts`: Solidity contracts + Hardhat scripts (`SkillProof`, proxy deployment).
- `docker-compose.dev.yml`: Local Postgres + backend development services.
- `docs`: Product/architecture notes.

## Core capabilities

- Sign-In with Ethereum (SIWE) authentication.
- Role-based access control (`SUPER_ADMIN`, `INSTITUTION_ADMIN`, `VERIFIED_ISSUER`, `STUDENT`, `VERIFIER`).
- Credential issuance/revocation with blockchain anchoring.
- IPFS upload + integrity validation.
- Institution onboarding and issuer approval workflows.
- DID, VC, offline token, and ZK challenge/verify API modules.

## Prerequisites

- Node.js 20+
- npm
- Docker (for Postgres and optional backend container run)
- MetaMask (or compatible EIP-1193 wallet)
- Local or remote Ethereum RPC (Hardhat local node is recommended for dev)
- IPFS API endpoint (managed or self-hosted)

## Local development quickstart

1. Install dependencies

```bash
npm install --prefix backend
npm install --prefix frontend
npm install --prefix smart-contracts
```

2. Start Postgres

```bash
docker compose -f docker-compose.dev.yml up -d postgres
```

3. Start a local blockchain

```bash
cd smart-contracts
npx hardhat node
```

4. Deploy the contracts (new terminal)

```bash
cd smart-contracts
npx hardhat compile
npx hardhat run scripts/deploy.cjs --network localhost
```

Use the printed `SkillProof proxy` address as `CONTRACT_ADDRESS` in backend env.

5. Configure backend environment

```powershell
Copy-Item backend/.env.example backend/.env
```

At minimum, verify/update these values in `backend/.env`:

- `DATABASE_URL`
- `RPC_URLS`
- `CHAIN_ID` (31337 for local Hardhat)
- `CONTRACT_ADDRESS` (proxy address from deploy output)
- `BACKEND_PRIVATE_KEY` (a funded signer from the Hardhat node)
- `IPFS_PRIMARY_API_URL`
- `SIWE_DOMAIN`
- `SIWE_URI`
- `PUBLIC_VERIFY_BASE_URL`
- `JWT_SECRET` (or `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`)
- `QR_SIGNING_SECRET`

6. Run Prisma migrations and start backend

```bash
cd backend
npm run prisma:migrate:deploy
npm run dev
```

7. Start frontend

```bash
cd frontend
npm run dev
```

Default local URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Health: `http://localhost:4000/health` (also available as `/api/health`)

## Docker development (backend + Postgres)

```bash
docker compose -f docker-compose.dev.yml up --build
```

This starts:

- Postgres on `5432`
- Backend on `4000`

Note: `docker-compose.dev.yml` uses `backend/.env.example` by default, so contract and key values are placeholders. Update env values for full write-path testing.

## Useful commands

Backend (`backend` directory):

```bash
npm run dev
npm run test
npm run lint
npm run prisma:generate
npm run prisma:migrate:deploy
```

Frontend (`frontend` directory):

```bash
npm run dev
npm run build
npm run lint
```

Smart contracts (`smart-contracts` directory):

```bash
npx hardhat compile
npx hardhat node
npx hardhat run scripts/deploy.cjs --network localhost
```

## API surface (high level)

- `/auth`: nonce, SIWE verify/login, refresh, logout, me
- `/credentials`: issue, revoke, verify by hash, QR payload, blacklist
- `/institutions`: onboarding requests + approval/rejection
- `/issuers`: issuer request lifecycle + approval/removal
- `/governance`: role assignment + wallet rotation
- `/did`: register/resolve/ownership verification
- `/vc`: issue, verify, disclosure proof, offline token, revoke
- `/zk`: challenge creation, submission verification, challenge lookup
- `/health`: liveness/readiness/metrics

## Notes

- The frontend Explorer page currently renders sample/mock entries.
- The backend expects a valid contract ABI at `backend/contracts/SkillProof.json`.
- Additional storage hardening details are documented in `backend/docs/ipfs-hardening-architecture.md`.
