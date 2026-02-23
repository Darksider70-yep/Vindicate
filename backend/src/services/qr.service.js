import crypto from "node:crypto";
import QRCode from "qrcode";
import { env } from "../config/env.js";
import { stableStringify } from "../utils/canonical-json.js";

function hmacHex(payload) {
  return crypto.createHmac("sha256", env.QR_SIGNING_SECRET).update(payload).digest("hex");
}

export function buildVerificationUrl(credentialHash) {
  const baseUrl = env.PUBLIC_VERIFY_BASE_URL.replace(/\/+$/, "");
  return `${baseUrl}/verify/${credentialHash.toLowerCase()}`;
}

export async function generateVerificationQrCode(credentialHash) {
  const verificationUrl = buildVerificationUrl(credentialHash);
  const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 320
  });

  return {
    verificationUrl,
    qrDataUrl
  };
}

export function signVerificationResponse(payload) {
  const signedAt = new Date().toISOString();
  const normalizedPayload = stableStringify({
    ...payload,
    signedAt
  });

  return {
    payload,
    signedAt,
    signature: hmacHex(normalizedPayload),
    algorithm: "HMAC-SHA256"
  };
}
