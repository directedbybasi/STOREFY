import type { AvailabilityResult, AvailabilityStatus } from "../core/types";
import { meeshoClient } from "./client";

/**
 * Checks real-time or cached availability of a Meesho source product.
 */
export async function checkMeeshoAvailability(
  sourceProductId: string
): Promise<AvailabilityResult> {
  try {
    const raw = await meeshoClient.fetchRawProduct(sourceProductId);
    const isAvailable = raw.in_stock !== false;
    const status: AvailabilityStatus = isAvailable ? "AVAILABLE" : "OUT_OF_STOCK";

    return {
      sourceProductId,
      status,
      available: isAvailable,
      checkedAt: new Date().toISOString(),
      message: isAvailable
        ? "Product is currently available at source."
        : "Product is marked out of stock by source supplier.",
    };
  } catch (err) {
    return {
      sourceProductId,
      status: "UNAVAILABLE",
      available: false,
      checkedAt: new Date().toISOString(),
      message: err instanceof Error ? err.message : "Failed to verify source availability.",
    };
  }
}
