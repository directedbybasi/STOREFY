CREATE TABLE "coupon_redemptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"coupon_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid,
	"customer_email" varchar(255),
	"discount_amount" bigint NOT NULL,
	"redeemed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "coupons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"code" varchar(100) NOT NULL,
	"type" varchar(50) DEFAULT 'PERCENTAGE' NOT NULL,
	"value" bigint NOT NULL,
	"min_spend_amount" bigint DEFAULT 0 NOT NULL,
	"max_discount_amount" bigint,
	"usage_limit" integer,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"per_customer_limit" integer DEFAULT 1 NOT NULL,
	"start_date" timestamp with time zone,
	"end_date" timestamp with time zone,
	"target_type" varchar(50) DEFAULT 'ALL' NOT NULL,
	"target_ids" jsonb DEFAULT '[]'::jsonb,
	"bogo_config" jsonb,
	"description" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_reviews" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"customer_id" uuid,
	"order_id" uuid,
	"order_item_id" uuid,
	"rating" integer NOT NULL,
	"title" varchar(255),
	"body" text NOT NULL,
	"author_name" varchar(255) NOT NULL,
	"author_email" varchar(255),
	"verified_buyer" boolean DEFAULT false NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_moderation_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"review_id" uuid NOT NULL,
	"moderator_user_id" uuid,
	"action" varchar(50) NOT NULL,
	"previous_status" varchar(50),
	"new_status" varchar(50) NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "analytics_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"session_id" varchar(100) NOT NULL,
	"customer_id" uuid,
	"event_name" varchar(100) NOT NULL,
	"resource_type" varchar(50),
	"resource_id" varchar(100),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"utm_content" varchar(100),
	"utm_term" varchar(100),
	"referrer" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "coupon_code" varchar(100);--> statement-breakpoint
ALTER TABLE "checkout_sessions" ADD COLUMN "coupon_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_code" varchar(100);--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "coupon_snapshot" jsonb;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_coupon_id_coupons_id_fk" FOREIGN KEY ("coupon_id") REFERENCES "public"."coupons"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ADD CONSTRAINT "coupon_redemptions_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "coupons" ADD CONSTRAINT "coupons_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_order_item_id_order_items_id_fk" FOREIGN KEY ("order_item_id") REFERENCES "public"."order_items"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_moderation_audit" ADD CONSTRAINT "review_moderation_audit_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_moderation_audit" ADD CONSTRAINT "review_moderation_audit_review_id_product_reviews_id_fk" FOREIGN KEY ("review_id") REFERENCES "public"."product_reviews"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_moderation_audit" ADD CONSTRAINT "review_moderation_audit_moderator_user_id_users_id_fk" FOREIGN KEY ("moderator_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_coupon_redemptions_coupon_id" ON "coupon_redemptions" USING btree ("coupon_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_redemptions_customer" ON "coupon_redemptions" USING btree ("coupon_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_redemptions_email" ON "coupon_redemptions" USING btree ("coupon_id","customer_email");--> statement-breakpoint
CREATE INDEX "idx_coupon_redemptions_order" ON "coupon_redemptions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_coupon_redemptions_store" ON "coupon_redemptions" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_coupons_store_code" ON "coupons" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "idx_coupons_store_id" ON "coupons" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_coupons_active_dates" ON "coupons" USING btree ("store_id","is_active","start_date","end_date");--> statement-breakpoint
CREATE INDEX "idx_product_reviews_product_status" ON "product_reviews" USING btree ("store_id","product_id","status");--> statement-breakpoint
CREATE INDEX "idx_product_reviews_customer_product" ON "product_reviews" USING btree ("store_id","customer_id","product_id");--> statement-breakpoint
CREATE INDEX "idx_product_reviews_email_product" ON "product_reviews" USING btree ("store_id","author_email","product_id");--> statement-breakpoint
CREATE INDEX "idx_product_reviews_status" ON "product_reviews" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_product_reviews_created_at" ON "product_reviews" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_review_moderation_review_id" ON "review_moderation_audit" USING btree ("review_id");--> statement-breakpoint
CREATE INDEX "idx_review_moderation_store_id" ON "review_moderation_audit" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_store_time" ON "analytics_events" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_store_name" ON "analytics_events" USING btree ("store_id","event_name","created_at");--> statement-breakpoint
CREATE INDEX "idx_analytics_events_session" ON "analytics_events" USING btree ("store_id","session_id");--> statement-breakpoint
ALTER TABLE "coupons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "coupon_redemptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "product_reviews" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "review_moderation_audit" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "analytics_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_coupons" ON "coupons" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_coupon_redemptions" ON "coupon_redemptions" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_product_reviews" ON "product_reviews" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_review_moderation" ON "review_moderation_audit" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_analytics_events" ON "analytics_events" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "anon_public_coupons" ON "coupons" FOR SELECT TO anon USING (is_active = true);--> statement-breakpoint
CREATE POLICY "anon_public_reviews" ON "product_reviews" FOR SELECT TO anon USING (status = 'APPROVED');--> statement-breakpoint
CREATE POLICY "anon_insert_reviews" ON "product_reviews" FOR INSERT TO anon WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_insert_analytics" ON "analytics_events" FOR INSERT TO anon WITH CHECK (true);