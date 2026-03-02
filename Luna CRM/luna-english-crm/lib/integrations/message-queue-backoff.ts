/** Exponential backoff delays in seconds: 1s, 5s, 30s, 5min, 1h */
const BACKOFF_DELAYS = [1, 5, 30, 300, 3600] as const;

export function getNextRetryDelay(attempts: number): number {
  const index = Math.min(attempts, BACKOFF_DELAYS.length - 1);
  return BACKOFF_DELAYS[index];
}
