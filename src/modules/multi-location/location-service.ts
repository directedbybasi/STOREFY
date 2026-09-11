import { db } from "@/database/client";
import { locations } from "@/database/schema";
import { eq, and } from "drizzle-orm";
import { ValidationError } from "@/core/errors";
import type { LocationType } from "@/database/schema";

export interface CreateLocationInput {
  storeId: string;
  name: string;
  code: string;
  type?: LocationType;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  fulfillmentEnabled?: boolean;
  pickupEnabled?: boolean;
}

/**
 * Creates an operational inventory location / warehouse.
 */
export async function createLocation(input: CreateLocationInput) {
  const {
    storeId,
    name,
    code,
    type = "WAREHOUSE",
    addressLine1,
    addressLine2,
    city,
    state,
    postalCode,
    country = "India",
    fulfillmentEnabled = true,
    pickupEnabled = false,
  } = input;

  const [loc] = await db
    .insert(locations)
    .values({
      storeId,
      name,
      code: code.toUpperCase().trim(),
      type,
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      postalCode,
      country,
      fulfillmentEnabled,
      pickupEnabled,
      isActive: true,
    })
    .returning();

  return loc;
}

/**
 * Lists all active locations for a store.
 */
export async function listLocations(storeId: string) {
  return db
    .select()
    .from(locations)
    .where(and(eq(locations.storeId, storeId), eq(locations.isActive, true)));
}
