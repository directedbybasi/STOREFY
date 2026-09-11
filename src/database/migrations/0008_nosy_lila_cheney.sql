CREATE TABLE "payment_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"provider" varchar(50) NOT NULL,
	"encrypted_credentials" text NOT NULL,
	"is_test_mode" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"attempt_number" integer DEFAULT 1 NOT NULL,
	"gateway" varchar(50) NOT NULL,
	"status" varchar(50) DEFAULT 'INITIATED' NOT NULL,
	"gateway_order_id" varchar(255),
	"gateway_payment_id" varchar(255),
	"raw_response" jsonb,
	"failure_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"gateway" varchar(50) NOT NULL,
	"gateway_order_id" varchar(255),
	"gateway_payment_id" varchar(255),
	"amount" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"payment_method" varchar(50) DEFAULT 'UNKNOWN',
	"failure_reason" text,
	"captured_at" timestamp with time zone,
	"idempotency_key" varchar(255),
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(50) NOT NULL,
	"event_id" varchar(255) NOT NULL,
	"event_type" varchar(100) NOT NULL,
	"signature_verified" boolean DEFAULT false NOT NULL,
	"status" varchar(50) DEFAULT 'UNSEEN' NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"payload" jsonb,
	"processing_error" text,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "shipment_tracking_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shipment_id" uuid NOT NULL,
	"status_code" varchar(50) NOT NULL,
	"location" varchar(255),
	"message" text NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"raw_payload" jsonb
);
--> statement-breakpoint
CREATE TABLE "shipments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"fulfillment_id" uuid,
	"carrier" varchar(50) NOT NULL,
	"carrier_shipment_id" varchar(255),
	"carrier_order_id" varchar(255),
	"awb" varchar(255),
	"carrier_status" varchar(100) DEFAULT 'MANIFESTED' NOT NULL,
	"shipping_cost_paise" bigint DEFAULT 0 NOT NULL,
	"label_url" text,
	"tracking_url" text,
	"rto_state" varchar(50) DEFAULT 'NONE' NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shipping_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"carrier" varchar(50) NOT NULL,
	"encrypted_credentials" text NOT NULL,
	"is_test_mode" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"origin_address" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_accounts" ADD CONSTRAINT "payment_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payment_attempts" ADD CONSTRAINT "payment_attempts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipment_tracking_events" ADD CONSTRAINT "shipment_tracking_events_shipment_id_shipments_id_fk" FOREIGN KEY ("shipment_id") REFERENCES "public"."shipments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_fulfillment_id_fulfillments_id_fk" FOREIGN KEY ("fulfillment_id") REFERENCES "public"."fulfillments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shipping_accounts" ADD CONSTRAINT "shipping_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_payment_accounts_store_provider" ON "payment_accounts" USING btree ("store_id","provider");--> statement-breakpoint
CREATE INDEX "idx_payment_accounts_store_id" ON "payment_accounts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_payment_attempts_payment_id" ON "payment_attempts" USING btree ("payment_id");--> statement-breakpoint
CREATE INDEX "idx_payment_attempts_store_id" ON "payment_attempts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_payments_store_id" ON "payments" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_payments_order_id" ON "payments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_payments_gateway_order" ON "payments" USING btree ("gateway_order_id");--> statement-breakpoint
CREATE INDEX "idx_payments_gateway_payment" ON "payments" USING btree ("gateway_payment_id");--> statement-breakpoint
CREATE INDEX "idx_payments_idempotency" ON "payments" USING btree ("store_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_payments_status" ON "payments" USING btree ("store_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_webhook_events_provider_event" ON "webhook_events" USING btree ("provider","event_id");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_status" ON "webhook_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_received_at" ON "webhook_events" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "idx_tracking_events_shipment_id" ON "shipment_tracking_events" USING btree ("shipment_id");--> statement-breakpoint
CREATE INDEX "idx_tracking_events_timestamp" ON "shipment_tracking_events" USING btree ("shipment_id","timestamp");--> statement-breakpoint
CREATE INDEX "idx_shipments_store_id" ON "shipments" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_shipments_order_id" ON "shipments" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_shipments_fulfillment_id" ON "shipments" USING btree ("fulfillment_id");--> statement-breakpoint
CREATE INDEX "idx_shipments_awb" ON "shipments" USING btree ("awb");--> statement-breakpoint
CREATE INDEX "idx_shipments_carrier_shipment_id" ON "shipments" USING btree ("carrier_shipment_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_shipping_accounts_store_carrier" ON "shipping_accounts" USING btree ("store_id","carrier");--> statement-breakpoint
CREATE INDEX "idx_shipping_accounts_store_id" ON "shipping_accounts" USING btree ("store_id");--> statement-breakpoint
ALTER TABLE "payment_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payment_attempts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "webhook_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipping_accounts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "shipment_tracking_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "tenant_isolation_payment_accounts" ON "payment_accounts" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_payment_attempts" ON "payment_attempts" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_payments" ON "payments" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_shipping_accounts" ON "shipping_accounts" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_shipments" ON "shipments" FOR ALL TO authenticated USING (store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "tenant_isolation_shipment_tracking" ON "shipment_tracking_events" FOR ALL TO authenticated USING (shipment_id IN (SELECT sh.id FROM shipments sh WHERE sh.store_id IN (SELECT s.store_id FROM staff s WHERE s.user_id = (select auth.uid()) AND s.is_active = TRUE)) OR EXISTS (SELECT 1 FROM users u WHERE u.id = (select auth.uid()) AND u.is_platform_admin = TRUE));--> statement-breakpoint
CREATE POLICY "anon_access_payments" ON "payments" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_payment_attempts" ON "payment_attempts" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_webhook_events" ON "webhook_events" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_shipments" ON "shipments" FOR ALL TO anon USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "anon_access_shipment_tracking" ON "shipment_tracking_events" FOR ALL TO anon USING (true) WITH CHECK (true);