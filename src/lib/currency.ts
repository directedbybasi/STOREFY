/**
 * STOREFY — Shared Currency Utilities
 * Pure client-safe utility functions for Paise-to-Rupees formatting.
 * This module MUST NOT import database, ORM, or Node-only dependencies.
 */

export function formatPaiseToRupees(paise: bigint | number): string {
  const numeric = typeof paise === "bigint" ? Number(paise) : paise;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric / 100);
}

export function formatPaiseToCurrency(
  paise: bigint | number,
  currency = "INR",
  locale = "en-IN"
): string {
  const numeric = typeof paise === "bigint" ? Number(paise) : paise;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numeric / 100);
}
