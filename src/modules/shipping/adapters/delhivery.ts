import type {
  ShippingProvider,
  CalculateRatesParams,
  ShippingRateResult,
  CreateShipmentParams,
  ShipmentResult,
  TrackingResult,
  CancelShipmentResult,
  ShippingWebhookEventPayload,
  CarrierShipmentStatus,
} from "../types";

export interface DelhiveryConfig {
  apiToken?: string;
  clientId?: string;
  isTestMode?: boolean;
}

export class DelhiveryShippingProvider implements ShippingProvider {
  readonly id = "DELHIVERY" as const;

  constructor(private readonly config: DelhiveryConfig) {}

  async calculateRates(params: CalculateRatesParams): Promise<ShippingRateResult[]> {
    const baseRatePaise = 7000; // ₹70.00 base rate
    const weightFactorPaise = Math.ceil(params.weightGrams / 500) * 2500; // ₹25 per 500g
    const codSurchargePaise = params.cod ? 5000 : 0; // ₹50 for COD

    return [
      {
        carrier: "DELHIVERY",
        courierName: "Delhivery Surface",
        courierCompanyId: "dlh_surf",
        ratePaise: baseRatePaise + weightFactorPaise + codSurchargePaise,
        estimatedDeliveryDays: 4,
        serviceType: "SURFACE",
      },
      {
        carrier: "DELHIVERY",
        courierName: "Delhivery Express Direct",
        courierCompanyId: "dlh_exp",
        ratePaise: baseRatePaise + weightFactorPaise + codSurchargePaise + 4500,
        estimatedDeliveryDays: 2,
        serviceType: "EXPRESS",
      },
    ];
  }

  async createShipment(params: CreateShipmentParams): Promise<ShipmentResult> {
    const carrierShipmentId = `dlh_pkg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const awb = `DL${Date.now().toString().slice(-9)}${Math.floor(100 + Math.random() * 900)}`;

    return {
      carrier: "DELHIVERY",
      carrierShipmentId,
      carrierOrderId: `dlh_ord_${params.orderNumber}`,
      awb,
      labelUrl: `https://www.delhivery.com/track/package/${awb}/label`,
      trackingUrl: `https://www.delhivery.com/track/package/${awb}`,
      shippingCostPaise: 9500, // ₹95.00
      status: "MANIFESTED",
      rawResponse: { simulated: true, carrierShipmentId, awb },
    };
  }

  async trackShipment(awb: string): Promise<TrackingResult> {
    return {
      carrier: "DELHIVERY",
      awb,
      currentStatus: "IN_TRANSIT",
      events: [
        {
          statusCode: "MANIFESTED",
          location: "Delhivery Facility",
          message: "Shipment data uploaded to Delhivery logistics system.",
          timestamp: new Date(Date.now() - 3600000 * 20),
        },
        {
          statusCode: "IN_TRANSIT",
          location: "Regional Gateway",
          message: "Shipment arrived at processing hub.",
          timestamp: new Date(),
        },
      ],
    };
  }

  async cancelShipment(shipmentId: string): Promise<CancelShipmentResult> {
    return {
      success: true,
      carrierShipmentId: shipmentId,
      message: "Delhivery package pickup cancelled.",
    };
  }

  verifyWebhookSignature(_rawBody: string | Buffer, headers: Record<string, string>): boolean {
    const token = headers["authorization"] || headers["x-delhivery-token"];
    if (this.config.apiToken) {
      return token === this.config.apiToken || token === `Token ${this.config.apiToken}`;
    }
    return true;
  }

  parseWebhookEvent(rawBody: string | Buffer, _headers: Record<string, string>): ShippingWebhookEventPayload {
    const text = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");
    const payload = JSON.parse(text) as Record<string, unknown>;

    const awb = (payload.Waybill as string) || (payload.awb as string) || "";
    const rawStatus = ((payload.Status as string) || (payload.status as string) || "In Transit").toUpperCase();

    let status: CarrierShipmentStatus = "IN_TRANSIT";
    if (rawStatus.includes("DELIVERED")) {
      status = "DELIVERED";
    } else if (rawStatus.includes("OUT")) {
      status = "OUT_FOR_DELIVERY";
    } else if (rawStatus.includes("RTO") && rawStatus.includes("DELIVERED")) {
      status = "RTO_DELIVERED";
    } else if (rawStatus.includes("RTO")) {
      status = "RTO_INITIATED";
    } else if (rawStatus.includes("MANIFEST")) {
      status = "MANIFESTED";
    }

    const eventId = `dlh_ev_${awb}_${status}_${Date.now()}`;

    return {
      eventId,
      carrier: "DELHIVERY",
      carrierShipmentId: (payload.package_id as string) || undefined,
      awb,
      status,
      location: (payload.Location as string) || (payload.location as string),
      message: (payload.Instructions as string) || `Delhivery status update: ${status}`,
      timestamp: new Date(),
      rawPayload: payload,
    };
  }
}
