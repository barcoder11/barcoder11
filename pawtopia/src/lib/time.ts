// Request-time helpers for Server Components (each request renders once, so
// reading the clock here is intentional).
export function nowMs() {
  return Date.now();
}

export function daysAgoIso(days: number) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}
