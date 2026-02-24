function assertHash(hash, label = "hash") {
  if (typeof hash !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    throw new Error(`${label} must be a bytes32 hex string`);
  }
  return hash.toLowerCase();
}

export async function verifyCredentialHash(client, credentialHash) {
  const normalizedHash = assertHash(credentialHash, "credentialHash");
  return client.request(`/api/v1/credentials/${normalizedHash}`, {
    method: "GET"
  });
}

export async function fetchCredentialQr(client, credentialHash) {
  const normalizedHash = assertHash(credentialHash, "credentialHash");
  return client.request(`/api/v1/credentials/${normalizedHash}/qr`, {
    method: "GET"
  });
}

export async function verifyVerifiableCredential(client, vcHash, options = {}) {
  const normalizedHash = assertHash(vcHash, "vcHash");
  const params = new URLSearchParams();
  if (options.requireChainAnchor !== undefined) {
    params.set("requireChainAnchor", String(Boolean(options.requireChainAnchor)));
  }

  const query = params.toString();
  return client.request(`/api/v1/vc/${normalizedHash}/verify${query ? `?${query}` : ""}`, {
    method: "GET"
  });
}

export async function resolveCredentialAnchors(client, credentialHash) {
  const verification = await verifyCredentialHash(client, credentialHash);
  return verification?.payload?.onChain?.chainAnchors ?? verification?.payload?.chainAnchors ?? null;
}

export function isCredentialIntegrityPassed(verificationResponse) {
  return Boolean(verificationResponse?.payload?.integrity?.passed);
}