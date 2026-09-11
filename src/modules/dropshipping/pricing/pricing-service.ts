/**
 * Reseller profit calculation — server-authoritative.
 * NEVER trust client-calculated profit values.
 */
export interface ProfitBreakdownDTO {
  retailPricePaise: number;
  supplierCostPaise: number;
  shippingCostPaise: number;
  discountPaise: number;
  estimatedProfitPaise: number;
  marginPercent: number;
}

/**
 * Calculates reseller profit for a product/order item.
 * All values are integer Paise — no floating-point arithmetic in financial calculations.
 */
export function calculateResellerProfit(
  retailPricePaise: number,
  supplierCostPaise: number,
  shippingCostPaise: number = 0,
  discountPaise: number = 0
): ProfitBreakdownDTO {
  const effectiveRevenue = retailPricePaise - discountPaise;
  const estimatedProfitPaise = effectiveRevenue - supplierCostPaise - shippingCostPaise;

  // Margin as basis points (10000 = 100%) for integer-safe calculation
  const marginPercent =
    effectiveRevenue > 0
      ? Math.round((estimatedProfitPaise / effectiveRevenue) * 10000) / 100
      : 0;

  return {
    retailPricePaise,
    supplierCostPaise,
    shippingCostPaise,
    discountPaise,
    estimatedProfitPaise,
    marginPercent,
  };
}
