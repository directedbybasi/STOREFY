CREATE TABLE "automation_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"event_name" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"idempotency_key" varchar(255) NOT NULL,
	"processed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "automation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"automation_id" uuid NOT NULL,
	"event_id" varchar(100),
	"trigger_event" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"error_details" text,
	"execution_trace" jsonb DEFAULT '{}'::jsonb,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "automations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"trigger_event" varchar(100) NOT NULL,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"execution_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "in_app_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"link" text,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid,
	"recipient" varchar(255) NOT NULL,
	"channel" varchar(50) NOT NULL,
	"template_code" varchar(100),
	"subject" varchar(255),
	"content" text NOT NULL,
	"status" varchar(50) DEFAULT 'QUEUED' NOT NULL,
	"error" text,
	"provider_message_id" varchar(255),
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_preferences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"email_opt_in" boolean DEFAULT true NOT NULL,
	"sms_opt_in" boolean DEFAULT true NOT NULL,
	"push_opt_in" boolean DEFAULT false NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"transactional_required" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"code" varchar(100) NOT NULL,
	"channel" varchar(50) NOT NULL,
	"subject" varchar(255),
	"body_template" text NOT NULL,
	"variables" jsonb DEFAULT '[]'::jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "abandoned_checkouts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"checkout_session_id" uuid NOT NULL,
	"customer_id" uuid,
	"email" varchar(255),
	"phone" varchar(32),
	"cart_value_paise" bigint DEFAULT 0 NOT NULL,
	"recovery_token" varchar(500) NOT NULL,
	"recovery_state" varchar(50) DEFAULT 'ABANDONED' NOT NULL,
	"recovery_sent_at" timestamp with time zone,
	"recovered_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"points_balance" integer DEFAULT 0 NOT NULL,
	"lifetime_points_earned" integer DEFAULT 0 NOT NULL,
	"tier" varchar(50) DEFAULT 'BRONZE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"points_delta" integer NOT NULL,
	"points_before" integer NOT NULL,
	"points_after" integer NOT NULL,
	"order_id" uuid,
	"reason" varchar(255) NOT NULL,
	"reference_id" varchar(100),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_card_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"gift_card_id" uuid NOT NULL,
	"order_id" uuid,
	"type" varchar(50) NOT NULL,
	"amount_paise" bigint NOT NULL,
	"balance_before_paise" bigint NOT NULL,
	"balance_after_paise" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gift_cards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"code_hash" varchar(64) NOT NULL,
	"code_masked" varchar(30) NOT NULL,
	"initial_value_paise" bigint NOT NULL,
	"balance_paise" bigint NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"recipient_email" varchar(255),
	"note" text,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_credit_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"balance_paise" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount_paise" bigint NOT NULL,
	"balance_before_paise" bigint NOT NULL,
	"balance_after_paise" bigint NOT NULL,
	"reason" varchar(255) NOT NULL,
	"reference_id" varchar(100),
	"order_id" uuid,
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"balance_paise" bigint DEFAULT 0 NOT NULL,
	"promo_balance_paise" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"wallet_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"amount_paise" bigint NOT NULL,
	"balance_before_paise" bigint NOT NULL,
	"balance_after_paise" bigint NOT NULL,
	"reason" varchar(255) NOT NULL,
	"reference_id" varchar(100),
	"actor_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"referral_code_id" uuid NOT NULL,
	"referrer_customer_id" uuid NOT NULL,
	"referee_customer_id" uuid NOT NULL,
	"order_id" uuid,
	"qualified_at" timestamp with time zone,
	"reward_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"customer_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "referral_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"reward_type" varchar(50) DEFAULT 'STORE_CREDIT' NOT NULL,
	"referrer_reward_value" bigint NOT NULL,
	"referee_reward_value" bigint NOT NULL,
	"min_purchase_amount_paise" bigint DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_segments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"conditions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"member_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bundle_components" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bundle_id" uuid NOT NULL,
	"component_product_id" uuid NOT NULL,
	"component_variant_id" uuid NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"bundle_product_id" uuid NOT NULL,
	"pricing_mode" varchar(50) DEFAULT 'COMPONENT_DERIVED' NOT NULL,
	"fixed_price_paise" bigint,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_cross_sells" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"cross_sell_product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"placement" varchar(50) DEFAULT 'PDP' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"type" varchar(50) NOT NULL,
	"source_product_id" uuid NOT NULL,
	"recommended_product_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_merchandising_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"query" varchar(255) NOT NULL,
	"boost_product_ids" jsonb DEFAULT '[]'::jsonb,
	"pin_product_ids" jsonb DEFAULT '[]'::jsonb,
	"exclude_product_ids" jsonb DEFAULT '[]'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "search_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"typo_tolerance_enabled" boolean DEFAULT true NOT NULL,
	"custom_boost_fields" jsonb DEFAULT '{}'::jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "locations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"code" varchar(50) NOT NULL,
	"type" varchar(50) DEFAULT 'WAREHOUSE' NOT NULL,
	"address_line1" text NOT NULL,
	"address_line2" text,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"postal_code" varchar(20) NOT NULL,
	"country" varchar(100) DEFAULT 'India' NOT NULL,
	"fulfillment_enabled" boolean DEFAULT true NOT NULL,
	"pickup_enabled" boolean DEFAULT false NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"purchase_order_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"sku" varchar(100),
	"quantity_ordered" integer NOT NULL,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"unit_cost_paise" bigint NOT NULL,
	"total_cost_paise" bigint NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"po_number" varchar(50) NOT NULL,
	"supplier_id" uuid,
	"supplier_name" varchar(255) NOT NULL,
	"destination_location_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"expected_date" timestamp with time zone,
	"total_cost_paise" bigint DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transfer_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"variant_id" uuid NOT NULL,
	"quantity_requested" integer NOT NULL,
	"quantity_shipped" integer DEFAULT 0 NOT NULL,
	"quantity_received" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stock_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"transfer_number" varchar(50) NOT NULL,
	"source_location_id" uuid NOT NULL,
	"destination_location_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'DRAFT' NOT NULL,
	"notes" text,
	"requested_by" uuid,
	"received_by" uuid,
	"shipped_at" timestamp with time zone,
	"received_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "risk_assessments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"order_id" uuid NOT NULL,
	"customer_id" uuid,
	"score_level" varchar(50) DEFAULT 'LOW' NOT NULL,
	"numerical_score" integer DEFAULT 0 NOT NULL,
	"action_taken" varchar(50) DEFAULT 'ALLOW' NOT NULL,
	"signals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"evaluated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"actor_id" uuid,
	"actor_type" varchar(50) DEFAULT 'USER' NOT NULL,
	"event" varchar(100) NOT NULL,
	"entity_type" varchar(100) NOT NULL,
	"entity_id" varchar(100),
	"before_summary" jsonb,
	"after_summary" jsonb,
	"metadata" jsonb DEFAULT '{}'::jsonb,
	"ip_address" varchar(45),
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "store_entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"plan_tier" varchar(50) DEFAULT 'STARTER' NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"quotas" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'ACTIVE' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "automation_events" ADD CONSTRAINT "automation_events_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automation_runs" ADD CONSTRAINT "automation_runs_automation_id_automations_id_fk" FOREIGN KEY ("automation_id") REFERENCES "public"."automations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "automations" ADD CONSTRAINT "automations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "in_app_notifications" ADD CONSTRAINT "in_app_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_deliveries" ADD CONSTRAINT "notification_deliveries_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_checkouts" ADD CONSTRAINT "abandoned_checkouts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_checkouts" ADD CONSTRAINT "abandoned_checkouts_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "public"."checkout_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "abandoned_checkouts" ADD CONSTRAINT "abandoned_checkouts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_accounts" ADD CONSTRAINT "loyalty_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_account_id_loyalty_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."loyalty_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_gift_card_id_gift_cards_id_fk" FOREIGN KEY ("gift_card_id") REFERENCES "public"."gift_cards"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_card_transactions" ADD CONSTRAINT "gift_card_transactions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "gift_cards" ADD CONSTRAINT "gift_cards_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credit_accounts" ADD CONSTRAINT "store_credit_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credit_accounts" ADD CONSTRAINT "store_credit_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credit_ledger" ADD CONSTRAINT "store_credit_ledger_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credit_ledger" ADD CONSTRAINT "store_credit_ledger_account_id_store_credit_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."store_credit_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credit_ledger" ADD CONSTRAINT "store_credit_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credit_ledger" ADD CONSTRAINT "store_credit_ledger_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_credit_ledger" ADD CONSTRAINT "store_credit_ledger_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_accounts" ADD CONSTRAINT "wallet_accounts_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_wallet_id_wallet_accounts_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallet_accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_ledger" ADD CONSTRAINT "wallet_ledger_actor_id_users_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referral_code_id_referral_codes_id_fk" FOREIGN KEY ("referral_code_id") REFERENCES "public"."referral_codes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referrer_customer_id_customers_id_fk" FOREIGN KEY ("referrer_customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referee_customer_id_customers_id_fk" FOREIGN KEY ("referee_customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_codes" ADD CONSTRAINT "referral_codes_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_programs" ADD CONSTRAINT "referral_programs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customer_segments" ADD CONSTRAINT "customer_segments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_components" ADD CONSTRAINT "bundle_components_bundle_id_product_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."product_bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_components" ADD CONSTRAINT "bundle_components_component_product_id_products_id_fk" FOREIGN KEY ("component_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bundle_components" ADD CONSTRAINT "bundle_components_component_variant_id_product_variants_id_fk" FOREIGN KEY ("component_variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_bundles" ADD CONSTRAINT "product_bundles_bundle_product_id_products_id_fk" FOREIGN KEY ("bundle_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cross_sells" ADD CONSTRAINT "product_cross_sells_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_cross_sells" ADD CONSTRAINT "product_cross_sells_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product_recommendations" ADD CONSTRAINT "product_recommendations_source_product_id_products_id_fk" FOREIGN KEY ("source_product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_merchandising_rules" ADD CONSTRAINT "search_merchandising_rules_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "search_settings" ADD CONSTRAINT "search_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "locations" ADD CONSTRAINT "locations_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_purchase_order_id_purchase_orders_id_fk" FOREIGN KEY ("purchase_order_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_destination_location_id_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_transfer_id_stock_transfers_id_fk" FOREIGN KEY ("transfer_id") REFERENCES "public"."stock_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfer_lines" ADD CONSTRAINT "stock_transfer_lines_variant_id_product_variants_id_fk" FOREIGN KEY ("variant_id") REFERENCES "public"."product_variants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_source_location_id_locations_id_fk" FOREIGN KEY ("source_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_destination_location_id_locations_id_fk" FOREIGN KEY ("destination_location_id") REFERENCES "public"."locations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stock_transfers" ADD CONSTRAINT "stock_transfers_received_by_users_id_fk" FOREIGN KEY ("received_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "risk_assessments" ADD CONSTRAINT "risk_assessments_customer_id_customers_id_fk" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_entitlements" ADD CONSTRAINT "store_entitlements_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_automation_events_store_id" ON "automation_events" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_automation_events_idempotency" ON "automation_events" USING btree ("store_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "idx_automation_events_unprocessed" ON "automation_events" USING btree ("store_id","processed_at");--> statement-breakpoint
CREATE INDEX "idx_automation_runs_store_id" ON "automation_runs" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_automation_runs_automation_id" ON "automation_runs" USING btree ("automation_id");--> statement-breakpoint
CREATE INDEX "idx_automation_runs_status" ON "automation_runs" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_automation_runs_created" ON "automation_runs" USING btree ("store_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_automations_store_id" ON "automations" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_automations_store_trigger" ON "automations" USING btree ("store_id","trigger_event","is_active");--> statement-breakpoint
CREATE INDEX "idx_in_app_notifications_store_user" ON "in_app_notifications" USING btree ("store_id","user_id","is_read");--> statement-breakpoint
CREATE INDEX "idx_in_app_notifications_created" ON "in_app_notifications" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_store" ON "notification_deliveries" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_status" ON "notification_deliveries" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_channel" ON "notification_deliveries" USING btree ("store_id","channel");--> statement-breakpoint
CREATE INDEX "idx_notification_deliveries_created" ON "notification_deliveries" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notification_prefs_customer" ON "notification_preferences" USING btree ("store_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_notification_prefs_store" ON "notification_preferences" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_notification_templates_code" ON "notification_templates" USING btree ("store_id","code","channel");--> statement-breakpoint
CREATE INDEX "idx_notification_templates_store" ON "notification_templates" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_abandoned_checkouts_session" ON "abandoned_checkouts" USING btree ("store_id","checkout_session_id");--> statement-breakpoint
CREATE INDEX "idx_abandoned_checkouts_store" ON "abandoned_checkouts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_abandoned_checkouts_state" ON "abandoned_checkouts" USING btree ("store_id","recovery_state");--> statement-breakpoint
CREATE INDEX "idx_abandoned_checkouts_created" ON "abandoned_checkouts" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_loyalty_accounts_customer" ON "loyalty_accounts" USING btree ("store_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_accounts_store" ON "loyalty_accounts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_ledger_account" ON "loyalty_ledger" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_ledger_customer" ON "loyalty_ledger" USING btree ("store_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_ledger_order" ON "loyalty_ledger" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_loyalty_ledger_created" ON "loyalty_ledger" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_gift_card_tx_card" ON "gift_card_transactions" USING btree ("gift_card_id");--> statement-breakpoint
CREATE INDEX "idx_gift_card_tx_order" ON "gift_card_transactions" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_gift_card_tx_created" ON "gift_card_transactions" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_gift_cards_store_hash" ON "gift_cards" USING btree ("store_id","code_hash");--> statement-breakpoint
CREATE INDEX "idx_gift_cards_store_status" ON "gift_cards" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_gift_cards_created" ON "gift_cards" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_store_credit_customer" ON "store_credit_accounts" USING btree ("store_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_store_credit_store" ON "store_credit_accounts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_store_credit_ledger_account" ON "store_credit_ledger" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "idx_store_credit_ledger_customer" ON "store_credit_ledger" USING btree ("store_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_store_credit_ledger_order" ON "store_credit_ledger" USING btree ("order_id");--> statement-breakpoint
CREATE INDEX "idx_store_credit_ledger_created" ON "store_credit_ledger" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_wallet_accounts_customer" ON "wallet_accounts" USING btree ("store_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_accounts_store" ON "wallet_accounts" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_ledger_wallet" ON "wallet_ledger" USING btree ("wallet_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_ledger_customer" ON "wallet_ledger" USING btree ("store_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_wallet_ledger_created" ON "wallet_ledger" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_referral_attr_store" ON "referral_attributions" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_referral_attr_referrer" ON "referral_attributions" USING btree ("referrer_customer_id");--> statement-breakpoint
CREATE INDEX "idx_referral_attr_referee" ON "referral_attributions" USING btree ("referee_customer_id");--> statement-breakpoint
CREATE INDEX "idx_referral_attr_order" ON "referral_attributions" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_referral_codes_code" ON "referral_codes" USING btree ("store_id","code");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_referral_codes_customer" ON "referral_codes" USING btree ("store_id","customer_id");--> statement-breakpoint
CREATE INDEX "idx_referral_codes_store" ON "referral_codes" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_referral_programs_store" ON "referral_programs" USING btree ("store_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_customer_segments_store" ON "customer_segments" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_components_bundle" ON "bundle_components" USING btree ("bundle_id");--> statement-breakpoint
CREATE INDEX "idx_bundle_components_variant" ON "bundle_components" USING btree ("component_variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_product_bundles_product" ON "product_bundles" USING btree ("store_id","bundle_product_id");--> statement-breakpoint
CREATE INDEX "idx_product_bundles_store" ON "product_bundles" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cross_sells_placement" ON "product_cross_sells" USING btree ("store_id","product_id","placement");--> statement-breakpoint
CREATE INDEX "idx_cross_sells_store" ON "product_cross_sells" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_recommendations_type_source" ON "product_recommendations" USING btree ("store_id","type","source_product_id");--> statement-breakpoint
CREATE INDEX "idx_recommendations_store" ON "product_recommendations" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_search_merch_query" ON "search_merchandising_rules" USING btree ("store_id","query");--> statement-breakpoint
CREATE INDEX "idx_search_merch_store" ON "search_merchandising_rules" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_search_settings_store" ON "search_settings" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_locations_store_code" ON "locations" USING btree ("store_id","code");--> statement-breakpoint
CREATE INDEX "idx_locations_store" ON "locations" USING btree ("store_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_po_lines_po" ON "purchase_order_lines" USING btree ("purchase_order_id");--> statement-breakpoint
CREATE INDEX "idx_po_lines_variant" ON "purchase_order_lines" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_purchase_orders_number" ON "purchase_orders" USING btree ("store_id","po_number");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_store_status" ON "purchase_orders" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_purchase_orders_dest" ON "purchase_orders" USING btree ("destination_location_id");--> statement-breakpoint
CREATE INDEX "idx_transfer_lines_transfer" ON "stock_transfer_lines" USING btree ("transfer_id");--> statement-breakpoint
CREATE INDEX "idx_transfer_lines_variant" ON "stock_transfer_lines" USING btree ("variant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_stock_transfers_number" ON "stock_transfers" USING btree ("store_id","transfer_number");--> statement-breakpoint
CREATE INDEX "idx_stock_transfers_store_status" ON "stock_transfers" USING btree ("store_id","status");--> statement-breakpoint
CREATE INDEX "idx_stock_transfers_source" ON "stock_transfers" USING btree ("source_location_id");--> statement-breakpoint
CREATE INDEX "idx_stock_transfers_dest" ON "stock_transfers" USING btree ("destination_location_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_risk_assessments_order" ON "risk_assessments" USING btree ("store_id","order_id");--> statement-breakpoint
CREATE INDEX "idx_risk_assessments_store_level" ON "risk_assessments" USING btree ("store_id","score_level");--> statement-breakpoint
CREATE INDEX "idx_risk_assessments_created" ON "risk_assessments" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_store_created" ON "audit_logs" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_store_entity" ON "audit_logs" USING btree ("store_id","entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "idx_audit_logs_store_event" ON "audit_logs" USING btree ("store_id","event");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_store_entitlements_store" ON "store_entitlements" USING btree ("store_id");