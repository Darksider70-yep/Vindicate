const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function withRetry(
  operation,
  {
    retries = 3,
    delayMs = 500,
    maxDelayMs = 5_000,
    factor = 2,
    shouldRetry = () => true,
    onRetry = () => {}
  } = {}
) {
  let attempt = 0;
  let currentDelay = delayMs;
  let lastError;

  while (attempt <= retries) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === retries || !shouldRetry(error, attempt)) {
        throw lastError;
      }

      await onRetry(error, attempt + 1, currentDelay);
      await sleep(currentDelay);
      currentDelay = Math.min(maxDelayMs, Math.floor(currentDelay * factor));
      attempt += 1;
    }
  }

  throw lastError;
}

export async function withTimeout(promise, timeoutMs, timeoutMessage = "Operation timed out") {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutId);
  }
}
