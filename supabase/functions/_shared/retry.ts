type RetryOptions = {
  delaysMs: number[];
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (error: unknown, retryNumber: number) => void;
};

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  { delaysMs, sleep = defaultSleep, onRetry }: RetryOptions
): Promise<T> {
  for (let attempt = 0; attempt <= delaysMs.length; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt >= delaysMs.length) {
        throw error;
      }

      const delay = delaysMs[attempt] ?? 0;
      onRetry?.(error, attempt + 1);
      await sleep(delay);
    }
  }

  throw new Error("Retry loop exhausted");
}

