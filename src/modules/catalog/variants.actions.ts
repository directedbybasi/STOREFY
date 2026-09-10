"use server";

import { requirePermission } from "@/core/tenant/rbac";

export interface OptionDimension {
  name: string; // "Color", "Size", "Material"
  values: string[]; // ["Black", "White"]
}

export interface GeneratedVariant {
  title: string;
  option1?: string;
  option2?: string;
  option3?: string;
  sku?: string;
  priceRupees: number;
  compareAtPriceRupees?: number;
  isActive: boolean;
}

/**
 * Generates Cartesian product combinations for product option dimensions.
 * Color (2) x Size (3) = 6 unique variants.
 */
export async function generateVariantMatrixAction(
  options: OptionDimension[],
  basePriceRupees: number,
  baseSku?: string
): Promise<GeneratedVariant[]> {
  await requirePermission("catalog:write");

  const validOptions = options.filter(
    (opt) => opt.name.trim() && opt.values.filter((v) => v.trim()).length > 0
  );

  if (validOptions.length === 0) {
    return [];
  }

  // Support up to 3 dimensions
  const opt1 = validOptions[0]?.values.map((v) => v.trim()).filter(Boolean) || [];
  const opt2 = validOptions[1]?.values.map((v) => v.trim()).filter(Boolean) || [undefined];
  const opt3 = validOptions[2]?.values.map((v) => v.trim()).filter(Boolean) || [undefined];

  const variants: GeneratedVariant[] = [];
  const seenCombinations = new Set<string>();

  for (const v1 of opt1) {
    for (const v2 of opt2) {
      for (const v3 of opt3) {
        const parts = [v1, v2, v3].filter(Boolean) as string[];
        const title = parts.join(" / ");
        const key = parts.map((p) => p.toLowerCase()).join("|");

        // Prevent duplicate combinations
        if (seenCombinations.has(key)) continue;
        seenCombinations.add(key);

        let sku: string | undefined = undefined;
        if (baseSku) {
          const suffix = parts.map((p) => p.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 3)).join("-");
          sku = `${baseSku}-${suffix}`;
        }

        variants.push({
          title,
          option1: v1,
          option2: v2,
          option3: v3,
          sku,
          priceRupees: basePriceRupees || 0,
          isActive: true,
        });
      }
    }
  }

  return variants;
}
