import { env } from "../../config/env.js";
import { alertDispatcherService } from "./alert-dispatcher.service.js";

function nowMs() {
  return Date.now();
}

class AnomalyMonitorService {
  constructor() {
    this.verifyEvents = [];
    this.issuerEventMap = new Map();
    this.hashVerifyMap = new Map();
    this.lastAlertAt = new Map();
  }

  _cooldownAllows(key) {
    const cooldownMs = env.ANOMALY_ALERT_COOLDOWN_SECONDS * 1000;
    const last = this.lastAlertAt.get(key) ?? 0;
    const allowed = nowMs() - last >= cooldownMs;
    if (allowed) {
      this.lastAlertAt.set(key, nowMs());
    }
    return allowed;
  }

  _pruneArray(array, windowMs) {
    const cutoff = nowMs() - windowMs;
    while (array.length > 0 && array[0] < cutoff) {
      array.shift();
    }
  }

  _pruneMap(map, windowMs) {
    const cutoff = nowMs() - windowMs;
    for (const [key, timestamps] of map.entries()) {
      while (timestamps.length > 0 && timestamps[0] < cutoff) {
        timestamps.shift();
      }
      if (timestamps.length === 0) {
        map.delete(key);
      }
    }
  }

  async recordVerification({ credentialHash, sourceIp, apiClientId }) {
    const timestamp = nowMs();
    this.verifyEvents.push(timestamp);

    const verifyWindowMs = env.ANOMALY_VERIFY_WINDOW_SECONDS * 1000;
    this._pruneArray(this.verifyEvents, verifyWindowMs);

    if (credentialHash) {
      const list = this.hashVerifyMap.get(credentialHash) ?? [];
      list.push(timestamp);
      this.hashVerifyMap.set(credentialHash, list);
      this._pruneMap(this.hashVerifyMap, verifyWindowMs);

      if (list.length >= env.ANOMALY_CREDENTIAL_VERIFY_SPIKE_THRESHOLD) {
        const key = `credential-spike:${credentialHash}`;
        if (this._cooldownAllows(key)) {
          await alertDispatcherService.dispatch({
            severity: "high",
            category: "credential_abuse",
            title: "Credential verification spike detected",
            description: "A single credential hash is being verified at abnormal frequency",
            dedupeKey: key,
            metadata: {
              credentialHash,
              verifyCount: list.length,
              sourceIp,
              apiClientId
            }
          });
        }
      }
    }

    if (this.verifyEvents.length >= env.ANOMALY_VERIFY_SPIKE_THRESHOLD) {
      const key = "global-verify-spike";
      if (this._cooldownAllows(key)) {
        await alertDispatcherService.dispatch({
          severity: "critical",
          category: "verification_spike",
          title: "Global verification spike detected",
          description: "Verification traffic exceeded configured threshold",
          dedupeKey: key,
          metadata: {
            verifyCount: this.verifyEvents.length,
            windowSeconds: env.ANOMALY_VERIFY_WINDOW_SECONDS
          }
        });
      }
    }
  }

  async recordIssuance({ issuerId, institutionId }) {
    if (!issuerId) {
      return;
    }

    const timestamp = nowMs();
    const list = this.issuerEventMap.get(issuerId) ?? [];
    list.push(timestamp);
    this.issuerEventMap.set(issuerId, list);

    const issuerWindowMs = env.ANOMALY_ISSUER_WINDOW_SECONDS * 1000;
    this._pruneMap(this.issuerEventMap, issuerWindowMs);

    if (list.length >= env.ANOMALY_ISSUER_ISSUANCE_THRESHOLD) {
      const key = `issuer-spike:${issuerId}`;
      if (this._cooldownAllows(key)) {
        await alertDispatcherService.dispatch({
          severity: "high",
          category: "issuer_abuse",
          title: "Suspicious issuer activity detected",
          description: "Issuer exceeded issuance threshold within the configured window",
          dedupeKey: key,
          metadata: {
            issuerId,
            institutionId,
            issuanceCount: list.length,
            windowSeconds: env.ANOMALY_ISSUER_WINDOW_SECONDS
          }
        });
      }
    }
  }
}

export const anomalyMonitorService = new AnomalyMonitorService();