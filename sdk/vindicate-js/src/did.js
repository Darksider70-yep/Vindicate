export async function resolveDid(client, did, { verifyIpfs = true } = {}) {
  const query = new URLSearchParams({ did, verifyIpfs: String(Boolean(verifyIpfs)) }).toString();
  return client.request(`/api/v1/did/resolve?${query}`, {
    method: "GET"
  });
}

export async function verifyDidOwnership(client, { did, challenge, signature }) {
  return client.request("/api/v1/did/verify", {
    method: "POST",
    body: {
      did,
      challenge,
      signature
    }
  });
}

export async function registerStudentDid(client, { walletAddress, serviceEndpoint } = {}) {
  return client.request("/api/v1/did/register/student", {
    method: "POST",
    body: {
      walletAddress,
      serviceEndpoint
    }
  });
}

export async function registerInstitutionDid(client, { institutionId, controllerAddress, serviceEndpoint }) {
  return client.request("/api/v1/did/register/institution", {
    method: "POST",
    body: {
      institutionId,
      controllerAddress,
      serviceEndpoint
    }
  });
}