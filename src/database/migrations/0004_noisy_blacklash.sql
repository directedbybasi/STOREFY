CREATE TYPE "public"."fulfillment_type" AS ENUM('MERCHANT', 'PLATFORM_DROPSHIP', 'MEESHO_RESELLING');--> statement-breakpoint
CREATE TYPE "public"."product_source" AS ENUM('MERCHANT', 'PLATFORM_SUPPLIER', 'MEESHO');--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"parent_id" uuid,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"image_url" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"is_featured" boolean DEFAULT false NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_images" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"image_url" text NOT NULL,
	"storage_path" text NOT NULL,
	"alt_text" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"sku" varchar(100),
	"barcode" varchar(100),
	"price" bigint NOT NULL,
	"compare_at_price" bigint,
	"cost_price" bigint,
	"option1" varchar(100),
	"option2" varchar(100),
	"option3" varchar(100),
	"image_url" text,
	"weight" numeric(8, 2),
	"is_active" boolean DEFAULT true NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"source" "product_source" DEFAULT 'MERCHANT' NOT NULL,
	"fulfillment_type" "fulfillment_type" DEFAULT 'MERCHANT' NOT NULL,
	"supplier_id" uuid,
	"supplier_product_id" uuid,
	"title" varchar(500) NOT NULL,
	"slug" varchar(500) NOT NULL,
	"description" text,
	"short_description" text,
	"product_type" varchar(100),
	"vendor" varchar(255),
	"brand" varchar(255),
	"category_id" uuid,
	"tags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"base_price" bigint NOT NULL,
	"compare_at_price" bigint,
	"cost_price" bigint,
	"sku" varchar(100),
	"barcode" varchar(100),
	"track_inventory" boolean DEFAULT true NOT NULL,
	"allow_backorders" boolean DEFAULT false NOT NULL,
	"low_stock_threshold" integer DEFAULT 5 NOT NULL,
	"is_physical" boolean DEFAULT true NOT NULL,
	"weight" numeric(8, 2),
	"dimensions" jsonb,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "collections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"image_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_automatic" boolean DEFAULT false NOT NULL,
	"rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_collections" (
	"product_id" uuid NOT NULL,
	"collection_id" uuid NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "product_collections_product_id_collection_id_pk" PRIMARY KEY("product_id","collection_id")
);
--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_variants" ADD CONSTRAINT "product_variants_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collections" ADD CONSTRAINT "collections_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_collections" ADD CONSTRAINT "product_collections_collection_id_collections_id_fk" FOREIGN KEY ("collection_id") REFERENCES "public"."collections"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_categories_store_slug" ON "categories" USING btree ("store_id","slug");--> statement-breakpoint
CREATE INDEX "idx_categories_store_id" ON "categories" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_categories_parent_id" ON "categories" USING btree ("parent_id");--> statement-breakpoint
CREATE INDEX "idx_product_images_product_id" ON "product_images" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_images_store_product" ON "product_images" USING btree ("store_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_product_variants_product_id" ON "product_variants" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_product_variants_store_product" ON "product_variants" USING btree ("store_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_product_variants_sku" ON "product_variants" USING btree ("sku");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_products_store_slug" ON "products" USING btree ("store_id","slug");--> statement-breakpoint
CREATE INDEX "idx_products_store_id" ON "products" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_products_category_id" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_products_status" ON "products" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_products_created_at" ON "products" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_collections_store_slug" ON "collections" USING btree ("store_id","slug");--> statement-breakpoint
CREATE INDEX "idx_collections_store_id" ON "collections" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_product_collections_collection_id" ON "product_collections" USING btree ("collection_id");--> statement-breakpoint
CREATE INDEX "idx_product_collections_product_id" ON "product_collections" USING btree ("product_id");--> statement-breakpoint
ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "products" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_variants" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_images" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_collections" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_categories" ON "categories" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = auth.uid() AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_products" ON "products" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = auth.uid() AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_product_variants" ON "product_variants" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = auth.uid() AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_product_images" ON "product_images" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = auth.uid() AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_collections" ON "collections" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = auth.uid() AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = auth.uid() AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "public_read_active_products" ON "products" FOR SELECT TO anon USING (status = 'ACTIVE' AND deleted_at IS NULL);--> statement-breakpoint
CREATE POLICY "public_read_active_variants" ON "product_variants" FOR SELECT TO anon USING (is_active = TRUE);--> statement-breakpoint
CREATE POLICY "public_read_product_images" ON "product_images" FOR SELECT TO anon USING (TRUE);--> statement-breakpoint
CREATE POLICY "public_read_active_collections" ON "collections" FOR SELECT TO anon USING (is_active = TRUE);--> statement-breakpoint
CREATE POLICY "public_read_categories" ON "categories" FOR SELECT TO anon USING (TRUE);--> statement-breakpoint
CREATE POLICY "public_read_product_collections" ON "product_collections" FOR SELECT TO anon USING (TRUE);