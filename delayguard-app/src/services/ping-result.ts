/**
 * Discriminated-union return shape for service liveness probes.
 *
 * Three states map 1:1 onto the existing /health response `status` field
 * (preserves wire shape and the 200-vs-503 HTTP contract):
 *
 * - "healthy"   — upstream returned 2xx.
 * - "degraded"  — upstream reachable but returned non-2xx (e.g. 401 bad creds,
 *                 5xx upstream outage). Network works; the vendor rejected.
 * - "unhealthy" — couldn't reach upstream at all (network failure, DNS,
 *                 timeout, SDK threw without an HTTP status).
 *
 * Implementations MUST NEVER throw — every failure path resolves to this shape
 * with `latencyMs` measured from the call start.
 */
export type PingResult =
  | { status: "healthy"; latencyMs: number }
  | { status: "degraded"; latencyMs: number; error: string }
  | { status: "unhealthy"; latencyMs: number; error: string };

export const PING_TIMEOUT_MS = 5000;
