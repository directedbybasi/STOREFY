"use server";

import { db } from "@/database/client";
import { products, productVariants, productImages, categories } from "@/database/schema";
import { eq, and, asc } from "drizzle-orm";
import { requirePermission } from "@/core/tenant/rbac";
import {
  ProductCsvRowSchema,
  paiseToRupees,
  rupeesToPaise,
  slugify,
  type ProductCsvRow,
} from "./validation";
import { revalidatePath } from "next/cache";

/**
 * Escapes a single CSV field value.
 */
function escapeCsv(val: unknown): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Basic RFC 4180 compliant CSV parser.
 */
function parseCsv(content: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentVal = "";
  let insideQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const nextChar = content[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentVal += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === "," && !insideQuotes) {
      currentRow.push(currentVal.trim());
      currentVal = "";
    } else if ((char === "\r" || char === "\n") && !insideQuotes) {
      if (char === "\r" && nextChar === "\n") {
        i++; // skip CRLF
      }
      currentRow.push(currentVal.trim());
      if (currentRow.some((field) => field.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentVal = "";
    } else {
      currentVal += char;
    }
  }

  if (currentVal.length > 0 || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some((field) => field.length > 0)) {
      rows.push(currentRow);
    }
  }

  return rows;
}

/**
 * Exports products and variants for the active store to a CSV string.
 */
export async function exportProductsCsvAction(): Promise<string> {
  const ctx = await requirePermission("catalog:read");
  const storeId = ctx.store.id;

  const productRows = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      description: products.description,
      basePrice: products.basePrice,
      compareAtPrice: products.compareAtPrice,
      costPrice: products.costPrice,
      sku: products.sku,
      barcode: products.barcode,
      status: products.status,
      categoryName: categories.name,
    })
    .from(products)
    .leftJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.storeId, storeId))
    .orderBy(asc(products.title));

  const headers = [
    "Title",
    "Handle",
    "Description",
    "Price",
    "Compare At Price",
    "Cost Price",
    "SKU",
    "Barcode",
    "Category",
    "Status",
    "Option1 Name",
    "Option1 Value",
    "Option2 Name",
    "Option2 Value",
    "Option3 Name",
    "Option3 Value",
    "Image URL",
  ];

  const lines = [headers.join(",")];

  for (const prod of productRows) {
    // Fetch variants
    const variants = await db
      .select()
      .from(productVariants)
      .where(and(eq(productVariants.productId, prod.id), eq(productVariants.storeId, storeId)))
      .orderBy(asc(productVariants.sortOrder));

    // Fetch primary image
    const [primaryImg] = await db
      .select({ imageUrl: productImages.imageUrl })
      .from(productImages)
      .where(and(eq(productImages.productId, prod.id), eq(productImages.storeId, storeId)))
      .orderBy(asc(productImages.sortOrder))
      .limit(1);

    if (variants.length === 0) {
      lines.push(
        [
          escapeCsv(prod.title),
          escapeCsv(prod.slug),
          escapeCsv(prod.description),
          escapeCsv(paiseToRupees(prod.basePrice)),
          escapeCsv(prod.compareAtPrice ? paiseToRupees(prod.compareAtPrice) : ""),
          escapeCsv(prod.costPrice ? paiseToRupees(prod.costPrice) : ""),
          escapeCsv(prod.sku),
          escapeCsv(prod.barcode),
          escapeCsv(prod.categoryName),
          escapeCsv(prod.status),
          "",
          "",
          "",
          "",
          "",
          "",
          escapeCsv(primaryImg?.imageUrl || ""),
        ].join(",")
      );
    } else {
      for (const v of variants) {
        lines.push(
          [
            escapeCsv(prod.title),
            escapeCsv(prod.slug),
            escapeCsv(prod.description),
            escapeCsv(paiseToRupees(v.price)),
            escapeCsv(v.compareAtPrice ? paiseToRupees(v.compareAtPrice) : ""),
            escapeCsv(v.costPrice ? paiseToRupees(v.costPrice) : ""),
            escapeCsv(v.sku || prod.sku),
            escapeCsv(v.barcode || prod.barcode),
            escapeCsv(prod.categoryName),
            escapeCsv(prod.status),
            escapeCsv(v.option1 ? "Option 1" : ""),
            escapeCsv(v.option1 || ""),
            escapeCsv(v.option2 ? "Option 2" : ""),
            escapeCsv(v.option2 || ""),
            escapeCsv(v.option3 ? "Option 3" : ""),
            escapeCsv(v.option3 || ""),
            escapeCsv(v.imageUrl || primaryImg?.imageUrl || ""),
          ].join(",")
        );
      }
    }
  }

  return lines.join("\n");
}

