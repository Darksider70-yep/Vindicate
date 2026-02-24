export class VindicateProtocolClient {
  constructor({ baseUrl, accessToken = null, apiKey = null, timeoutMs = 15000 } = {}) {
    if (!baseUrl) {
      throw new Error("baseUrl is required");
    }

    this.baseUrl = String(baseUrl).replace(/\/+$/, "");
    this.accessToken = accessToken;
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  setAccessToken(accessToken) {
    this.accessToken = accessToken;
  }

  setApiKey(apiKey) {
    this.apiKey = apiKey;
  }

  async request(path, { method = "GET", body, headers = {} } = {}) {
    const requestHeaders = {
      Accept: "application/json",
      ...headers
    };

    if (body !== undefined) {
      requestHeaders["Content-Type"] = "application/json";
    }

    if (this.accessToken) {
      requestHeaders.Authorization = `Bearer ${this.accessToken}`;
    }

    if (this.apiKey) {
      requestHeaders["x-api-key"] = this.apiKey;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method,
        headers: requestHeaders,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
        credentials: "include"
      });

      const contentType = response.headers.get("content-type") || "";
      const payload = contentType.includes("application/json")
        ? await response.json()
        : null;

      if (!response.ok) {
        const message = payload?.error?.message || `Request failed with status ${response.status}`;
        const error = new Error(message);
        error.status = response.status;
        error.code = payload?.error?.code || "REQUEST_FAILED";
        error.details = payload?.error?.details;
        throw error;
      }

      return payload?.data ?? payload;
    } catch (error) {
      if (error?.name === "AbortError") {
        const timeoutError = new Error(`Request timed out after ${this.timeoutMs}ms`);
        timeoutError.code = "REQUEST_TIMEOUT";
        throw timeoutError;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}