import pino from "pino";
import { env } from "./env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  messageKey: "message",
  base: {
    service: "vindicate-backend",
    env: env.NODE_ENV
  },
  timestamp: pino.stdTimeFunctions.isoTime
});
