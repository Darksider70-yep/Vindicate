import http from "k6/http";
import { check, sleep } from "k6";

const baseUrl = __ENV.BASE_URL || "http://localhost:4000/api/v1";
const credentialHash =
  __ENV.CREDENTIAL_HASH || "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export const options = {
  scenarios: {
    verify_spike: {
      executor: "ramping-arrival-rate",
      startRate: 20,
      timeUnit: "1s",
      preAllocatedVUs: 50,
      maxVUs: 600,
      stages: [
        { duration: "2m", target: 50 },
        { duration: "5m", target: 200 },
        { duration: "5m", target: 300 },
        { duration: "2m", target: 0 }
      ]
    }
  },
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<1200"]
  }
};

export default function () {
  const response = http.get(`${baseUrl}/credentials/${credentialHash}`);
  check(response, {
    "verification status is 200/409/404": (res) => [200, 404, 409].includes(res.status)
  });
  sleep(0.1);
}