import { db } from "@/database/client";
import {
  carts,
  cartItems,
  products,
  productVariants,
  inventory,
  type Cart,
  type CartItem,
} from "@/database/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import { NotFoundError, ValidationError, ConflictError } from "@/core/errors";

export interface CartItemDTO {
  id: string;
  variantId: string;
  productId: string;
  productTitle: string;
  variantTitle: string;
  sku: string | null;
  imageUrl: string | null;
  unitPricePaise: number;
  unitPriceFormatted: string;
  quantity: number;
  lineSubtotalPaise: number;
  lineSubtotalFormatted: string;
  availableStock: number;
  isAvailable: boolean;
}

export interface CartDTO {
  id: string;
  storeId: string;
  sessionToken: string;
  customerId: string | null;
  items: CartItemDTO[];
  totalQuantity: number;
  subtotalPaise: number;
  subtotalFormatted: string;
  discountPaise: number;
  discountFormatted: string;
  taxPaise: number;
  taxFormatted: string;
  estimatedShippingPaise: number;
  estimatedShippingFormatted: string;
  totalPaise: number;
  totalFormatted: string;
  currency: string;
  couponCode: string | null;
  expiresAt: Date;
  warnings: string[];
}

export function formatPaiseToRupees(paise: bigint | number): string {
  const numeric = typeof paise === "bigint" ? Number(paise) : paise;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric / 100);
}

/**
 * Finds or creates a cart session record for the given store and session token.
 * Default cart expiration is 30 days.
 */
export async function getOrCreateCart(
  storeId: string,
  sessionToken: string,
  customerId?: string | null
): Promise<Cart> {
  const [existing] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.storeId, storeId), eq(carts.sessionToken, sessionToken)))
    .limit(1);

  if (existing) {
    if (customerId && existing.customerId !== customerId) {
      const [updated] = await db
        .update(carts)
        .set({ customerId, updatedAt: new Date() })
        .where(eq(carts.id, existing.id))
        .returning();
      return updated;
    }
    return existing;
  }

  // Create new cart session with 30-day expiration
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const [created] = await db
    .insert(carts)
    .values({
      storeId,
      sessionToken,
      customerId: customerId || null,
      expiresAt,
    })
    .returning();

  return created;
}

/**
 * Resolves the authoritative cart state strictly from the database.
 * CRITICAL ZERO-TRUST INVARIANT:
 * Client-provided prices, product titles, stock counts, and totals are 100% ignored.
 * All prices are recomputed from product_variants.price in integer Paise.
 */
