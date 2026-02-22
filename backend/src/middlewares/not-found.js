import { AppError } from "../utils/app-error.js";

export function notFound(_req, _res, next) {
  next(new AppError(404, "NOT_FOUND", "Resource not found"));
}
