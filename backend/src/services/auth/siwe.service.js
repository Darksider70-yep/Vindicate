import { ethers } from "ethers";
import { SiweMessage, generateNonce } from "siwe";
import { env } from "../../config/env.js";
import { prisma } from "../../db/prisma.js";
import { ROLES } from "../../constants/roles.js";
import { signToken } from "./token.service.js";
import { AppError } from "../../utils/app-error.js";

function normalizeAddress(address) {
  if (!ethers.isAddress(address)) {
    throw new AppError(400, "INVALID_ADDRESS", "Invalid wallet address format");
  }
  return ethers.getAddress(address).toLowerCase();
}

export async function createChallenge(address) {
  const checksummedAddress = ethers.getAddress(address);
  const normalizedAddress = checksummedAddress.toLowerCase();
  const nonce = generateNonce();
  const issuedAt = new Date();
  const expiresAt = new Date(issuedAt.getTime() + env.NONCE_TTL_SECONDS * 1000);

  await prisma.authNonce.create({
    data: {
      walletAddress: normalizedAddress,
      nonce,
      expiresAt
    }
  });

  const message = new SiweMessage({
    domain: env.SIWE_DOMAIN,
    address: checksummedAddress,
    statement: "Sign in to Vindicate.",
    uri: env.SIWE_URI,
    version: "1",
    chainId: env.CHAIN_ID,
    nonce,
    issuedAt: issuedAt.toISOString(),
    expirationTime: expiresAt.toISOString()
  });

  return {
    nonce,
    message: message.prepareMessage(),
    expiresAt: expiresAt.toISOString()
  };
}

export async function verifyLogin(messageText, signature) {
  let parsedMessage;
  try {
    parsedMessage = new SiweMessage(messageText);
  } catch (error) {
    throw new AppError(400, "SIWE_INVALID_MESSAGE", "Invalid SIWE message", undefined, error);
  }

  const normalizedAddress = normalizeAddress(parsedMessage.address);
  const nonceRecord = await prisma.authNonce.findUnique({
    where: { nonce: parsedMessage.nonce }
  });

  if (!nonceRecord) {
    throw new AppError(401, "SIWE_NONCE_INVALID", "Nonce not found");
  }

  if (nonceRecord.walletAddress !== normalizedAddress) {
    throw new AppError(401, "SIWE_NONCE_MISMATCH", "Nonce does not match wallet");
  }

  if (nonceRecord.usedAt) {
    throw new AppError(401, "SIWE_NONCE_USED", "Nonce already used");
  }

  if (nonceRecord.expiresAt.getTime() < Date.now()) {
    throw new AppError(401, "SIWE_NONCE_EXPIRED", "Nonce expired");
  }

  const verification = await parsedMessage.verify({
    signature,
    nonce: parsedMessage.nonce,
    domain: env.SIWE_DOMAIN
  });

  if (!verification.success) {
    throw new AppError(401, "SIWE_SIGNATURE_INVALID", "Signature verification failed");
  }

  await prisma.authNonce.update({
    where: { nonce: parsedMessage.nonce },
    data: { usedAt: new Date() }
  });

  const user = await prisma.user.upsert({
    where: { walletAddress: normalizedAddress },
    create: {
      walletAddress: normalizedAddress,
      role: ROLES.STUDENT
    },
    update: {}
  });

  const token = signToken({
    sub: user.id,
    walletAddress: user.walletAddress,
    role: user.role,
    institutionId: user.institutionId
  });

  return {
    token,
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      role: user.role,
      institutionId: user.institutionId
    }
  };
}
