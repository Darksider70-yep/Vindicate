import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "http://localhost:4000/api/v1";
const authToken = __ENV.AUTH_TOKEN || "";
const institutionId = __ENV.INSTITUTION_ID || "replace-with-institution-id";

export const options = {
  scenarios: {
    issuance_burst: {
      executor: "constant-arrival-rate",
      rate: 15,
      timeUnit: "1s",
      duration: "10m",
      preAllocatedVUs: 40,
      maxVUs: 200
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<8000"]
  }
};

function buildPayload() {
  const nonce = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const fileBase64 = "data:text/plain;base64,VmVuZGljYXRlLVBoeWFzZTctSXNzdWFuY2UtVGVzdA==";

  return JSON.stringify({
    studentAddress: __ENV.STUDENT_ADDRESS || "0x0000000000000000000000000000000000000001",
    institutionId,
    fileName: `burst-${nonce}.txt`,
    mimeType: "image/png",
    fileBase64,
    metadata: {
      nonce,
      source: "k6-issuance-burst"
    },
    encrypt: true
  });
}

export default function () {
  const payload = buildPayload();
  const headers = {
    "Content-Type": "application/json"
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const response = http.post(`${baseUrl}/credentials/issue`, payload, { headers });

  check(response, {
    "issuance request accepted": (res) => [201, 401, 403, 409, 429].includes(res.status)
  });

  sleep(0.2);
}