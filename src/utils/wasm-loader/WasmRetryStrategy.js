export class WasmRetryStrategy {
  constructor({ baseDelayMs = 2000, maxAttempts = 3, jitterRatio = 0.1 } = {}) {
    this.baseDelayMs = baseDelayMs;
    this.maxAttempts = maxAttempts;
    this.jitterRatio = jitterRatio;
  }

  updateConfig({ baseDelayMs, maxAttempts, jitterRatio } = {}) {
    if (Number.isFinite(baseDelayMs)) {
      this.baseDelayMs = baseDelayMs;
    }
    if (Number.isFinite(maxAttempts)) {
      this.maxAttempts = maxAttempts;
    }
    if (Number.isFinite(jitterRatio)) {
      this.jitterRatio = jitterRatio;
    }
  }

  withTimeout(promise, timeoutMs, timeoutMessage) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(timeoutMessage || `Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      promise
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async execute(fn, {
    attempts = this.maxAttempts,
    onAttemptStart = () => {},
    onAttemptError = () => {},
    delayMs = this.baseDelayMs
  } = {}) {
    let lastError;
    for (let attempt = 1; attempt <= attempts; attempt++) {
      try {
        onAttemptStart(attempt);
        return await fn(attempt);
      } catch (error) {
        lastError = error;
        onAttemptError(error, attempt);
        if (attempt < attempts) {
          const jitter = delayMs * this.jitterRatio * Math.random();
          await this.delay(delayMs * attempt + jitter);
        }
      }
    }
    const error = lastError || new Error('Operation failed with no error information');
    throw error;
  }
}

export const globalWasmRetryStrategy = new WasmRetryStrategy();
