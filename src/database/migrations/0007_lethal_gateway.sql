CREATE TABLE "fulfillment_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fulfillment_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fulfillments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"carrier" varchar(100) DEFAULT 'Manual' NOT NULL,
	"tracking_number" varchar(255),
	"tracking_url" text,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"shipped_at" timestamp with time zone,
	"delivered_at" timestamp with time zone,
	"rto_reason" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"invoice_number" varchar(50) NOT NULL,
	"seller_details" jsonb NOT NULL,
	"buyer_details" jsonb NOT NULL,
	"line_items" jsonb NOT NULL,
	"tax_breakdown" jsonb NOT NULL,
	"subtotal_amount" bigint NOT NULL,
	"tax_amount" bigint NOT NULL,
	"shipping_amount" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint NOT NULL,
	"pdf_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"title" varchar(500) NOT NULL,
	"variant_title" varchar(255) NOT NULL,
	"sku" varchar(100),
	"image_url" text,
	"quantity" integer NOT NULL,
	"fulfilled_quantity" integer DEFAULT 0 NOT NULL,
	"returned_quantity" integer DEFAULT 0 NOT NULL,
	"unit_price" bigint NOT NULL,
	"subtotal" bigint NOT NULL,
	"tax" bigint DEFAULT 0 NOT NULL,
	"total" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "order_status_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"from_status" varchar(50),
	"to_status" varchar(50) NOT NULL,
	"note" text,
	"changed_by" uuid,
	"actor_type" varchar(50) DEFAULT 'MERCHANT' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"customer_id" uuid,
	"checkout_session_id" uuid,
	"status" varchar(50) DEFAULT 'CONFIRMED' NOT NULL,
	"payment_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"payment_method" varchar(50) DEFAULT 'COD' NOT NULL,
	"fulfillment_status" varchar(50) DEFAULT 'UNFULFILLED' NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"subtotal_amount" bigint DEFAULT 0 NOT NULL,
	"discount_amount" bigint DEFAULT 0 NOT NULL,
	"tax_amount" bigint DEFAULT 0 NOT NULL,
	"shipping_amount" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint DEFAULT 0 NOT NULL,
	"shipping_address" jsonb NOT NULL,
	"billing_address" jsonb NOT NULL,
	"customer_snapshot" jsonb NOT NULL,
	"notes" text,
	"internal_notes" text,
	"cancelled_at" timestamp with time zone,
	"cancelled_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "refunds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"return_id" uuid,
	"amount" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"reason" text NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"gateway" varchar(50) DEFAULT 'COD' NOT NULL,
	"gateway_refund_id" varchar(255),
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "return_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"return_id" uuid NOT NULL,
	"order_item_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "returns" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid,
	"return_number" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'REQUESTED' NOT NULL,
	"reason" text NOT NULL,
	"notes" text,
	"merchant_notes" text,
	"restock_action" varchar(30) DEFAULT 'NO_RESTOCK' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "public"."fulfillments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillment_items" ADD CONSTRAINT "fulfillment_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fulfillments" ADD CONSTRAINT "fulfillments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_status_history" ADD CONSTRAINT "order_status_history_changed_by_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refunds" ADD CONSTRAINT "refunds_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_return_id_returns_id_fk" FOREIGN KEY ("return_id") REFERENCES "public"."returns"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "return_items" ADD CONSTRAINT "return_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "returns" ADD CONSTRAINT "returns_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_fulfillment_items_fulfillment" ON "fulfillment_items" USING btree ("fulfillment_id");--> statement-breakpoint
CREATE INDEX "idx_fulfillment_items_order_item" ON "fulfillment_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE INDEX "idx_fulfillments_order_id" ON "fulfillments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_fulfillments_store_id" ON "fulfillments" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invoices_number" ON "invoices" USING btree ("store_id","invoice_number");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_invoices_order_id" ON "invoices" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_invoices_store_id" ON "invoices" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_order_id" ON "order_items" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_store_id" ON "order_items" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_order_items_variant_id" ON "order_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_order_history_order_id" ON "order_status_history" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_order_history_created_at" ON "order_status_history" USING btree ("order_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_orders_store_number" ON "orders" USING btree ("store_id","order_number");--> statement-breakpoint
CREATE INDEX "idx_orders_store_id" ON "orders" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_orders_customer_id" ON "orders" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_orders_created_at" ON "orders" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_orders_checkout_session" ON "orders" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX "idx_refunds_order_id" ON "refunds" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_refunds_store_id" ON "refunds" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_refunds_return_id" ON "refunds" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "idx_return_items_return_id" ON "return_items" USING btree ("return_id");--> statement-breakpoint
CREATE INDEX "idx_return_items_order_item_id" ON "return_items" USING btree ("order_item_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_returns_store_number" ON "returns" USING btree ("store_id","return_number");--> statement-breakpoint
CREATE INDEX "idx_returns_order_id" ON "returns" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_returns_store_status" ON "returns" USING btree ("store_id","status");--> statement-breakpoint
ALTER TABLE "orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "order_status_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fulfillments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "fulfillment_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "returns" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "return_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "refunds" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_orders" ON "orders" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_order_items" ON "order_items" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_order_history" ON "order_status_history" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_fulfillments" ON "fulfillments" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_fulfillment_items" ON "fulfillment_items" FOR ALL TO authenticated USING (fulfillment_id IN (SELECT f.id FROM fulfillments f WHERE f.store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE)) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_returns" ON "returns" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_return_items" ON "return_items" FOR ALL TO authenticated USING (return_id IN (SELECT r.id FROM returns r WHERE r.store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE)) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_refunds" ON "refunds" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_invoices" ON "invoices" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "anon_access_orders" ON "orders" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_order_items" ON "order_items" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_order_history" ON "order_status_history" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_fulfillments" ON "fulfillments" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_fulfillment_items" ON "fulfillment_items" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_returns" ON "returns" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_return_items" ON "return_items" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_refunds" ON "refunds" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_invoices" ON "invoices" FOR ALL TO anon USING (true) WITH CHECK (true);