export interface CsvImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
}

/**
 * Imports products and variants from CSV.
 * Performs rigorous row-by-row validation, reports row-level errors, and prevents partial corruption.
 */
export async function importProductsCsvAction(csvContent: string): Promise<CsvImportResult> {
  const ctx = await requirePermission("catalog:write");
  const storeId = ctx.store.id;

  const rawRows = parseCsv(csvContent);
  if (rawRows.length < 2) {
    return {
      success: false,
      importedCount: 0,
      errors: ["CSV file is empty or missing headers."],
    };
  }

  const [headerRow, ...dataRows] = rawRows;
  const headerMap = new Map<string, number>();
  headerRow.forEach((h, idx) => headerMap.set(h.trim(), idx));

  const requiredHeaders = ["Title", "Price"];
  for (const req of requiredHeaders) {
    if (!headerMap.has(req)) {
      return {
        success: false,
        importedCount: 0,
        errors: [`Missing mandatory CSV column: '${req}'`],
      };
    }
  }

  const getCol = (row: string[], colName: string): string => {
    const idx = headerMap.get(colName);
    return idx !== undefined && row[idx] !== undefined ? row[idx] : "";
  };

  const parsedObjects: Array<{ rowNumber: number; data: ProductCsvRow }> = [];
  const errors: string[] = [];

  // Validate each row
  dataRows.forEach((row, index) => {
    const rowNumber = index + 2; // +1 for 0-index, +1 for header row
    const rawObj = {
      Title: getCol(row, "Title"),
      Handle: getCol(row, "Handle") || undefined,
      Description: getCol(row, "Description") || undefined,
      Price: getCol(row, "Price"),
      "Compare At Price": getCol(row, "Compare At Price") || undefined,
      "Cost Price": getCol(row, "Cost Price") || undefined,
      SKU: getCol(row, "SKU") || undefined,
      Barcode: getCol(row, "Barcode") || undefined,
      Category: getCol(row, "Category") || undefined,
      Status: getCol(row, "Status") || undefined,
      "Option1 Name": getCol(row, "Option1 Name") || undefined,
      "Option1 Value": getCol(row, "Option1 Value") || undefined,
      "Option2 Name": getCol(row, "Option2 Name") || undefined,
      "Option2 Value": getCol(row, "Option2 Value") || undefined,
      "Option3 Name": getCol(row, "Option3 Name") || undefined,
      "Option3 Value": getCol(row, "Option3 Value") || undefined,
      "Image URL": getCol(row, "Image URL") || undefined,
    };

    const parsed = ProductCsvRowSchema.safeParse(rawObj);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        errors.push(`Row ${rowNumber}: ${issue.path.join(".")} — ${issue.message}`);
      });
    } else {
      const priceNum = parseFloat(String(parsed.data.Price));
      if (isNaN(priceNum) || priceNum < 0) {
        errors.push(`Row ${rowNumber}: Price must be a valid non-negative number.`);
      } else {
        parsedObjects.push({ rowNumber, data: parsed.data });
      }
    }
  });

  // If any row fails validation, abort commit to avoid partial corruptions
  if (errors.length > 0) {
    return {
      success: false,
      importedCount: 0,
      errors,
    };
  }

  // Group by Product (by Handle if provided, or Title)
  const productGroups = new Map<string, typeof parsedObjects>();
  for (const item of parsedObjects) {
    const key = item.data.Handle ? slugify(item.data.Handle) : slugify(item.data.Title);
    if (!productGroups.has(key)) {
      productGroups.set(key, []);
    }
    productGroups.get(key)!.push(item);
  }

  let importedCount = 0;

  for (const [key, rows] of productGroups) {
    const first = rows[0].data;
    const baseSlug = key;
    let finalSlug = baseSlug;
    let counter = 1;

    // Check slug uniqueness
    while (true) {
      const [existing] = await db
        .select({ id: products.id })
        .from(products)
        .where(and(eq(products.storeId, storeId), eq(products.slug, finalSlug)))
        .limit(1);
      if (!existing) break;
      counter++;
      finalSlug = `${baseSlug}-${counter}`;
    }

    const basePriceRupees = parseFloat(String(first.Price));
    const compareAtRupees = first["Compare At Price"]
      ? parseFloat(String(first["Compare At Price"]))
      : null;
    const costRupees = first["Cost Price"] ? parseFloat(String(first["Cost Price"])) : null;

    const [createdProduct] = await db
      .insert(products)
      .values({
        storeId,
        source: "MERCHANT",
        fulfillmentType: "MERCHANT",
        title: first.Title,
        slug: finalSlug,
        description: first.Description || null,
        status: (first.Status?.toUpperCase() as "DRAFT" | "ACTIVE" | "ARCHIVED") || "DRAFT",
        basePrice: rupeesToPaise(basePriceRupees),
        compareAtPrice: compareAtRupees ? rupeesToPaise(compareAtRupees) : null,
        costPrice: costRupees ? rupeesToPaise(costRupees) : null,
        sku: first.SKU || null,
        barcode: first.Barcode || null,
        seoTitle: first.Title,
        seoDescription: first.Description || null,
      })
      .returning();

    // Insert variants
    for (let idx = 0; idx < rows.length; idx++) {
      const rowData = rows[idx].data;
      const vPrice = parseFloat(String(rowData.Price));
      const vCompare = rowData["Compare At Price"]
        ? parseFloat(String(rowData["Compare At Price"]))
        : null;
      const vCost = rowData["Cost Price"] ? parseFloat(String(rowData["Cost Price"])) : null;

      const opt1 = rowData["Option1 Value"] || null;
      const opt2 = rowData["Option2 Value"] || null;
      const opt3 = rowData["Option3 Value"] || null;

      const variantTitle =
        [opt1, opt2, opt3].filter(Boolean).join(" / ") ||
        (rows.length > 1 ? `Variant ${idx + 1}` : "Default Title");

      await db.insert(productVariants).values({
        storeId,
        productId: createdProduct.id,
        title: variantTitle,
        sku: rowData.SKU || null,
        barcode: rowData.Barcode || null,
        price: rupeesToPaise(vPrice),
        compareAtPrice: vCompare ? rupeesToPaise(vCompare) : null,
        costPrice: vCost ? rupeesToPaise(vCost) : null,
        option1: opt1,
        option2: opt2,
        option3: opt3,
        imageUrl: rowData["Image URL"] || null,
        sortOrder: idx,
      });

      // Insert image if provided and first row
      if (idx === 0 && rowData["Image URL"]) {
        await db.insert(productImages).values({
          storeId,
          productId: createdProduct.id,
          imageUrl: rowData["Image URL"],
          storagePath: `imported/${Date.now()}-${idx}`,
          altText: first.Title,
          sortOrder: 0,
        });
      }
    }

    importedCount++;
  }

  revalidatePath("/dashboard/products");
  revalidatePath("/products");

  return {
    success: true,
    importedCount,
    errors: [],
  };
}