export async function resolveAuthoritativeCart(
  storeId: string,
  sessionToken: string,
  customerId?: string | null
): Promise<CartDTO> {
  const cart = await getOrCreateCart(storeId, sessionToken, customerId);

  // Query raw items in cart
  const rawItems = await db
    .select({
      id: cartItems.id,
      cartId: cartItems.cartId,
      productId: cartItems.productId,
      variantId: cartItems.variantId,
      quantity: cartItems.quantity,
      createdAt: cartItems.createdAt,
    })
    .from(cartItems)
    .where(eq(cartItems.cartId, cart.id));

  if (rawItems.length === 0) {
    return {
      id: cart.id,
      storeId: cart.storeId,
      sessionToken: cart.sessionToken,
      customerId: cart.customerId,
      items: [],
      totalQuantity: 0,
      subtotalPaise: 0,
      subtotalFormatted: formatPaiseToRupees(0),
      discountPaise: 0,
      discountFormatted: formatPaiseToRupees(0),
      taxPaise: 0,
      taxFormatted: formatPaiseToRupees(0),
      estimatedShippingPaise: 0,
      estimatedShippingFormatted: formatPaiseToRupees(0),
      totalPaise: 0,
      totalFormatted: formatPaiseToRupees(0),
      currency: "INR",
      couponCode: cart.couponCode,
      expiresAt: cart.expiresAt,
      warnings: [],
    };
  }

  const variantIds = rawItems.map((i) => i.variantId);

  // Fetch variants joined with products strictly scoped to active store
  const variantRecords = await db
    .select({
      variantId: productVariants.id,
      variantTitle: productVariants.title,
      variantPrice: productVariants.price,
      variantSku: productVariants.sku,
      variantImageUrl: productVariants.imageUrl,
      variantIsActive: productVariants.isActive,
      productId: products.id,
      productTitle: products.title,
      productStatus: products.status,
      productDeletedAt: products.deletedAt,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        inArray(productVariants.id, variantIds),
        eq(productVariants.storeId, storeId),
        eq(products.storeId, storeId)
      )
    );

  // Fetch current available inventory
  const inventoryRecords = await db
    .select({
      variantId: inventory.variantId,
      available: inventory.available,
      onHand: inventory.onHand,
      reserved: inventory.reserved,
    })
    .from(inventory)
    .where(
      and(
        inArray(inventory.variantId, variantIds),
        eq(inventory.storeId, storeId)
      )
    );

  const variantMap = new Map(variantRecords.map((v) => [v.variantId, v]));
  const inventoryMap = new Map(inventoryRecords.map((i) => [i.variantId, i]));

  const processedItems: CartItemDTO[] = [];
  const warnings: string[] = [];
  let subtotalPaise = 0;
  let totalQuantity = 0;

  for (const raw of rawItems) {
    const variantData = variantMap.get(raw.variantId);
    if (
      !variantData ||
      !variantData.variantIsActive ||
      variantData.productStatus !== "ACTIVE" ||
      variantData.productDeletedAt !== null
    ) {
      warnings.push(`An item is no longer available and was excluded from checkout.`);
      continue;
    }

    const inv = inventoryMap.get(raw.variantId);
    const availableStock = inv ? Math.max(0, inv.available) : 0;
    const isAvailable = availableStock > 0;

    let effectiveQuantity = raw.quantity;
    if (effectiveQuantity > availableStock && availableStock > 0) {
      warnings.push(
        `Quantity for ${variantData.productTitle} (${variantData.variantTitle}) adjusted from ${raw.quantity} to available stock (${availableStock}).`
      );
      effectiveQuantity = availableStock;
    } else if (availableStock === 0) {
      warnings.push(
        `${variantData.productTitle} (${variantData.variantTitle}) is currently out of stock.`
      );
    }

    const unitPricePaise = variantData.variantPrice;
    const lineSubtotalPaise = unitPricePaise * effectiveQuantity;

    if (isAvailable && effectiveQuantity > 0) {
      subtotalPaise += lineSubtotalPaise;
      totalQuantity += effectiveQuantity;
    }

    processedItems.push({
      id: raw.id,
      variantId: raw.variantId,
      productId: raw.productId,
      productTitle: variantData.productTitle,
      variantTitle: variantData.variantTitle,
      sku: variantData.variantSku,
      imageUrl: variantData.variantImageUrl,
      unitPricePaise,
      unitPriceFormatted: formatPaiseToRupees(unitPricePaise),
      quantity: effectiveQuantity,
      lineSubtotalPaise,
      lineSubtotalFormatted: formatPaiseToRupees(lineSubtotalPaise),
      availableStock,
      isAvailable,
    });
  }

  // Calculate taxes and discounts (server-authoritative hooks)
  const discountPaise = 0; // Phase 11 marketing coupon engine hook
  const taxPaise = 0; // Tax-inclusive pricing standard for India retail
  const estimatedShippingPaise = subtotalPaise > 0 && subtotalPaise < 99900 ? 9900 : 0; // Free shipping over ₹999
  const totalPaise = Math.max(0, subtotalPaise - discountPaise + taxPaise + estimatedShippingPaise);

  return {
    id: cart.id,
    storeId: cart.storeId,
    sessionToken: cart.sessionToken,
    customerId: cart.customerId,
    items: processedItems,
    totalQuantity,
    subtotalPaise,
    subtotalFormatted: formatPaiseToRupees(subtotalPaise),
    discountPaise,
    discountFormatted: formatPaiseToRupees(discountPaise),
    taxPaise,
    taxFormatted: formatPaiseToRupees(taxPaise),
    estimatedShippingPaise,
    estimatedShippingFormatted: formatPaiseToRupees(estimatedShippingPaise),
    totalPaise,
    totalFormatted: formatPaiseToRupees(totalPaise),
    currency: "INR",
    couponCode: cart.couponCode,
    expiresAt: cart.expiresAt,
    warnings,
  };
}

