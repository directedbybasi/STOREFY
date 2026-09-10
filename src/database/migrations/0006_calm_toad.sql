CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cart_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid,
	"session_token" varchar(255) NOT NULL,
	"coupon_code" varchar(50),
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "carts_session_token_unique" UNIQUE("session_token")
);
--> statement-breakpoint
CREATE TABLE "checkout_session_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"checkout_session_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity" integer NOT NULL,
	"unit_price" bigint NOT NULL,
	"subtotal" bigint NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"cart_id" uuid,
	"customer_id" uuid,
	"session_token" varchar(255) NOT NULL,
	"status" varchar(50) DEFAULT 'RESERVED' NOT NULL,
	"step" varchar(50) DEFAULT 'CONTACT' NOT NULL,
	"email" varchar(255),
	"phone" varchar(32),
	"full_name" varchar(255),
	"shipping_address" jsonb,
	"billing_address" jsonb,
	"shipping_method_id" varchar(100),
	"shipping_method_name" varchar(100),
	"shipping_cost" bigint DEFAULT 0 NOT NULL,
	"payment_method" varchar(50),
	"payment_status" varchar(50) DEFAULT 'NOT_STARTED' NOT NULL,
	"subtotal_amount" bigint DEFAULT 0 NOT NULL,
	"discount_amount" bigint DEFAULT 0 NOT NULL,
	"tax_amount" bigint DEFAULT 0 NOT NULL,
	"total_amount" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"notes" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_session_items" ADD CONSTRAINT "checkout_session_items_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_session_items" ADD CONSTRAINT "checkout_session_items_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_session_items" ADD CONSTRAINT "checkout_session_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_session_items" ADD CONSTRAINT "checkout_session_items_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD CONSTRAINT "checkout_sessions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cart_items_cart_variant" ON "cart_items" USING btree ("cart_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_cart_items_cart_id" ON "cart_items" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "idx_cart_items_variant_id" ON "cart_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_cart_items_product_id" ON "cart_items" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_carts_store_id" ON "carts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_carts_session_token" ON "carts" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "idx_carts_customer_id" ON "carts" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_carts_expires_at" ON "carts" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_carts_store_session" ON "carts" USING btree ("store_id","session_token");--> statement-breakpoint
CREATE INDEX "idx_checkout_items_session_id" ON "checkout_session_items" USING btree ("checkout_session_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_items_store_id" ON "checkout_session_items" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_items_variant_id" ON "checkout_session_items" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_items_status" ON "checkout_session_items" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_checkout_items_expires_at" ON "checkout_session_items" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_store_id" ON "checkout_sessions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_cart_id" ON "checkout_sessions" USING btree ("cart_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_customer_id" ON "checkout_sessions" USING btree ("customer_id");--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_token" ON "checkout_sessions" USING btree ("session_token");--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_status" ON "checkout_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_expires_at" ON "checkout_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "idx_checkout_sessions_store_token" ON "checkout_sessions" USING btree ("store_id","session_token");--> statement-breakpoint
ALTER TABLE "carts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "cart_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "checkout_sessions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "checkout_session_items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_carts" ON "carts" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_cart_items" ON "cart_items" FOR ALL TO authenticated USING (cart_id IN (SELECT c.id FROM carts c WHERE c.store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE)) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_checkout_sessions" ON "checkout_sessions" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_checkout_session_items" ON "checkout_session_items" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "anon_access_carts" ON "carts" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_cart_items" ON "cart_items" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_checkout_sessions" ON "checkout_sessions" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_checkout_session_items" ON "checkout_session_items" FOR ALL TO anon USING (true) WITH CHECK (true);