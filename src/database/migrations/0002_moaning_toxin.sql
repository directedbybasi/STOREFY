CREATE TABLE "store_themes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT false NOT NULL,
	"settings_schema" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_id" uuid,
	"store_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"page_type" varchar(50) DEFAULT 'CUSTOM' NOT NULL,
	"is_published" boolean DEFAULT true NOT NULL,
	"seo_title" varchar(255),
	"seo_description" text,
	"content" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "navigation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"name" varchar(100) NOT NULL,
	"handle" varchar(100) NOT NULL,
	"items" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "stores" ADD COLUMN "status" varchar(50) DEFAULT 'ACTIVE' NOT NULL;--> statement-breakpoint
ALTER TABLE "store_themes" ADD CONSTRAINT "store_themes_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_theme_id_store_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."store_themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pages" ADD CONSTRAINT "pages_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "navigation" ADD CONSTRAINT "navigation_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_store_themes_store_id" ON "store_themes" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_pages_store_id" ON "pages" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_pages_store_slug" ON "pages" USING btree ("store_id","slug");--> statement-breakpoint
CREATE INDEX "idx_navigation_store_id" ON "navigation" USING btree ("store_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_navigation_store_handle" ON "navigation" USING btree ("store_id","handle");