import axios, { AxiosInstance } from "axios";
import { logger } from "../utils/logger";
import {
  TrackingInfo,
  CarrierTrackingEvent,
  CarrierService as ICarrierService,
  ExternalServiceError,
} from "../types";
import { PingResult, PING_TIMEOUT_MS } from "./ping-result";

/**
 * EasyPost carrier names keyed by the carrier codes DelayGuard stores on
 * orders. An unmapped code is sent as no carrier at all, which asks EasyPost
 * to auto-detect from the tracking number — better than guessing wrong.
 */
const EASYPOST_CARRIER_BY_CODE: Record<string, string> = {
  ups: "UPS",
  usps: "USPS",
  fedex: "FedEx",
  dhl_express: "DHLExpress",
  dhl_global_mail: "DHLGlobalMail",
  canada_post: "CanadaPost",
  ontrac: "OnTrac",
  lasership: "LaserShip",
};

// EasyPost reports "the parcel is late" in status_detail, never in status.
const DELAY_STATUS_DETAILS = new Set(["delayed", "weather_delay"]);

const EXCEPTION_STATUS_DETAILS = new Set([
  "delivery_exception",
  "transit_exception",
  "damaged",
  "lost",
  "missorted",
  "refused",
  "address_correction",
]);

// A parcel that has arrived is not late, whatever happened en route, so these
// two statuses are resolved before status_detail is consulted at all.
const TERMINAL_STATUSES = new Set(["delivered", "out_for_delivery"]);

const INTERNAL_STATUS_BY_EASYPOST_STATUS: Record<string, string> = {
  delivered: "DELIVERED",
  out_for_delivery: "OUT_FOR_DELIVERY",
  available_for_pickup: "OUT_FOR_DELIVERY",
  in_transit: "IN_TRANSIT",
  pre_transit: "ACCEPTED",
  failure: "EXCEPTION",
  error: "EXCEPTION",
  cancelled: "EXCEPTION",
  return_to_sender: "EXCEPTION",
  unknown: "UNKNOWN",
};

interface EasyPostTrackingDetail {
  datetime: string;
  status?: string;
  status_detail?: string;
  message?: string;
  description?: string;
  tracking_location?: {
    city?: string | null;
    state?: string | null;
  };
}

export class CarrierService implements ICarrierService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.EASYPOST_API_KEY || "";

    if (!this.apiKey) {
      throw new Error("EasyPost API key is required");
    }

    this.client = axios.create({
      baseURL: "https://api.easypost.com/v2",
      // EasyPost authenticates with HTTP Basic: key as username, no password.
      auth: { username: this.apiKey, password: "" },
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000,
    });
  }

  async getTrackingInfo(
    trackingNumber: string,
    carrierCode: string,
  ): Promise<TrackingInfo> {
    try {
      logger.info(
        `🔍 Fetching tracking info for ${trackingNumber} via ${carrierCode}`,
      );

      const easyPostCarrier = EASYPOST_CARRIER_BY_CODE[carrierCode];
      const response = await this.client.post("/trackers", {
        tracker: {
          tracking_code: trackingNumber,
          ...(easyPostCarrier ? { carrier: easyPostCarrier } : {}),
        },
      });

      const tracker = response.data;

      const trackingInfo: TrackingInfo = {
        trackingNumber: tracker.tracking_code,
        carrierCode,
        status: this.mapStatus(tracker.status, tracker.status_detail),
        estimatedDeliveryDate: tracker.est_delivery_date,
        // EasyPost exposes only the CURRENT estimate. The original is derived
        // on ingest from the first estimate we ever saw for the order.
        originalEstimatedDeliveryDate: undefined,
        trackingUrl: tracker.public_url,
        events: this.mapEvents(tracker.tracking_details),
      };

      logger.info(`✅ Tracking info retrieved: ${trackingInfo.status}`);
      return trackingInfo;
    } catch (error) {
      logger.error(
        `❌ Failed to get tracking info for ${trackingNumber}:`,
        error as Error,
      );

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Tracking number ${trackingNumber} not found`);
        } else if (error.response?.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        } else if (
          error.response?.status === 401 ||
          error.response?.status === 403
        ) {
          // EasyPost answers 403 APIKEY.INACTIVE for a revoked or wrong key,
          // and 401 when no credential is presented at all.
          throw new Error("Invalid API key");
        }
      }

      throw new ExternalServiceError(
        "EasyPost",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  private mapEvents(
    trackingDetails: EasyPostTrackingDetail[] | undefined,
  ): CarrierTrackingEvent[] {
    return (trackingDetails ?? []).map((detail) => {
      const city = detail.tracking_location?.city;
      return {
        timestamp: detail.datetime,
        status: this.mapStatus(detail.status, detail.status_detail),
        location: city
          ? `${city}, ${detail.tracking_location?.state}`
          : undefined,
        description: detail.message || detail.description || "",
      };
    });
  }

  private mapStatus(status?: string, statusDetail?: string): string {
    if (status && TERMINAL_STATUSES.has(status)) {
      return INTERNAL_STATUS_BY_EASYPOST_STATUS[status];
    }

    if (statusDetail && DELAY_STATUS_DETAILS.has(statusDetail)) {
      return "DELAYED";
    }

    if (statusDetail && EXCEPTION_STATUS_DETAILS.has(statusDetail)) {
      return "EXCEPTION";
    }

    return (
      (status && INTERNAL_STATUS_BY_EASYPOST_STATUS[status]) || "UNKNOWN"
    );
  }

  async validateTrackingNumber(
    trackingNumber: string,
    carrierCode: string,
  ): Promise<boolean> {
    try {
      await this.getTrackingInfo(trackingNumber, carrierCode);
      return true;
    } catch (error) {
      return false;
    }
  }

  async ping(): Promise<PingResult> {
    const startTime = Date.now();
    try {
      // Read-only and free. Probing /trackers would bill a tracker creation
      // on every health check.
      await this.client.get("/carrier_accounts", { timeout: PING_TIMEOUT_MS });
      return { status: "healthy", latencyMs: Date.now() - startTime };
    } catch (error) {
      const latencyMs = Date.now() - startTime;
      if (axios.isAxiosError(error)) {
        if (error.code === "ECONNABORTED" || error.code === "ERR_CANCELED") {
          return {
            status: "unhealthy",
            latencyMs,
            error: `timeout after ${PING_TIMEOUT_MS}ms`,
          };
        }
        if (error.response) {
          const statusText = error.response.statusText ?? "";
          return {
            status: "degraded",
            latencyMs,
            error:
              `HTTP ${error.response.status}${statusText ? `: ${statusText}` : ""}`.trim(),
          };
        }
        return {
          status: "unhealthy",
          latencyMs,
          error: error.message || "Unknown EasyPost error",
        };
      }
      return {
        status: "unhealthy",
        latencyMs,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async getCarrierList(): Promise<Array<{ code: string; name: string }>> {
    try {
      const response = await this.client.get("/carrier_accounts");

      return response.data.map((carrierAccount: unknown) => {
        const account = carrierAccount as {
          type: string;
          readable: string;
        };
        return {
          code: account.type,
          name: account.readable,
        };
      });
    } catch (error) {
      logger.error("Carrier service error", error as Error);
      throw new Error("Failed to fetch carrier list");
    }
  }
}
