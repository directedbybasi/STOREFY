CREATE TABLE "system_health" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"component" varchar(100) NOT NULL,
	"status" varchar(50) DEFAULT 'HEALTHY' NOT NULL,
	"environment" varchar(50) NOT NULL,
	"metadata" text,
	"is_operational" boolean DEFAULT true NOT NULL,
	"last_checked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
