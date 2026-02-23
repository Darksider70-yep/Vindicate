import { ethers } from "ethers";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { ROLES } from "../../constants/roles.js";
import { ipfsService } from "../ipfs.service.js";
import { AppError } from "../../utils/app-error.js";
import { stableStringify, toBytes32Hash } from "../../utils/canonical-json.js";
import { didDocumentSchema } from "./did-document.schema.js";

const DID_PREFIX = "did:ethr:";
const DID_CONTEXTS = Object.freeze([
  "https://www.w3.org/ns/did/v1",
  "https://w3id.org/security/suites/secp256k1recovery-2020/v2"
]);

function normalizeAddress(address, label = "wallet") {
  if (!ethers.isAddress(address)) {
    throw new AppError(400, "INVALID_ADDRESS", `Invalid ${label} address`);
  }
  return ethers.getAddress(address).toLowerCase();
}

function parseDidSuffix(suffix) {
  if (suffix.startsWith("0x")) {
    return {
      network: env.DID_ETHR_NETWORK,
      address: suffix
    };
  }

  const separator = suffix.lastIndexOf(":");
  if (separator < 0) {
    throw new AppError(400, "INVALID_DID", "DID must include a wallet address");
  }

  return {
    network: suffix.slice(0, separator),
    address: suffix.slice(separator + 1)
  };
}

function assertDocumentReference(document, expectedDid) {
  const parsedDocument = didDocumentSchema.safeParse(document);
  if (!parsedDocument.success) {
    throw new AppError(
      500,
      "DID_DOCUMENT_INVALID",
      "DID document schema validation failed",
      parsedDocument.error.flatten()
    );
  }
  if (parsedDocument.data.id !== expectedDid) {
    throw new AppError(409, "DID_DOCUMENT_MISMATCH", "DID document id does not match DID");
  }
}

function getServiceList(serviceEndpoint, did) {
  const services = [];
  if (serviceEndpoint) {
    services.push({
      id: `${did}#vindicate`,
      type: "LinkedDomains",
      serviceEndpoint
    });
  }

  if (env.DID_DOCUMENT_SERVICE_URL) {
    services.push({
      id: `${did}#resolver`,
      type: "DIDResolution",
      serviceEndpoint: env.DID_DOCUMENT_SERVICE_URL
    });
  }

  return services;
}

function assertDidOwnershipOrAdmin(authUser, targetUser) {
  if (authUser.role === ROLES.SUPER_ADMIN) {
    return;
  }
  if (authUser.sub !== targetUser.id) {
    throw new AppError(403, "FORBIDDEN", "Cannot register DID for another user");
  }
}

function assertInstitutionScope(authUser, institution) {
  if (authUser.role === ROLES.SUPER_ADMIN) {
    return;
  }
  if (
    authUser.role !== ROLES.INSTITUTION_ADMIN ||
    !authUser.institutionId ||
    authUser.institutionId !== institution.id
  ) {
    throw new AppError(403, "FORBIDDEN", "Institution DID registration is restricted to institution admins");
  }
}

function computeDidDocumentHash(document) {
  return toBytes32Hash(stableStringify(document)).toLowerCase();
}

function normalizeDid(did) {
  if (typeof did !== "string" || !did.startsWith(DID_PREFIX)) {
    throw new AppError(400, "INVALID_DID", "Only did:ethr identifiers are supported");
  }

  const suffix = did.slice(DID_PREFIX.length);
  const parsed = parseDidSuffix(suffix);
  const normalizedAddress = normalizeAddress(parsed.address, "DID controller");
  const network = parsed.network?.trim();

  if (!network) {
    throw new AppError(400, "INVALID_DID", "DID network is required");
  }

  return {
    did: `${DID_PREFIX}${network}:${normalizedAddress}`,
    method: "ethr",
    network,
    controllerAddress: normalizedAddress
  };
}

