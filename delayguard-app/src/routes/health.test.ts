/**
 * health-route — Wave 2.3 regression guards.
 *
 * Scope: minimal coverage for the new service-ping abstraction. Specifically:
 *   - pingSettledToServiceStatus maps each PingResult discriminant to the
 *     corresponding /health ServiceStatus shape (1:1, preserving wire contract).
 *   - A rejected settlement (e.g. service constructor threw) maps to
 *     status: "unhealthy" without losing the error message.
 *   - Per .claude/rules/tests.md and the Wave 2.3 spec, no global fetch mock —
 *     the whole point of this wave is to remove that crutch.
 *
 * End-to-end /health response shape and 200-vs-503 HTTP behaviour are covered
 * by the existing integration suites (database + redis mocks live there);
 * this file's job is the PingResult -> ServiceStatus mapping that Wave 2.3
 * introduces.
 */

import { pingSettledToServiceStatus } from "./health";
import { PingResult } from "../services/ping-result";

const TIMESTAMP = "2026-05-14T00:00:00.000Z";

describe("pingSettledToServiceStatus", () => {
  it('maps a fulfilled "healthy" PingResult to ServiceStatus with response_time and no error', () => {
    const settled: PromiseSettledResult<PingResult> = {
      status: "fulfilled",
      value: { status: "healthy", latencyMs: 42 },
    };

    const result = pingSettledToServiceStatus(settled, TIMESTAMP);

    expect(result).toEqual({
      status: "healthy",
      response_time: 42,
      last_check: TIMESTAMP,
    });
    expect(result).not.toHaveProperty("error");
  });

  it('maps a fulfilled "degraded" PingResult (upstream 4xx/5xx) to ServiceStatus preserving the error and response_time', () => {
    const settled: PromiseSettledResult<PingResult> = {
      status: "fulfilled",
      value: {
        status: "degraded",
        latencyMs: 123,
        error: "HTTP 401: Unauthorized",
      },
    };

    const result = pingSettledToServiceStatus(settled, TIMESTAMP);

    expect(result).toEqual({
      status: "degraded",
      response_time: 123,
      error: "HTTP 401: Unauthorized",
      last_check: TIMESTAMP,
    });
  });

  it('maps a fulfilled "unhealthy" PingResult (network/timeout) to ServiceStatus preserving the error and response_time', () => {
    const settled: PromiseSettledResult<PingResult> = {
      status: "fulfilled",
      value: {
        status: "unhealthy",
        latencyMs: 5001,
        error: "timeout after 5000ms",
      },
    };

    const result = pingSettledToServiceStatus(settled, TIMESTAMP);

    expect(result).toEqual({
      status: "unhealthy",
      response_time: 5001,
      error: "timeout after 5000ms",
      last_check: TIMESTAMP,
    });
  });

  it('maps a rejected settlement (e.g. service constructor threw) to "unhealthy" carrying the error message', () => {
    // This is the only path that produces a rejected settlement — ping() itself
    // never throws. Constructor failure (missing API key, etc.) bubbles up via
    // Promise.reject in checkExternalApis.
    const settled: PromiseSettledResult<PingResult> = {
      status: "rejected",
      reason: new Error("ShipEngine API key is required"),
    };

    const result = pingSettledToServiceStatus(settled, TIMESTAMP);

    expect(result).toEqual({
      status: "unhealthy",
      error: "ShipEngine API key is required",
      last_check: TIMESTAMP,
    });
    expect(result).not.toHaveProperty("response_time");
  });

  it("maps a rejected settlement with a string reason without crashing", () => {
    const settled: PromiseSettledResult<PingResult> = {
      status: "rejected",
      reason: "plain-string-rejection",
    };

    const result = pingSettledToServiceStatus(settled, TIMESTAMP);

    expect(result).toEqual({
      status: "unhealthy",
      error: "plain-string-rejection",
      last_check: TIMESTAMP,
    });
  });

  it("maps a rejected settlement with a non-Error, non-string reason to a generic message", () => {
    const settled: PromiseSettledResult<PingResult> = {
      status: "rejected",
      reason: { weird: "object" },
    };

    const result = pingSettledToServiceStatus(settled, TIMESTAMP);

    expect(result.status).toBe("unhealthy");
    expect(result.error).toBe("Service construction failed");
  });
});
