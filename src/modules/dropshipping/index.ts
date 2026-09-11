/**
 * Phase 12: Platform Dropshipping & Supplier Marketplace
 *
 * Module structure:
 * - suppliers/       — Registration, verification, profile CRUD
 * - supplier-catalog/ — Supplier product/variant/inventory management
 * - reseller-import/ — Marketplace browsing, product import, sync
 * - pricing/         — Server-authoritative profit calculation
 * - routing/         — Automated order splitting by supplier
 * - fulfillment/     — Supplier accept/reject/ship state machine
 * - payouts/         — Append-only settlement ledger
 * - returns/         — Supplier return/RTO handling (extends Phase 9)
 * - analytics/       — Supplier performance metrics
 */
export { routeOrderToSuppliers } from "./routing/order-router";
export { calculateResellerProfit } from "./pricing/pricing-service";