async function persistDidIdentity({
  did,
  method,
  network,
  controllerAddress,
  userId = null,
  institutionId = null,
  createdByUserId = null,
  serviceEndpoint = null
}) {
  const document = buildDidDocument({
    did,
    controllerAddress,
    chainId: env.CHAIN_ID,
    serviceEndpoint
  });

  const documentHash = computeDidDocumentHash(document);
  const documentBuffer = Buffer.from(stableStringify(document), "utf8");
  const uploadResult = await ipfsService.uploadFile({
    fileBuffer: documentBuffer,
    fileName: `did-${controllerAddress}.json`,
    mimeType: "application/json",
    encrypt: false,
    expectedCredentialHash: documentHash
  });

  try {
    return await prisma.$transaction(async (tx) => {
      const existingIdentity = await tx.didIdentity.findUnique({
        where: { did }
      });

      if (existingIdentity) {
        if (userId && existingIdentity.userId && existingIdentity.userId !== userId) {
          throw new AppError(409, "DID_ALREADY_BOUND", "DID is already linked to another user");
        }
        if (
          institutionId &&
          existingIdentity.institutionId &&
          existingIdentity.institutionId !== institutionId
        ) {
          throw new AppError(409, "DID_ALREADY_BOUND", "DID is already linked to another institution");
        }
      }

      const didIdentity = existingIdentity
        ? await tx.didIdentity.update({
            where: { id: existingIdentity.id },
            data: {
              method,
              network,
              controllerAddress,
              userId,
              institutionId,
              isActive: true
            }
          })
        : await tx.didIdentity.create({
            data: {
              did,
              method,
              network,
              controllerAddress,
              userId,
              institutionId,
              isActive: true
            }
          });

      const didDocument = await tx.didDocument.create({
        data: {
          didIdentityId: didIdentity.id,
          documentCid: uploadResult.cid,
          documentHash,
          document,
          createdByUserId
        }
      });

      return tx.didIdentity.update({
        where: { id: didIdentity.id },
        data: {
          currentDocumentId: didDocument.id
        },
        include: {
          currentDocument: true,
          user: true,
          institution: true
        }
      });
    });
  } catch (error) {
    await ipfsService.unpinCID(uploadResult.cid, { bestEffort: true });
    throw error;
  }
}

export function buildDidFromAddress(walletAddress, network = env.DID_ETHR_NETWORK) {
  const normalizedAddress = normalizeAddress(walletAddress, "wallet");
  const normalizedNetwork = String(network).trim();
  if (!normalizedNetwork) {
    throw new AppError(500, "DID_NETWORK_INVALID", "DID network is not configured");
  }

  return `${DID_PREFIX}${normalizedNetwork}:${normalizedAddress}`;
}

export function parseEthrDid(did) {
  return normalizeDid(did);
}

export function buildDidDocument({
  did,
  controllerAddress,
  chainId,
  serviceEndpoint = null
}) {
  const normalizedDid = normalizeDid(did);
  const controller = normalizeAddress(controllerAddress, "controller");
  const verificationMethodId = `${normalizedDid.did}#controller`;

  const document = {
    "@context": DID_CONTEXTS,
    id: normalizedDid.did,
    verificationMethod: [
      {
        id: verificationMethodId,
        type: "EcdsaSecp256k1RecoveryMethod2020",
        controller: normalizedDid.did,
        blockchainAccountId: `eip155:${chainId}:${controller}`
      }
    ],
    authentication: [verificationMethodId],
    assertionMethod: [verificationMethodId],
    service: getServiceList(serviceEndpoint, normalizedDid.did)
  };

  return didDocumentSchema.parse(document);
}

export async function registerStudentDid({
  authUser,
  walletAddress,
  serviceEndpoint
}) {
  const normalizedWallet = normalizeAddress(walletAddress ?? authUser.walletAddress, "wallet");
  const user = await prisma.user.upsert({
    where: { walletAddress: normalizedWallet },
    create: {
      walletAddress: normalizedWallet,
      role: ROLES.STUDENT
    },
    update: {}
  });

  assertDidOwnershipOrAdmin(authUser, user);
  const did = buildDidFromAddress(normalizedWallet);
  const parsed = parseEthrDid(did);

  return persistDidIdentity({
    did: parsed.did,
    method: parsed.method,
    network: parsed.network,
    controllerAddress: parsed.controllerAddress,
    userId: user.id,
    createdByUserId: authUser.sub,
    serviceEndpoint
  });
}

