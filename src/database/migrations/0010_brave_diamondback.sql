CREATE TYPE "public"."settlement_event_type" AS ENUM('EARNING', 'REFUND_ADJUSTMENT', 'RETURN_ADJUSTMENT', 'RTO_ADJUSTMENT', 'PAYOUT', 'REVERSAL', 'MANUAL_ADJUSTMENT');--> statement-breakpoint
CREATE TYPE "public"."settlement_status" AS ENUM('PENDING', 'ELIGIBLE', 'ON_HOLD', 'PROCESSING', 'PAID', 'FAILED', 'REVERSED');--> statement-breakpoint
CREATE TYPE "public"."supplier_order_status" AS ENUM('PENDING', 'ACCEPTED', 'PROCESSING', 'PACKED', 'SHIPPED', 'DELIVERED', 'REJECTED', 'CANCELLED', 'RTO');--> statement-breakpoint
CREATE TYPE "public"."supplier_status" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');--> statement-breakpoint
CREATE TYPE "public"."supplier_verification_action" AS ENUM('SUBMIT', 'APPROVE', 'REJECT', 'SUSPEND', 'REACTIVATE');--> statement-breakpoint
CREATE TYPE "public"."marketplace_availability_status" AS ENUM('AVAILABLE', 'OUT_OF_STOCK', 'UNAVAILABLE', 'UNKNOWN', 'BLOCKED');--> statement-breakpoint
CREATE TYPE "public"."marketplace_type" AS ENUM('MEESHO', 'AMAZON', 'FLIPKART');--> statement-breakpoint
CREATE TYPE "public"."marketplace_order_task_status" AS ENUM('PENDING', 'ORDERED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RTO');--> statement-breakpoint
CREATE TYPE "public"."marketplace_sync_status" AS ENUM('SYNCED', 'PARTIAL', 'STALE', 'ERROR', 'UNAVAILABLE', 'MANUAL_REVIEW');--> statement-breakpoint
CREATE TABLE "reseller_product_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_product_id" uuid NOT NULL,
	"supplier_variant_id" uuid NOT NULL,
	"supplier_cost_snapshot" bigint NOT NULL,
	"auto_sync_price" boolean DEFAULT false NOT NULL,
	"auto_sync_stock" boolean DEFAULT true NOT NULL,
	"auto_sync_title" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_product_id" uuid NOT NULL,
	"supplier_variant_id" uuid NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"available" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_order_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"supplier_product_id" uuid NOT NULL,
	"supplier_variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"supplier_cost_paise" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"supplier_id" uuid NOT NULL,
	"status" "supplier_order_status" DEFAULT 'PENDING' NOT NULL,
	"rejection_reason" text,
	"fulfillment_id" uuid,
	"shipment_id" uuid,
	"supplier_cost_total_paise" bigint DEFAULT 0 NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"deadline_at" timestamp with time zone,
	"accepted_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"period_start" timestamp with time zone NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"total_orders" integer DEFAULT 0 NOT NULL,
	"fulfilled_orders" integer DEFAULT 0 NOT NULL,
	"rejected_orders" integer DEFAULT 0 NOT NULL,
	"cancelled_orders" integer DEFAULT 0 NOT NULL,
	"avg_processing_hours" integer DEFAULT 0 NOT NULL,
	"avg_shipment_hours" integer DEFAULT 0 NOT NULL,
	"rto_count" integer DEFAULT 0 NOT NULL,
	"return_count" integer DEFAULT 0 NOT NULL,
	"defect_rate" integer DEFAULT 0 NOT NULL,
	"on_time_rate" integer DEFAULT 10000 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_policies" (
	"supplier_id" uuid PRIMARY KEY NOT NULL,
	"processing_time_days" integer DEFAULT 3 NOT NULL,
	"return_window_days" integer DEFAULT 7 NOT NULL,
	"returnable" boolean DEFAULT true NOT NULL,
	"restock_on_return" boolean DEFAULT true NOT NULL,
	"cancellation_allowed" boolean DEFAULT true NOT NULL,
	"service_regions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"shipping_policy" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_product_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"supplier_sku" varchar(100),
	"cost_price_paise" bigint NOT NULL,
	"suggested_retail_paise" bigint,
	"option1" varchar(100),
	"option2" varchar(100),
	"option3" varchar(100),
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"slug" varchar(500) NOT NULL,
	"description" text,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"category_name" varchar(255),
	"supplier_sku" varchar(100),
	"cost_price_paise" bigint NOT NULL,
	"suggested_retail_paise" bigint,
	"processing_time_days" integer DEFAULT 3 NOT NULL,
	"returnable" boolean DEFAULT true NOT NULL,
	"return_window_days" integer DEFAULT 7 NOT NULL,
	"weight" varchar(50),
	"dimensions" jsonb,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "supplier_settlement_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"supplier_order_id" uuid,
	"order_id" uuid,
	"event_type" "settlement_event_type" NOT NULL,
	"amount_paise" bigint NOT NULL,
	"running_balance_paise" bigint DEFAULT 0 NOT NULL,
	"settlement_status" "settlement_status" DEFAULT 'PENDING' NOT NULL,
	"paid_at" timestamp with time zone,
	"reference" varchar(255),
	"notes" text,
	"idempotency_key" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_verification_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"supplier_id" uuid NOT NULL,
	"reviewer_user_id" uuid NOT NULL,
	"action" "supplier_verification_action" NOT NULL,
	"from_status" "supplier_status" NOT NULL,
	"to_status" "supplier_status" NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"business_name" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"contact_name" varchar(255) NOT NULL,
	"email" varchar(255) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"business_address" jsonb NOT NULL,
	"pickup_address" jsonb NOT NULL,
	"gstin" varchar(20),
	"pan_number" varchar(15),
	"bank_details" jsonb,
	"status" "supplier_status" DEFAULT 'PENDING' NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by" uuid,
	"rejection_reason" text,
	"suspension_reason" text,
	"logo_url" text,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_connectors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"capabilities" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "marketplace_connectors_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "marketplace_order_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"marketplace" varchar(50) DEFAULT 'MEESHO' NOT NULL,
	"source_product_id" varchar(255) NOT NULL,
	"source_variant_id" varchar(255),
	"status" "marketplace_order_task_status" DEFAULT 'PENDING' NOT NULL,
	"source_order_id" varchar(255),
	"source_order_reference" varchar(255),
	"tracking_number" varchar(255),
	"carrier" varchar(100),
	"notes" text,
	"source_cost_paise" bigint NOT NULL,
	"ordered_at" timestamp with time zone,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_mappings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"marketplace" varchar(50) DEFAULT 'MEESHO' NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"source_product_id" varchar(255) NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid,
	"source_variant_id" varchar(255),
	"source_cost_snapshot_paise" bigint NOT NULL,
	"auto_sync_price" boolean DEFAULT false NOT NULL,
	"auto_sync_availability" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"marketplace_product_id" uuid NOT NULL,
	"source_variant_id" varchar(255) NOT NULL,
	"title" varchar(255) NOT NULL,
	"options" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"source_cost_paise" bigint NOT NULL,
	"available" boolean DEFAULT true NOT NULL,
	"sku" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"marketplace" varchar(50) DEFAULT 'MEESHO' NOT NULL,
	"source_product_id" varchar(255) NOT NULL,
	"source_url" text,
	"source_title" varchar(500) NOT NULL,
	"source_description" text,
	"source_category" varchar(255),
	"source_cost_paise" bigint NOT NULL,
	"source_compare_paise" bigint,
	"currency" varchar(10) DEFAULT 'INR' NOT NULL,
	"rating" numeric(3, 2),
	"review_count" integer DEFAULT 0 NOT NULL,
	"specifications" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"images" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"availability_status" "marketplace_availability_status" DEFAULT 'AVAILABLE' NOT NULL,
	"sync_status" "marketplace_sync_status" DEFAULT 'SYNCED' NOT NULL,
	"last_synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"sync_error_message" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "marketplace_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"marketplace" varchar(50) NOT NULL,
	"source_product_id" varchar(255) NOT NULL,
	"action" varchar(50) NOT NULL,
	"status" varchar(50) NOT NULL,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reseller_product_mappings" ADD CONSTRAINT "reseller_product_mappings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_product_mappings" ADD CONSTRAINT "reseller_product_mappings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_product_mappings" ADD CONSTRAINT "reseller_product_mappings_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_product_mappings" ADD CONSTRAINT "reseller_product_mappings_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_product_mappings" ADD CONSTRAINT "reseller_product_mappings_supplier_product_id_supplier_products_id_fk" FOREIGN KEY ("supplier_product_id") REFERENCES "public"."supplier_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reseller_product_mappings" ADD CONSTRAINT "reseller_product_mappings_supplier_variant_id_supplier_product_variants_id_fk" FOREIGN KEY ("supplier_variant_id") REFERENCES "public"."supplier_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_inventory" ADD CONSTRAINT "supplier_inventory_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_inventory" ADD CONSTRAINT "supplier_inventory_supplier_product_id_supplier_products_id_fk" FOREIGN KEY ("supplier_product_id") REFERENCES "public"."supplier_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_inventory" ADD CONSTRAINT "supplier_inventory_supplier_variant_id_supplier_product_variants_id_fk" FOREIGN KEY ("supplier_variant_id") REFERENCES "public"."supplier_product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_supplier_order_id_supplier_orders_id_fk" FOREIGN KEY ("supplier_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_supplier_product_id_supplier_products_id_fk" FOREIGN KEY ("supplier_product_id") REFERENCES "public"."supplier_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_order_items" ADD CONSTRAINT "supplier_order_items_supplier_variant_id_supplier_product_variants_id_fk" FOREIGN KEY ("supplier_variant_id") REFERENCES "public"."supplier_product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "public"."fulfillments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_orders" ADD CONSTRAINT "supplier_orders_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_performance" ADD CONSTRAINT "supplier_performance_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_policies" ADD CONSTRAINT "supplier_policies_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_product_variants" ADD CONSTRAINT "supplier_product_variants_supplier_product_id_supplier_products_id_fk" FOREIGN KEY ("supplier_product_id") REFERENCES "public"."supplier_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_products" ADD CONSTRAINT "supplier_products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_settlement_ledger" ADD CONSTRAINT "supplier_settlement_ledger_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_settlement_ledger" ADD CONSTRAINT "supplier_settlement_ledger_supplier_order_id_supplier_orders_id_fk" FOREIGN KEY ("supplier_order_id") REFERENCES "public"."supplier_orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_settlement_ledger" ADD CONSTRAINT "supplier_settlement_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_verification_audit" ADD CONSTRAINT "supplier_verification_audit_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_verification_audit" ADD CONSTRAINT "supplier_verification_audit_reviewer_user_id_users_id_fk" FOREIGN KEY ("reviewer_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_tasks" ADD CONSTRAINT "marketplace_order_tasks_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_tasks" ADD CONSTRAINT "marketplace_order_tasks_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_order_tasks" ADD CONSTRAINT "marketplace_order_tasks_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_mappings" ADD CONSTRAINT "marketplace_product_mappings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_mappings" ADD CONSTRAINT "marketplace_product_mappings_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_mappings" ADD CONSTRAINT "marketplace_product_mappings_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_mappings" ADD CONSTRAINT "marketplace_product_mappings_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_product_variants" ADD CONSTRAINT "marketplace_product_variants_marketplace_product_id_marketplace_products_id_fk" FOREIGN KEY ("marketplace_product_id") REFERENCES "public"."marketplace_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_products" ADD CONSTRAINT "marketplace_products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "marketplace_sync_logs" ADD CONSTRAINT "marketplace_sync_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reseller_mappings_store_supplier_variant" ON "reseller_product_mappings" USING btree ("store_id","supplier_product_id","supplier_variant_id");--> statement-breakpoint
CREATE INDEX "idx_reseller_mappings_store_id" ON "reseller_product_mappings" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_reseller_mappings_product_id" ON "reseller_product_mappings" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_reseller_mappings_supplier_id" ON "reseller_product_mappings" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_reseller_mappings_supplier_product" ON "reseller_product_mappings" USING btree ("supplier_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_supplier_inventory_variant" ON "supplier_inventory" USING btree ("supplier_id","supplier_variant_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_inventory_supplier_id" ON "supplier_inventory" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_inventory_product_id" ON "supplier_inventory" USING btree ("supplier_product_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_order_items_order" ON "supplier_order_items" USING btree ("supplier_order_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_order_items_order_item" ON "supplier_order_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_orders_order_id" ON "supplier_orders" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_orders_supplier_id" ON "supplier_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_orders_store_id" ON "supplier_orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_orders_status" ON "supplier_orders" USING btree ("supplier_id","status");--> statement-breakpoint
CREATE INDEX "idx_supplier_orders_created_at" ON "supplier_orders" USING btree ("supplier_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_supplier_performance_supplier" ON "supplier_performance" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_performance_period" ON "supplier_performance" USING btree ("supplier_id","period_start");--> statement-breakpoint
CREATE INDEX "idx_supplier_variants_product_id" ON "supplier_product_variants" USING btree ("supplier_product_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_variants_sku" ON "supplier_product_variants" USING btree ("supplier_sku");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_supplier_products_supplier_slug" ON "supplier_products" USING btree ("supplier_id","slug");--> statement-breakpoint
CREATE INDEX "idx_supplier_products_supplier_id" ON "supplier_products" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_products_status" ON "supplier_products" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_supplier_products_category" ON "supplier_products" USING btree ("category_name");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_settlement_idempotency" ON "supplier_settlement_ledger" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_settlement_supplier_id" ON "supplier_settlement_ledger" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_settlement_supplier_order" ON "supplier_settlement_ledger" USING btree ("supplier_order_id");--> statement-breakpoint
CREATE INDEX "idx_settlement_status" ON "supplier_settlement_ledger" USING btree ("supplier_id","settlement_status");--> statement-breakpoint
CREATE INDEX "idx_settlement_created_at" ON "supplier_settlement_ledger" USING btree ("supplier_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_supplier_audit_supplier_id" ON "supplier_verification_audit" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_supplier_audit_created_at" ON "supplier_verification_audit" USING btree ("supplier_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_suppliers_organization_id" ON "suppliers" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_suppliers_user_id" ON "suppliers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_suppliers_status" ON "suppliers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_suppliers_email" ON "suppliers" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_marketplace_order_task_item" ON "marketplace_order_tasks" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_order_task_order" ON "marketplace_order_tasks" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_order_task_store_status" ON "marketplace_order_tasks" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_marketplace_mapping_unique" ON "marketplace_product_mappings" USING btree ("store_id","product_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_mapping_store" ON "marketplace_product_mappings" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_mapping_src_prod" ON "marketplace_product_mappings" USING btree ("source_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_marketplace_variant_unique" ON "marketplace_product_variants" USING btree ("marketplace_product_id","source_variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_marketplace_prod_store_src" ON "marketplace_products" USING btree ("store_id","marketplace","source_product_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_prod_store" ON "marketplace_products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_prod_source_id" ON "marketplace_products" USING btree ("source_product_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_sync_store" ON "marketplace_sync_logs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_marketplace_sync_src" ON "marketplace_sync_logs" USING btree ("source_product_id");