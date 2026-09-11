CREATE TABLE "pos_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"location_id" uuid NOT NULL,
	"staff_user_id" uuid NOT NULL,
	"session_number" varchar(50) NOT NULL,
	"opening_cash_paise" bigint DEFAULT 0 NOT NULL,
	"closing_cash_paise" bigint,
	"expected_cash_paise" bigint DEFAULT 0 NOT NULL,
	"counted_cash_paise" bigint,
	"cash_variance_paise" bigint DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'OPEN' NOT NULL,
	"opened_at" timestamp with time zone DEFAULT now() NOT NULL,
	"closed_at" timestamp with time zone,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pos_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"pos_session_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"payment_method" varchar(50) NOT NULL,
	"amount_paise" bigint NOT NULL,
	"tender_amount_paise" bigint NOT NULL,
	"change_paise" bigint DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'COMPLETED' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"tax_id" varchar(100),
	"email" varchar(255),
	"phone" varchar(50),
	"credit_limit_paise" bigint DEFAULT 0 NOT NULL,
	"payment_terms" varchar(50) DEFAULT 'PREPAID' NOT NULL,
	"billing_address" jsonb,
	"shipping_addresses" jsonb,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_company_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"customer_id" uuid,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255) NOT NULL,
	"role" varchar(50) DEFAULT 'BUYER' NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"po_number" varchar(100),
	"payment_terms" varchar(50) DEFAULT 'PREPAID' NOT NULL,
	"approval_status" varchar(50) DEFAULT 'APPROVED' NOT NULL,
	"approved_by_user_id" uuid,
	"approved_at" timestamp with time zone,
	"rejection_reason" text,
	"net_terms_due_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_price_list_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"price_list_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"min_quantity" integer DEFAULT 1 NOT NULL,
	"price_paise" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "b2b_price_lists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"company_id" uuid,
	"name" varchar(255) NOT NULL,
	"code" varchar(100) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "duty_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"market_id" uuid,
	"destination_country" varchar(2) NOT NULL,
	"hs_code_prefix" varchar(20),
	"duty_rate_basis_points" integer DEFAULT 0 NOT NULL,
	"handling_fee_paise" bigint DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exchange_rates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"base_currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"target_currency" varchar(3) NOT NULL,
	"rate_scaled_factor" bigint NOT NULL,
	"source" varchar(50) DEFAULT 'MANUAL' NOT NULL,
	"effective_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "localized_content" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"entity_id" uuid NOT NULL,
	"locale" varchar(10) NOT NULL,
	"field_name" varchar(100) NOT NULL,
	"translated_value" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_countries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"country_code" varchar(2) NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"default_currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"default_language" varchar(10) DEFAULT 'en' NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales_channels" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"type" varchar(50) DEFAULT 'ONLINE_STORE' NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tax_configs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"market_id" uuid,
	"country_code" varchar(2) NOT NULL,
	"region_code" varchar(10),
	"tax_name" varchar(100) NOT NULL,
	"tax_rate_basis_points" integer DEFAULT 0 NOT NULL,
	"is_inclusive" boolean DEFAULT false NOT NULL,
	"tax_type" varchar(50) DEFAULT 'GST' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blog_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"excerpt" text,
	"content_html" text DEFAULT '' NOT NULL,
	"featured_image_url" text,
	"author" varchar(255),
	"category" varchar(100),
	"tags" jsonb DEFAULT '[]'::jsonb,
	"seo_title" varchar(255),
	"seo_description" text,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cms_pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"content_html" text DEFAULT '' NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"author" varchar(255),
	"language" varchar(10) DEFAULT 'en' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"label" varchar(255) NOT NULL,
	"key_prefix" varchar(20) NOT NULL,
	"key_hash" varchar(255) NOT NULL,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"expires_at" timestamp with time zone,
	"last_used_at" timestamp with time zone,
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"granted_scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"config" jsonb DEFAULT '{}'::jsonb,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"installed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"uninstalled_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "developer_apps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"client_id" varchar(100) NOT NULL,
	"client_secret_hash" varchar(255) NOT NULL,
	"redirect_uris" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"endpoint_id" uuid NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"signature" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"response_status_code" integer,
	"response_body_snippet" text,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"next_retry_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "merchant_webhook_endpoints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"url" text NOT NULL,
	"description" varchar(255),
	"event_types" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"secret_key_hash" varchar(255) NOT NULL,
	"secret_preview" varchar(20) NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_authorizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"app_id" uuid NOT NULL,
	"user_id" uuid,
	"scopes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"code_hash" varchar(255),
	"code_expires_at" timestamp with time zone,
	"access_token_hash" varchar(255),
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_hash" varchar(255),
	"is_revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backup_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"backup_type" varchar(50) DEFAULT 'METADATA_SNAPSHOT' NOT NULL,
	"status" varchar(50) DEFAULT 'REQUESTED' NOT NULL,
	"snapshot_metadata" jsonb DEFAULT '{}'::jsonb,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "data_export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"format" varchar(10) DEFAULT 'JSON' NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"download_token_hash" varchar(255),
	"download_expires_at" timestamp with time zone,
	"row_count" integer DEFAULT 0 NOT NULL,
	"file_size_bytes" bigint DEFAULT 0,
	"export_data_payload" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "data_import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"entity_type" varchar(50) NOT NULL,
	"format" varchar(10) DEFAULT 'JSON' NOT NULL,
	"status" varchar(50) DEFAULT 'UPLOADED' NOT NULL,
	"total_rows" integer DEFAULT 0 NOT NULL,
	"valid_rows" integer DEFAULT 0 NOT NULL,
	"invalid_rows" integer DEFAULT 0 NOT NULL,
	"validation_errors" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "migration_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"source_platform" varchar(50) DEFAULT 'SHOPIFY' NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"mapping_config" jsonb DEFAULT '{}'::jsonb,
	"errors" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "sales_channel" varchar(50) DEFAULT 'ONLINE' NOT NULL;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_location_id_locations_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."locations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_sessions" ADD CONSTRAINT "pos_sessions_staff_user_id_users_id_fk" FOREIGN KEY ("staff_user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_pos_session_id_pos_sessions_id_fk" FOREIGN KEY ("pos_session_id") REFERENCES "public"."pos_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pos_transactions" ADD CONSTRAINT "pos_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_companies" ADD CONSTRAINT "b2b_companies_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_company_users" ADD CONSTRAINT "b2b_company_users_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_company_users" ADD CONSTRAINT "b2b_company_users_company_id_b2b_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."b2b_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_company_users" ADD CONSTRAINT "b2b_company_users_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_orders" ADD CONSTRAINT "b2b_orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_orders" ADD CONSTRAINT "b2b_orders_company_id_b2b_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."b2b_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_orders" ADD CONSTRAINT "b2b_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_orders" ADD CONSTRAINT "b2b_orders_approved_by_user_id_users_id_fk" FOREIGN KEY ("approved_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_price_list_items" ADD CONSTRAINT "b2b_price_list_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_price_list_items" ADD CONSTRAINT "b2b_price_list_items_price_list_id_b2b_price_lists_id_fk" FOREIGN KEY ("price_list_id") REFERENCES "public"."b2b_price_lists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_price_list_items" ADD CONSTRAINT "b2b_price_list_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_price_list_items" ADD CONSTRAINT "b2b_price_list_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_price_lists" ADD CONSTRAINT "b2b_price_lists_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "b2b_price_lists" ADD CONSTRAINT "b2b_price_lists_company_id_b2b_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."b2b_companies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duty_configs" ADD CONSTRAINT "duty_configs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "duty_configs" ADD CONSTRAINT "duty_configs_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exchange_rates" ADD CONSTRAINT "exchange_rates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "localized_content" ADD CONSTRAINT "localized_content_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_countries" ADD CONSTRAINT "market_countries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_countries" ADD CONSTRAINT "market_countries_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_channels" ADD CONSTRAINT "sales_channels_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_configs" ADD CONSTRAINT "tax_configs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tax_configs" ADD CONSTRAINT "tax_configs_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "blog_posts" ADD CONSTRAINT "blog_posts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cms_pages" ADD CONSTRAINT "cms_pages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_installations" ADD CONSTRAINT "app_installations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_installations" ADD CONSTRAINT "app_installations_app_id_developer_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."developer_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "developer_apps" ADD CONSTRAINT "developer_apps_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_webhook_deliveries" ADD CONSTRAINT "merchant_webhook_deliveries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_webhook_deliveries" ADD CONSTRAINT "merchant_webhook_deliveries_endpoint_id_merchant_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."merchant_webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "merchant_webhook_endpoints" ADD CONSTRAINT "merchant_webhook_endpoints_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_app_id_developer_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."developer_apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oauth_authorizations" ADD CONSTRAINT "oauth_authorizations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "backup_jobs" ADD CONSTRAINT "backup_jobs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_export_jobs" ADD CONSTRAINT "data_export_jobs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "data_import_jobs" ADD CONSTRAINT "data_import_jobs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "migration_jobs" ADD CONSTRAINT "migration_jobs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pos_sessions_store_number" ON "pos_sessions" USING btree ("store_id","session_number");--> statement-breakpoint
CREATE INDEX "idx_pos_sessions_store_id" ON "pos_sessions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_pos_sessions_location_id" ON "pos_sessions" USING btree ("location_id");--> statement-breakpoint
CREATE INDEX "idx_pos_sessions_staff_id" ON "pos_sessions" USING btree ("staff_user_id");--> statement-breakpoint
CREATE INDEX "idx_pos_sessions_status" ON "pos_sessions" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_pos_tx_store_id" ON "pos_transactions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_pos_tx_session_id" ON "pos_transactions" USING btree ("pos_session_id");--> statement-breakpoint
CREATE INDEX "idx_pos_tx_order_id" ON "pos_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_b2b_companies_store_code" ON "b2b_companies" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "idx_b2b_companies_store_id" ON "b2b_companies" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_companies_status" ON "b2b_companies" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_b2b_users_company_email" ON "b2b_company_users" USING btree ("company_id","email");--> statement-breakpoint
CREATE INDEX "idx_b2b_users_store_id" ON "b2b_company_users" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_users_customer_id" ON "b2b_company_users" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_b2b_orders_order_id" ON "b2b_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_orders_store_id" ON "b2b_orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_orders_company_id" ON "b2b_orders" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_orders_approval" ON "b2b_orders" USING btree ("store_id","approval_status");--> statement-breakpoint
CREATE INDEX "idx_b2b_items_store_id" ON "b2b_price_list_items" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_items_list_id" ON "b2b_price_list_items" USING btree ("price_list_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_items_product_id" ON "b2b_price_list_items" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_b2b_price_lists_store_code" ON "b2b_price_lists" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "idx_b2b_price_lists_store_id" ON "b2b_price_lists" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_b2b_price_lists_company_id" ON "b2b_price_lists" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "idx_duty_configs_store_country" ON "duty_configs" USING btree ("store_id","destination_country");--> statement-breakpoint
CREATE INDEX "idx_duty_configs_market" ON "duty_configs" USING btree ("market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_exchange_rates_store_pair" ON "exchange_rates" USING btree ("store_id","base_currency","target_currency");--> statement-breakpoint
CREATE INDEX "idx_exchange_rates_store_id" ON "exchange_rates" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_localized_content_entity_field_locale" ON "localized_content" USING btree ("store_id","entity_type","entity_id","field_name","locale");--> statement-breakpoint
CREATE INDEX "idx_localized_content_entity" ON "localized_content" USING btree ("store_id","entity_type","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_market_countries_store_code" ON "market_countries" USING btree ("store_id","country_code");--> statement-breakpoint
CREATE INDEX "idx_market_countries_market_id" ON "market_countries" USING btree ("market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_markets_store_code" ON "markets" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "idx_markets_store_id" ON "markets" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_sales_channels_store_id" ON "sales_channels" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_sales_channels_type" ON "sales_channels" USING btree ("store_id","type");--> statement-breakpoint
CREATE INDEX "idx_tax_configs_store_country" ON "tax_configs" USING btree ("store_id","country_code");--> statement-breakpoint
CREATE INDEX "idx_tax_configs_market" ON "tax_configs" USING btree ("market_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_blog_posts_store_slug_lang" ON "blog_posts" USING btree ("store_id","slug","language");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_store_status" ON "blog_posts" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_blog_posts_category" ON "blog_posts" USING btree ("store_id","category");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cms_pages_store_slug_lang" ON "cms_pages" USING btree ("store_id","slug","language");--> statement-breakpoint
CREATE INDEX "idx_cms_pages_store_status" ON "cms_pages" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_api_keys_hash" ON "api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "idx_api_keys_store_id" ON "api_keys" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_api_keys_prefix" ON "api_keys" USING btree ("key_prefix");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_app_installations_store_app" ON "app_installations" USING btree ("store_id","app_id");--> statement-breakpoint
CREATE INDEX "idx_app_installations_store_id" ON "app_installations" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_developer_apps_client_id" ON "developer_apps" USING btree ("client_id");--> statement-breakpoint
CREATE INDEX "idx_developer_apps_store_id" ON "developer_apps" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_store_id" ON "merchant_webhook_deliveries" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_endpoint" ON "merchant_webhook_deliveries" USING btree ("endpoint_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_deliveries_status" ON "merchant_webhook_deliveries" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_merchant_webhooks_store_id" ON "merchant_webhook_endpoints" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_merchant_webhooks_status" ON "merchant_webhook_endpoints" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_oauth_auth_store_app" ON "oauth_authorizations" USING btree ("store_id","app_id");--> statement-breakpoint
CREATE INDEX "idx_oauth_auth_access_token" ON "oauth_authorizations" USING btree ("access_token_hash");--> statement-breakpoint
CREATE INDEX "idx_oauth_auth_code" ON "oauth_authorizations" USING btree ("code_hash");--> statement-breakpoint
CREATE INDEX "idx_backup_jobs_store_id" ON "backup_jobs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_backup_jobs_status" ON "backup_jobs" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_data_export_store_id" ON "data_export_jobs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_data_export_status" ON "data_export_jobs" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_data_import_store_id" ON "data_import_jobs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_data_import_status" ON "data_import_jobs" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_migration_jobs_store_id" ON "migration_jobs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_migration_jobs_status" ON "migration_jobs" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_orders_sales_channel" ON "orders" USING btree ("store_id","sales_channel");