CREATE TABLE "ai_generation_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"request_id" uuid NOT NULL,
	"product_id" uuid NOT NULL,
	"tool" varchar(50) NOT NULL,
	"original_value" jsonb,
	"generated_suggestion" jsonb NOT NULL,
	"status" varchar(50) DEFAULT 'SUGGESTED' NOT NULL,
	"applied_at" timestamp with time zone,
	"applied_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"product_id" uuid,
	"tool" varchar(50) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"model" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'GENERATING' NOT NULL,
	"input_tokens_estimate" integer DEFAULT 0 NOT NULL,
	"output_tokens_estimate" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ai_usage_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"date" date NOT NULL,
	"request_count" integer DEFAULT 0 NOT NULL,
	"success_count" integer DEFAULT 0 NOT NULL,
	"failure_count" integer DEFAULT 0 NOT NULL,
	"tokens_used" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "features" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "specifications" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "ai_generation_history" ADD CONSTRAINT "ai_generation_history_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_history" ADD CONSTRAINT "ai_generation_history_request_id_ai_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."ai_requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_history" ADD CONSTRAINT "ai_generation_history_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_generation_history" ADD CONSTRAINT "ai_generation_history_applied_by_users_id_fk" FOREIGN KEY ("applied_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_requests" ADD CONSTRAINT "ai_requests_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ai_usage_ledger" ADD CONSTRAINT "ai_usage_ledger_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ai_history_store_id" ON "ai_generation_history" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_ai_history_product_id" ON "ai_generation_history" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_ai_history_request_id" ON "ai_generation_history" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "idx_ai_requests_store_id" ON "ai_requests" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_ai_requests_product_id" ON "ai_requests" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_ai_requests_tool" ON "ai_requests" USING btree ("store_id","tool");--> statement-breakpoint
CREATE INDEX "idx_ai_requests_created_at" ON "ai_requests" USING btree ("store_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_ai_usage_store_date" ON "ai_usage_ledger" USING btree ("store_id","date");--> statement-breakpoint
CREATE INDEX "idx_ai_usage_store_id" ON "ai_usage_ledger" USING btree ("store_id");