-- STOREFY Phase 17 Production Hardening: Enable RLS across all merchant & platform tables and add performance indexes
ALTER TABLE "reseller_product_mappings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_inventory" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_order_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_performance" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_policies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_product_variants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_settlement_ledger" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "supplier_verification_audit" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "suppliers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "marketplace_connectors" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "marketplace_order_tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "marketplace_product_mappings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "marketplace_product_variants" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "marketplace_products" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "marketplace_sync_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ai_generation_history" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ai_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "ai_usage_ledger" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "automation_events" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "automation_runs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "automations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "in_app_notifications" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "notification_deliveries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "notification_preferences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "notification_templates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "abandoned_checkouts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "gift_cards" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "store_credit_accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "store_credit_ledger" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "wallet_accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "wallet_ledger" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "referral_attributions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "referral_codes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "referral_programs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "customer_segments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bundle_components" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_bundles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_cross_sells" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "product_recommendations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "search_merchandising_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "search_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "locations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "stock_transfer_lines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "stock_transfers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "risk_assessments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "store_entitlements" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pos_sessions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "pos_transactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "b2b_companies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "b2b_company_users" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "b2b_orders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "b2b_price_list_items" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "b2b_price_lists" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "duty_configs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "exchange_rates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "localized_content" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "market_countries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "markets" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sales_channels" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "tax_configs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "blog_posts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "cms_pages" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "api_keys" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "app_installations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "developer_apps" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "merchant_webhook_deliveries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "merchant_webhook_endpoints" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "oauth_authorizations" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "backup_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "data_export_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "data_import_jobs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_orders_store_status" ON "orders" ("store_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_products_store_status" ON "products" ("store_id", "status");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_customers_store_created" ON "customers" ("store_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_inventory_store_variant" ON "inventory" ("store_id", "variant_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_audit_logs_store_created" ON "audit_logs" ("store_id", "created_at");