/**
 * Adds an item to the cart.
 * If item exists, increments quantity up to available stock.
 */
export async function addItemToCart(
  storeId: string,
  sessionToken: string,
  variantId: string,
  quantity: number,
  customerId?: string | null
): Promise<CartDTO> {
  if (quantity <= 0 || !Number.isInteger(quantity) || quantity > 99) {
    throw new ValidationError("Quantity must be a positive integer between 1 and 99.");
  }

  // 1. Verify variant exists, belongs to this store, and is active
  const [variant] = await db
    .select({
      id: productVariants.id,
      productId: productVariants.productId,
      price: productVariants.price,
      isActive: productVariants.isActive,
      storeId: productVariants.storeId,
      productStatus: products.status,
      productDeletedAt: products.deletedAt,
    })
    .from(productVariants)
    .innerJoin(products, eq(productVariants.productId, products.id))
    .where(
      and(
        eq(productVariants.id, variantId),
        eq(productVariants.storeId, storeId),
        eq(products.storeId, storeId)
      )
    )
    .limit(1);

  if (!variant || !variant.isActive || variant.productStatus !== "ACTIVE" || variant.productDeletedAt) {
    throw new NotFoundError("The requested product variant is unavailable or does not exist.");
  }

  // 2. Check stock availability in inventory
  const [stock] = await db
    .select({ available: inventory.available })
    .from(inventory)
    .where(and(eq(inventory.variantId, variantId), eq(inventory.storeId, storeId)))
    .limit(1);

  const availableStock = stock ? stock.available : 0;
  if (availableStock <= 0) {
    throw new ConflictError("Item is currently out of stock.");
  }

  // 3. Resolve cart
  const cart = await getOrCreateCart(storeId, sessionToken, customerId);

  // 4. Check if line item already exists
  const [existingItem] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)))
    .limit(1);

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity;
    if (newQuantity > availableStock) {
      throw new ConflictError(
        `Cannot add ${quantity} more. Only ${availableStock} units available in stock.`
      );
    }
    if (newQuantity > 99) {
      throw new ValidationError("Maximum limit of 99 units reached for this item.");
    }

    await db
      .update(cartItems)
      .set({ quantity: newQuantity, updatedAt: new Date() })
      .where(eq(cartItems.id, existingItem.id));
  } else {
    if (quantity > availableStock) {
      throw new ConflictError(
        `Requested ${quantity} units, but only ${availableStock} are available.`
      );
    }

    await db.insert(cartItems).values({
      cartId: cart.id,
      productId: variant.productId,
      variantId: variant.id,
      quantity,
    });
  }

  // Return authoritative refreshed cart state
  return resolveAuthoritativeCart(storeId, sessionToken, customerId);
}

/**
 * Updates quantity of a specific variant in the cart.
 */
