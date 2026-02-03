export function isNetworkError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const message = (error as { message?: string }).message ?? "";
  return /network|failed to fetch|connection/i.test(message);
}
