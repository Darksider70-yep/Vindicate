export async function createZkChallenge(client, payload) {
  return client.request("/api/v1/zk/challenges", {
    method: "POST",
    body: payload
  });
}

export async function verifyZkProof(client, payload) {
  return client.request("/api/v1/zk/verify", {
    method: "POST",
    body: payload
  });
}

export async function getZkChallenge(client, challengeId) {
  return client.request(`/api/v1/zk/challenges/${encodeURIComponent(challengeId)}`, {
    method: "GET"
  });
}

export function buildDisclosurePayload({ vcId, attributeKey, challenge }) {
  return {
    vcId,
    attributeKey,
    challenge
  };
}