/**
 * Marketplace Reseller Profit Calculation Service
 * Server-authoritative calculations in integer Paise.
 * Never trust client-submitted profit values.
 */

export interface MarketplaceProfitBreakdownDTO {
  retailPricePaise: number;
  sourceCostPaise: number;
  shippingCostPaise: number;
  discountPaise: number;
  paymentFeePaise: number;
  estimatedProfitPaise: number;
  marginPercent: number;
}

export interface CalculateMarketplaceProfitInput {
  retailPricePaise: number;
  sourceCostPaise: number;
  shippingCostPaise?: number;
  discountPaise?: number;
  paymentFeePercent?: number; // e.g. 2.0%
}

/**
 * Calculates reseller profit for a marketplace product.
 * All monetary math is performed in integer Paise.
 */
export function calculateMarketplaceProfit(
  input: CalculateMarketplaceProfitInput
): MarketplaceProfitBreakdownDTO {
  const retailPricePaise = Math.max(0, input.retailPricePaise);
  const sourceCostPaise = Math.max(0, input.sourceCostPaise);
  const shippingCostPaise = Math.max(0, input.shippingCostPaise || 0);
  const discountPaise = Math.max(0, input.discountPaise || 0);

  const effectiveRevenue = Math.max(0, retailPricePaise - discountPaise);

  // Estimate payment gateway fee (default 2% = 200 basis points)
  const feeRate = input.paymentFeePercent !== undefined ? input.paymentFeePercent : 2.0;
  const paymentFeePaise = Math.round((effectiveRevenue * feeRate) / 100);

  const totalDeductions = sourceCostPaise + shippingCostPaise + paymentFeePaise;
  const estimatedProfitPaise = effectiveRevenue - totalDeductions;

  const marginPercent =
    effectiveRevenue > 0
      ? Math.round((estimatedProfitPaise / effectiveRevenue) * 10000) / 100
      : 0;

  return {
    retailPricePaise,
    sourceCostPaise,
    shippingCostPaise,
    discountPaise,
    paymentFeePaise,
    estimatedProfitPaise,
    marginPercent,
  };
}
