export class AppError extends Error {
  constructor(statusCode, code, message, details = undefined, cause = undefined) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.cause = cause;
  }
}
