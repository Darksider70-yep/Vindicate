import crypto from "node:crypto";

export function requestContext(req, res, next) {
  const headerRequestId = req.header("x-request-id");
  req.id = headerRequestId && headerRequestId.length > 0 ? headerRequestId : crypto.randomUUID();
  res.setHeader("x-request-id", req.id);
  next();
}