export async function registerInstitutionDid({
  authUser,
  institutionId,
  controllerAddress,
  serviceEndpoint
}) {
  const institution = await prisma.institution.findUnique({
    where: { id: institutionId }
  });
  if (!institution) {
    throw new AppError(404, "INSTITUTION_NOT_FOUND", "Institution not found");
  }

  assertInstitutionScope(authUser, institution);
  const controller = normalizeAddress(
    controllerAddress ?? institution.adminWallet ?? authUser.walletAddress,
    "institution controller"
  );
  const did = buildDidFromAddress(controller);
  const parsed = parseEthrDid(did);

  return persistDidIdentity({
    did: parsed.did,
    method: parsed.method,
    network: parsed.network,
    controllerAddress: parsed.controllerAddress,
    institutionId: institution.id,
    createdByUserId: authUser.sub,
    serviceEndpoint
  });
}

export async function getOrCreateDidForUser({
  userId,
  walletAddress,
  createdByUserId = null
}) {
  const normalizedWallet = normalizeAddress(walletAddress, "wallet");
  const did = buildDidFromAddress(normalizedWallet);
  const parsed = parseEthrDid(did);

  const existing = await prisma.didIdentity.findFirst({
    where: {
      userId,
      did: parsed.did,
      isActive: true
    },
    include: {
      currentDocument: true
    }
  });
  if (existing) {
    return existing;
  }

  return persistDidIdentity({
    did: parsed.did,
    method: parsed.method,
    network: parsed.network,
    controllerAddress: parsed.controllerAddress,
    userId,
    createdByUserId
  });
}

export async function resolveDid({ did, verifyIpfs = true }) {
  const parsed = parseEthrDid(did);
  const didIdentity = await prisma.didIdentity.findUnique({
    where: { did: parsed.did },
    include: {
      currentDocument: true,
      institution: true,
      user: true
    }
  });

  if (!didIdentity) {
    return {
      registered: false,
      did: parsed.did,
      document: buildDidDocument({
        did: parsed.did,
        controllerAddress: parsed.controllerAddress,
        chainId: env.CHAIN_ID
      }),
      network: parsed.network,
      controllerAddress: parsed.controllerAddress
    };
  }

  if (!didIdentity.isActive) {
    throw new AppError(409, "DID_INACTIVE", "DID is inactive");
  }

  if (!didIdentity.currentDocument) {
    throw new AppError(500, "DID_DOCUMENT_MISSING", "DID document is missing");
  }

  const normalizedDocumentHash = computeDidDocumentHash(didIdentity.currentDocument.document);
  if (normalizedDocumentHash !== didIdentity.currentDocument.documentHash.toLowerCase()) {
    throw new AppError(409, "DID_DOCUMENT_INTEGRITY_FAILED", "Stored DID document hash mismatch");
  }

  assertDocumentReference(didIdentity.currentDocument.document, didIdentity.did);

  let ipfsVerification = null;
  if (verifyIpfs && didIdentity.currentDocument.documentCid) {
    ipfsVerification = await ipfsService.verifyCID(didIdentity.currentDocument.documentCid, {
      expectedCredentialHash: didIdentity.currentDocument.documentHash
    });
    if (!ipfsVerification.valid) {
      throw new AppError(409, "DID_DOCUMENT_IPFS_INTEGRITY_FAILED", "DID document CID verification failed");
    }
  }

  return {
    registered: true,
    did: didIdentity.did,
    method: didIdentity.method,
    network: didIdentity.network,
    controllerAddress: didIdentity.controllerAddress,
    userId: didIdentity.userId,
    institutionId: didIdentity.institutionId,
    didDocumentCid: didIdentity.currentDocument.documentCid,
    didDocumentHash: didIdentity.currentDocument.documentHash,
    document: didIdentity.currentDocument.document,
    ipfsVerification
  };
}

export async function verifyDidOwnership({ did, challenge, signature }) {
  if (!challenge || typeof challenge !== "string") {
    throw new AppError(400, "INVALID_CHALLENGE", "Challenge must be a non-empty string");
  }
  if (!signature || typeof signature !== "string") {
    throw new AppError(400, "INVALID_SIGNATURE", "Signature must be provided");
  }

  const parsed = parseEthrDid(did);
  let recoveredAddress;
  try {
    recoveredAddress = ethers.verifyMessage(challenge, signature).toLowerCase();
  } catch (error) {
    throw new AppError(401, "DID_SIGNATURE_INVALID", "Signature verification failed", undefined, error);
  }

  return {
    did: parsed.did,
    valid: recoveredAddress === parsed.controllerAddress,
    recoveredAddress
  };
}
