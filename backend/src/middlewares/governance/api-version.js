import { env } from "../../config/env.js";

export function apiVersionMiddleware(req, res, next) {
  res.setHeader("x-api-current-version", "v1");

  if (req.originalUrl.startsWith("/api/") && !req.originalUrl.startsWith("/api/v1/")) {
    res.setHeader("deprecation", "true");
    res.setHeader("sunset", env.API_V0_SUNSET_AT);
    res.setHeader("link", `<${env.API_DEPRECATION_POLICY_URL}>; rel="deprecation"`);
  }

  return next();
}
