import { AppError } from "../utils/app-error.js";

export function validate(schema, target = "body") {
  return (req, _res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      return next(
        new AppError(400, "VALIDATION_ERROR", "Request validation failed", result.error.flatten())
      );
    }

    req[target] = result.data;
    return next();
  };
}
