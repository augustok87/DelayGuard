import axios, { AxiosInstance } from "axios";
import { logger } from "../utils/logger";
import {
  TrackingInfo,
  CarrierService as ICarrierService,
  ExternalServiceError,
} from "../types";
import { PingResult, PING_TIMEOUT_MS } from "./ping-result";

export class CarrierService implements ICarrierService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SHIPENGINE_API_KEY || "";

    if (!this.apiKey) {
      throw new Error("ShipEngine API key is required");
    }

    this.client = axios.create({
      baseURL: "https://api.shipengine.com",
      headers: {
        "API-Key": this.apiKey,
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

      const response = await this.client.get("/v1/tracking", {
        params: {
          tracking_number: trackingNumber,
          carrier_code: carrierCode,
        },
      });

      const data = response.data;

      // Map ShipEngine response to our TrackingInfo interface
      const trackingInfo: TrackingInfo = {
        trackingNumber: data.tracking_number,
        carrierCode: data.carrier_code,
        status: this.mapStatus(data.status_code),
        estimatedDeliveryDate: data.estimated_delivery_date,
        originalEstimatedDeliveryDate: data.original_estimated_delivery_date,
        events:
          data.events?.map((event: unknown) => {
            const shipEngineEvent = event as {
              occurred_at: string;
              status_code: string;
              city_locality?: string;
              state_province?: string;
              description?: string;
            };
            return {
              timestamp: shipEngineEvent.occurred_at,
              status: this.mapStatus(shipEngineEvent.status_code),
              location: shipEngineEvent.city_locality
                ? `${shipEngineEvent.city_locality}, ${shipEngineEvent.state_province}`
                : undefined,
              description:
                shipEngineEvent.description || shipEngineEvent.status_code,
            };
          }) || [],
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
        } else if (error.response?.status === 401) {
          throw new Error("Invalid API key");
        }
      }

      throw new ExternalServiceError(
        "ShipEngine",
        error instanceof Error ? error.message : "Unknown error",
      );
    }
  }

  private mapStatus(shipEngineStatus: string): string {
    // Map ShipEngine status codes to our internal status codes
    const statusMap: { [key: string]: string } = {
      AC: "ACCEPTED",
      AT: "IN_TRANSIT",
      DE: "DELIVERED",
      DL: "DELAYED",
      EX: "EXCEPTION",
      IT: "IN_TRANSIT",
      OD: "OUT_FOR_DELIVERY",
      PU: "PICKED_UP",
      SE: "SHIPPED",
      UN: "UNKNOWN",
    };

    return statusMap[shipEngineStatus] || shipEngineStatus;
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
      await this.client.get("/v1/carriers", { timeout: PING_TIMEOUT_MS });
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
          error: error.message || "Unknown ShipEngine error",
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
      const response = await this.client.get("/v1/carriers");

      return response.data.carriers.map((carrier: unknown) => {
        const shipEngineCarrier = carrier as {
          carrier_code: string;
          friendly_name: string;
        };
        return {
          code: shipEngineCarrier.carrier_code,
          name: shipEngineCarrier.friendly_name,
        };
      });
    } catch (error) {
      logger.error("Carrier service error", error as Error);
      throw new Error("Failed to fetch carrier list");
    }
  }
}
