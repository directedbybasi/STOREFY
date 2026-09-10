CREATE TABLE "theme_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theme_id" uuid NOT NULL,
	"store_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"snapshot_ast" jsonb NOT NULL,
	"created_by" uuid,
	"commit_message" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "store_themes" ADD COLUMN "draft_settings" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "store_themes" ADD COLUMN "version" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "pages" ADD COLUMN "draft_content" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "theme_versions" ADD CONSTRAINT "theme_versions_theme_id_store_themes_id_fk" FOREIGN KEY ("theme_id") REFERENCES "public"."store_themes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theme_versions" ADD CONSTRAINT "theme_versions_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_theme_versions_theme_id" ON "theme_versions" USING btree ("theme_id");--> statement-breakpoint
CREATE INDEX "idx_theme_versions_store_id" ON "theme_versions" USING btree ("store_id");