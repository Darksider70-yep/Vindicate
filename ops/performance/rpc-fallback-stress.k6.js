import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "http://localhost:4000/api/v1";
const credentialHash =
  __ENV.CREDENTIAL_HASH || "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export const options = {
  vus: 120,
  duration: "8m",
  thresholds: {
    http_req_failed: ["rate<0.05"],
    http_req_duration: ["p(95)<2000"]
  }
};

export default function () {
  const verifyResponse = http.get(`${baseUrl}/credentials/${credentialHash}`);
  check(verifyResponse, {
    "verify endpoint responds": (res) => [200, 404, 409, 429].includes(res.status)
  });

  const healthResponse = http.get(`${baseUrl}/health/ready`);
  check(healthResponse, {
    "readiness endpoint available": (res) => [200, 500, 503].includes(res.status)
  });

  sleep(0.1);
}