export async function updateCartItemQuantity(
  storeId: string,
  sessionToken: string,
  variantId: string,
  quantity: number,
  customerId?: string | null
): Promise<CartDTO> {
  if (quantity <= 0 || !Number.isInteger(quantity) || quantity > 99) {
    throw new ValidationError("Quantity must be a positive integer between 1 and 99.");
  }

  const cart = await getOrCreateCart(storeId, sessionToken, customerId);

  // Check inventory stock
  const [stock] = await db
    .select({ available: inventory.available })
    .from(inventory)
    .where(and(eq(inventory.variantId, variantId), eq(inventory.storeId, storeId)))
    .limit(1);

  const availableStock = stock ? stock.available : 0;
  if (quantity > availableStock) {
    throw new ConflictError(
      `Cannot set quantity to ${quantity}. Only ${availableStock} units available.`
    );
  }

  const [existingItem] = await db
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)))
    .limit(1);

  if (!existingItem) {
    throw new NotFoundError("Item not found in your cart.");
  }

  await db
    .update(cartItems)
    .set({ quantity, updatedAt: new Date() })
    .where(eq(cartItems.id, existingItem.id));

  return resolveAuthoritativeCart(storeId, sessionToken, customerId);
}

/**
 * Removes a variant line item from the cart.
 */
export async function removeCartItem(
  storeId: string,
  sessionToken: string,
  variantId: string,
  customerId?: string | null
): Promise<CartDTO> {
  const cart = await getOrCreateCart(storeId, sessionToken, customerId);

  await db
    .delete(cartItems)
    .where(and(eq(cartItems.cartId, cart.id), eq(cartItems.variantId, variantId)));

  return resolveAuthoritativeCart(storeId, sessionToken, customerId);
}

/**
 * Clears all items from the cart.
 */
export async function clearCart(
  storeId: string,
  sessionToken: string,
  customerId?: string | null
): Promise<CartDTO> {
  const cart = await getOrCreateCart(storeId, sessionToken, customerId);

  await db.delete(cartItems).where(eq(cartItems.cartId, cart.id));

  return resolveAuthoritativeCart(storeId, sessionToken, customerId);
}

/**
 * Merges a guest cart into an authenticated customer's cart.
 * Combines quantities for duplicate variants, clamped to available stock.
 * Prohibits cross-store merging.
 */
export async function mergeGuestCartIntoCustomerCart(
  storeId: string,
  guestSessionToken: string,
  customerSessionToken: string,
  customerId: string
): Promise<CartDTO> {
  if (guestSessionToken === customerSessionToken) {
    return resolveAuthoritativeCart(storeId, customerSessionToken, customerId);
  }

  const [guestCart] = await db
    .select()
    .from(carts)
    .where(and(eq(carts.sessionToken, guestSessionToken), eq(carts.storeId, storeId)))
    .limit(1);

  if (!guestCart) {
    return resolveAuthoritativeCart(storeId, customerSessionToken, customerId);
  }

  const customerCart = await getOrCreateCart(storeId, customerSessionToken, customerId);

  const guestItems = await db
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, guestCart.id));

  for (const item of guestItems) {
    const [existing] = await db
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.cartId, customerCart.id), eq(cartItems.variantId, item.variantId)))
      .limit(1);

    // Get stock
    const [stock] = await db
      .select({ available: inventory.available })
      .from(inventory)
      .where(and(eq(inventory.variantId, item.variantId), eq(inventory.storeId, storeId)))
      .limit(1);

    const availableStock = stock ? stock.available : 0;
    if (availableStock <= 0) continue;

    if (existing) {
      const combined = Math.min(existing.quantity + item.quantity, availableStock, 99);
      await db
        .update(cartItems)
        .set({ quantity: combined, updatedAt: new Date() })
        .where(eq(cartItems.id, existing.id));
    } else {
      const initial = Math.min(item.quantity, availableStock, 99);
      if (initial > 0) {
        await db.insert(cartItems).values({
          cartId: customerCart.id,
          productId: item.productId,
          variantId: item.variantId,
          quantity: initial,
        });
      }
    }
  }

  // Delete guest cart line items and cart
  await db.delete(cartItems).where(eq(cartItems.cartId, guestCart.id));
  await db.delete(carts).where(eq(carts.id, guestCart.id));

  return resolveAuthoritativeCart(storeId, customerSessionToken, customerId);
}
