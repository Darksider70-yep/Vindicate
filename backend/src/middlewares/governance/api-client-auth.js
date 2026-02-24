import { AppError } from "../../utils/app-error.js";
import { env } from "../../config/env.js";
import { apiGovernanceService } from "../../services/compliance/api-governance.service.js";

function isApiKeyRequiredPath(pathname) {
  if (!env.API_KEY_REQUIRED_PATH_PREFIXES.length) {
    return false;
  }

  return env.API_KEY_REQUIRED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function apiClientAuthMiddleware(req, _res, next) {
  try {
    if (!env.API_GOVERNANCE_ENABLED) {
      return next();
    }

    const keyHeader = req.header(env.API_KEY_HEADER_NAME);
    if (!keyHeader) {
      if (isApiKeyRequiredPath(req.path)) {
        throw new AppError(401, "API_KEY_REQUIRED", "API key is required for this endpoint");
      }
      return next();
    }

    req.apiClient = await apiGovernanceService.validateApiKey(keyHeader);
    return next();
  } catch (error) {
    return next(error);
  }
}