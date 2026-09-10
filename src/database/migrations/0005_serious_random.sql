CREATE TABLE "inventory" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"location_id" uuid DEFAULT '00000000-0000-0000-0000-000000000001' NOT NULL,
	"on_hand" integer DEFAULT 0 NOT NULL,
	"reserved" integer DEFAULT 0 NOT NULL,
	"available" integer DEFAULT 0 NOT NULL,
	"incoming" integer DEFAULT 0 NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity_delta" integer NOT NULL,
	"quantity_before" integer DEFAULT 0 NOT NULL,
	"quantity_after" integer DEFAULT 0 NOT NULL,
	"reason" varchar(50) NOT NULL,
	"reference_id" varchar(100),
	"reference_type" varchar(50),
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_addresses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country" varchar(100) DEFAULT 'India' NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"type" varchar(20) DEFAULT 'SHIPPING',
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"first_name" varchar(100),
	"last_name" varchar(100),
	"email" varchar(255),
	"phone" varchar(32),
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"notes" text,
	"total_spent" bigint DEFAULT 0 NOT NULL,
	"orders_count" integer DEFAULT 0 NOT NULL,
	"last_order_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory" ADD CONSTRAINT "inventory_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_inventory_store_variant_location" ON "inventory" USING btree ("store_id","variant_id","location_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_store_id" ON "inventory" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_variant_id" ON "inventory" USING btree ("variant_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_product_id" ON "inventory" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_available" ON "inventory" USING btree ("store_id","available");--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_store_variant" ON "inventory_movements" USING btree ("store_id","variant_id");--> statement-breakpoint
CREATE INDEX "idx_inventory_movements_created_at" ON "inventory_movements" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_customer_addresses_store_id" ON "customer_addresses" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_customer_addresses_customer_id" ON "customer_addresses" USING btree ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_customers_store_email" ON "customers" USING btree ("store_id","email");--> statement-breakpoint
CREATE INDEX "idx_customers_store_id" ON "customers" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_customers_email" ON "customers" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_customers_phone" ON "customers" USING btree ("phone");--> statement-breakpoint
CREATE INDEX "idx_customers_created_at" ON "customers" USING btree ("store_id","created_at");--> statement-breakpoint
ALTER TABLE "inventory" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "inventory_movements" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "customer_addresses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_inventory" ON "inventory" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = auth.uid() AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_inventory_movements" ON "inventory_movements" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = auth.uid() AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_customers" ON "customers" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = auth.uid() AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_customer_addresses" ON "customer_addresses" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = auth.uid() AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "public_read_active_inventory" ON "inventory" FOR SELECT TO anon USING (available > 0);