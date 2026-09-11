/**
 * STOREFY — Shipping Provider Engine Types
 */

export type ShippingCarrierType = "SHIPROCKET" | "DELHIVERY" | "MANUAL";

export type CarrierShipmentStatus =
  | "MANIFESTED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "FAILED_ATTEMPT"
  | "RTO_INITIATED"
  | "RTO_IN_TRANSIT"
  | "RTO_DELIVERED"
  | "CANCELLED";

export interface CalculateRatesParams {
  storeId: string;
  originPostalCode: string;
  destinationPostalCode: string;
  weightGrams: number;
  lengthCm?: number;
  breadthCm?: number;
  heightCm?: number;
  cod: boolean;
  declaredValuePaise: number;
}

export interface ShippingRateResult {
  carrier: ShippingCarrierType;
  courierName: string;
  courierCompanyId?: string | number;
  ratePaise: number;
  estimatedDeliveryDays?: number;
  serviceType: "STANDARD" | "EXPRESS" | "SURFACE";
}

export interface CreateShipmentParams {
  storeId: string;
  orderId: string;
  orderNumber: string;
  customer: {
    fullName: string;
    phone: string;
    email: string;
    addressLine1: string;
    addressLine2?: string | null;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  };
  origin: {
    name: string;
    phone: string;
    addressLine1: string;
    city: string;
    state: string;
    postalCode: string;
  };
  items: Array<{
    name: string;
    sku?: string | null;
    units: number;
    sellingPricePaise: number;
  }>;
  totalAmountPaise: number;
  weightGrams: number;
  paymentMethod: "COD" | "ONLINE";
}

export interface ShipmentResult {
  carrier: ShippingCarrierType;
  carrierShipmentId: string;
  carrierOrderId?: string;
  awb: string;
  labelUrl?: string;
  trackingUrl?: string;
  shippingCostPaise: number;
  status: CarrierShipmentStatus;
  rawResponse?: Record<string, unknown>;
}

export interface TrackingEvent {
  statusCode: string;
  location?: string;
  message: string;
  timestamp: Date;
}

export interface TrackingResult {
  carrier: ShippingCarrierType;
  awb: string;
  currentStatus: CarrierShipmentStatus;
  events: TrackingEvent[];
}

export interface CancelShipmentResult {
  success: boolean;
  carrierShipmentId: string;
  message?: string;
}

export interface ShippingWebhookEventPayload {
  eventId: string;
  carrier: ShippingCarrierType;
  carrierShipmentId?: string;
  awb?: string;
  status: CarrierShipmentStatus;
  location?: string;
  message?: string;
  timestamp: Date;
  rawPayload: Record<string, unknown>;
}

/**
 * Universal Provider-Agnostic Shipping Carrier Interface
 */
export interface ShippingProvider {
  readonly id: ShippingCarrierType;

  /**
   * Calculates live shipping rates from carrier API
   */
  calculateRates(params: CalculateRatesParams): Promise<ShippingRateResult[]>;

  /**
   * Creates a live carrier shipment, generating AWB and parcel manifest
   */
  createShipment(params: CreateShipmentParams): Promise<ShipmentResult>;

  /**
   * Retrieves active parcel tracking history
   */
  trackShipment(awb: string): Promise<TrackingResult>;

  /**
   * Cancels a generated carrier shipment
   */
  cancelShipment(shipmentId: string, awb?: string): Promise<CancelShipmentResult>;

  /**
   * Validates carrier webhook token/signature
   */
  verifyWebhookSignature(rawBody: string | Buffer, headers: Record<string, string>): boolean;

  /**
   * Parses carrier tracking webhook payload
   */
  parseWebhookEvent(rawBody: string | Buffer, headers: Record<string, string>): ShippingWebhookEventPayload;
}
