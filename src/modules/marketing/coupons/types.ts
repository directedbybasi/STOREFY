import type { Coupon, CouponDiscountType, CouponTargetType, BogoConfig, CouponSnapshot } from "@/database/schema";

export type { Coupon, CouponDiscountType, CouponTargetType, BogoConfig, CouponSnapshot };

export interface CartItemForCoupon {
  id: string;
  productId: string;
  variantId: string;
  categoryId?: string | null;
  collectionIds?: string[];
  quantity: number;
  unitPricePaise: number;
  subtotalPaise: number;
}

export interface CalculateCouponInput {
  storeId: string;
  couponCode: string;
  items: CartItemForCoupon[];
  subtotalPaise: number;
  shippingCostPaise: number;
  customerId?: string | null;
  customerEmail?: string | null;
}

export interface CalculatedCouponResult {
  couponId: string;
  code: string;
  type: CouponDiscountType;
  value: number;
  eligibleSubtotalPaise: number;
  discountAmountPaise: number;
  shippingDiscountPaise: number;
  finalSubtotalPaise: number;
  finalShippingCostPaise: number;
  couponSnapshot: CouponSnapshot;
}
