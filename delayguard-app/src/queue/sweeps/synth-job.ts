/**
 * Synthesized-job helper for the cron sweeps (LAUNCH_PLAN B1).
 *
 * The existing processors (src/queue/processors/*) take a BullMQ Job but
 * only ever read `job.data`. A real Job cannot be constructed without a
 * live queue/worker, so the sweeps hand them a minimal synthesized shape.
 * Processors are owned by another workstream and are treated as
 * READ-ONLY here — called, never modified.
 */
import type { Job } from "bullmq";

export function asJob<T>(data: T): Job<T> {
  // Cast via unknown: the processors' contract is `job.data` only.
  return { data } as unknown as Job<T>;
}
