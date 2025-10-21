import axios, { AxiosInstance } from "axios";
import { logger } from '../utils/logger';
import {
  TrackingInfo,
  CarrierService as ICarrierService,
  ExternalServiceError,
} from "../types";

export class CarrierService implements ICarrierService {
  private client: AxiosInstance;
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.SHIPENGINE_API_KEY!;

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
          data.events?.map((event: unknown) => ({
            timestamp: event.occurred_at,
            status: this.mapStatus(event.status_code),
            location: event.city_locality
              ? `${event.city_locality}, ${event.state_province}`
              : undefined,
            description: event.description || event.status_code,
          })) || [],
      };

      logger.info(`✅ Tracking info retrieved: ${trackingInfo.status}`);
      return trackingInfo;
    } catch (error) {
      logger.error(
        `❌ Failed to get tracking info for ${trackingNumber}:`,
        error,
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

  async getCarrierList(): Promise<Array<{ code: string; name: string }>> {
    try {
      const response = await this.client.get("/v1/carriers");

      return response.data.carriers.map((carrier: unknown) => ({
        code: carrier.carrier_code,
        name: carrier.friendly_name,
      }));
    } catch (error) {
      logger.error($1, error as Error);
      throw new Error("Failed to fetch carrier list");
    }
  }
}
