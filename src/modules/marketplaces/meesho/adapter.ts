import type {
  MarketplaceConnector,
  MarketplaceType,
  ProductReferenceValidation,
  NormalizedProduct,
  AvailabilityResult,
  SourcePricing,
} from "../core/types";
import { parseMeeshoReference } from "./parser";
import { meeshoClient } from "./client";
import { normalizeMeeshoProduct } from "./normalizer";
import { checkMeeshoAvailability } from "./availability";
import { marketplaceRegistry } from "../core/registry";

/**
 * Concrete Meesho Marketplace Connector Adapter.
 * Implements the universal MarketplaceConnector interface.
 */
export class MeeshoAdapter implements MarketplaceConnector {
  public readonly name: MarketplaceType = "MEESHO";
  public readonly displayName = "Meesho Marketplace";

  public async validateProductReference(
    input: string
  ): Promise<ProductReferenceValidation> {
    return parseMeeshoReference(input);
  }

  public async fetchProduct(
    canonicalReference: string
  ): Promise<NormalizedProduct> {
    const validation = parseMeeshoReference(canonicalReference);
    if (!validation.isValid || !validation.sourceProductId) {
      throw new Error(validation.error || "Invalid Meesho product reference.");
    }

    const raw = await meeshoClient.fetchRawProduct(validation.sourceProductId);
    return normalizeMeeshoProduct(raw, validation.canonicalReference);
  }

  public async checkAvailability(
    sourceProductId: string
  ): Promise<AvailabilityResult> {
    return checkMeeshoAvailability(sourceProductId);
  }

  public async calculateSourcePricing(
    sourceProductId: string
  ): Promise<SourcePricing> {
    const raw = await meeshoClient.fetchRawProduct(sourceProductId);
    const sourceCostPaise = Math.round((raw.price || 0) * 100);
    const sourceComparePaise = raw.mrp ? Math.round(raw.mrp * 100) : undefined;

    return {
      sourceCostPaise,
      sourceComparePaise,
      currency: "INR",
    };
  }
}

// Instantiate and register singleton
export const meeshoAdapter = new MeeshoAdapter();
marketplaceRegistry.register(meeshoAdapter);
