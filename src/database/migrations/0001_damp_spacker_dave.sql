CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"full_name" varchar(255),
	"avatar_url" text,
	"phone" varchar(32),
	"is_platform_admin" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"billing_email" varchar(255) NOT NULL,
	"phone" varchar(32),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "store_settings" (
	"store_id" uuid PRIMARY KEY NOT NULL,
	"whatsapp_order_phone" varchar(32),
	"whatsapp_order_enabled" boolean DEFAULT false NOT NULL,
	"whatsapp_support_phone" varchar(32),
	"whatsapp_support_enabled" boolean DEFAULT false NOT NULL,
	"cod_enabled" boolean DEFAULT true NOT NULL,
	"cod_min_amount" bigint DEFAULT 0,
	"cod_max_amount" bigint DEFAULT 5000000,
	"tax_inclusive" boolean DEFAULT true NOT NULL,
	"order_id_prefix" varchar(10) DEFAULT 'ORD-' NOT NULL,
	"invoice_prefix" varchar(10) DEFAULT 'INV-' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stores" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"subdomain" varchar(100) NOT NULL,
	"custom_domain" varchar(255),
	"currency" varchar(3) DEFAULT 'INR' NOT NULL,
	"timezone" varchar(50) DEFAULT 'Asia/Kolkata' NOT NULL,
	"logo_url" text,
	"favicon_url" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "stores_slug_unique" UNIQUE("slug"),
	CONSTRAINT "stores_subdomain_unique" UNIQUE("subdomain"),
	CONSTRAINT "stores_custom_domain_unique" UNIQUE("custom_domain")
);
--> statement-breakpoint
CREATE TABLE "store_domains" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"store_id" uuid NOT NULL,
	"domain" varchar(255) NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"ssl_status" varchar(50) DEFAULT 'PENDING' NOT NULL,
	"verification_token" varchar(255) NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "store_domains_domain_unique" UNIQUE("domain")
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"module" varchar(50) NOT NULL,
	"action" varchar(50) NOT NULL,
	"code" varchar(100) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "permissions_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(50) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "roles_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"store_id" uuid,
	"user_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "uq_staff_org_user_store" UNIQUE("organization_id","user_id","store_id")
);
--> statement-breakpoint
ALTER TABLE "store_settings" ADD CONSTRAINT "store_settings_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stores" ADD CONSTRAINT "stores_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "store_domains" ADD CONSTRAINT "store_domains_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_store_id_stores_id_fk" FOREIGN KEY ("store_id") REFERENCES "public"."stores"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "idx_organizations_slug" ON "organizations" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "idx_stores_organization_id" ON "stores" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_stores_subdomain" ON "stores" USING btree ("subdomain");--> statement-breakpoint
CREATE INDEX "idx_stores_custom_domain" ON "stores" USING btree ("custom_domain");--> statement-breakpoint
CREATE INDEX "idx_store_domains_store_id" ON "store_domains" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_store_domains_domain" ON "store_domains" USING btree ("domain");--> statement-breakpoint
CREATE INDEX "idx_permissions_code" ON "permissions" USING btree ("code");--> statement-breakpoint
CREATE INDEX "idx_permissions_module" ON "permissions" USING btree ("module");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_role_id" ON "role_permissions" USING btree ("role_id");--> statement-breakpoint
CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions" USING btree ("permission_id");--> statement-breakpoint
CREATE INDEX "idx_staff_organization_id" ON "staff" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_staff_user_id" ON "staff" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_staff_store_id" ON "staff" USING btree ("store_id");--> statement-breakpoint
CREATE INDEX "idx_staff_role_id" ON "staff" USING btree ("role_id");--> statement-breakpoint
CREATE OR REPLACE FUNCTION current_store_id() RETURNS UUID AS $$
  SELECT NULLIF(current_setting('app.current_store_id', true), '')::uuid;
$$ LANGUAGE sql STABLE;--> statement-breakpoint
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = NOW();
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;--> statement-breakpoint
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;--> statement-breakpoint
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "users_select_own" ON "users" FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id OR is_platform_admin = true);--> statement-breakpoint
CREATE POLICY "users_update_own" ON "users" FOR UPDATE TO authenticated USING ((SELECT auth.uid()) = id) WITH CHECK ((SELECT auth.uid()) = id);--> statement-breakpoint
CREATE POLICY "users_insert_own" ON "users" FOR INSERT TO authenticated WITH CHECK ((SELECT auth.uid()) = id);--> statement-breakpoint
ALTER TABLE "organizations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "organizations_select_member" ON "organizations" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.organization_id = organizations.id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true) OR EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.is_platform_admin = true));--> statement-breakpoint
CREATE POLICY "organizations_insert_authenticated" ON "organizations" FOR INSERT TO authenticated WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "organizations_update_owner_admin" ON "organizations" FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM staff JOIN roles ON staff.role_id = roles.id WHERE staff.organization_id = organizations.id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND roles.name IN ('OWNER', 'ADMIN'))) WITH CHECK (EXISTS (SELECT 1 FROM staff JOIN roles ON staff.role_id = roles.id WHERE staff.organization_id = organizations.id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND roles.name IN ('OWNER', 'ADMIN')));--> statement-breakpoint
ALTER TABLE "stores" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "stores_select_member" ON "stores" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff WHERE staff.organization_id = stores.organization_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND (staff.store_id IS NULL OR staff.store_id = stores.id)) OR EXISTS (SELECT 1 FROM users WHERE users.id = (SELECT auth.uid()) AND users.is_platform_admin = true));--> statement-breakpoint
CREATE POLICY "stores_select_public_active" ON "stores" FOR SELECT TO anon USING (is_active = true);--> statement-breakpoint
CREATE POLICY "stores_insert_owner_admin" ON "stores" FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM staff JOIN roles ON staff.role_id = roles.id WHERE staff.organization_id = stores.organization_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND roles.name IN ('OWNER', 'ADMIN')));--> statement-breakpoint
CREATE POLICY "stores_update_staff" ON "stores" FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM staff JOIN roles ON staff.role_id = roles.id WHERE staff.organization_id = stores.organization_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND (staff.store_id IS NULL OR staff.store_id = stores.id) AND roles.name IN ('OWNER', 'ADMIN', 'MANAGER'))) WITH CHECK (EXISTS (SELECT 1 FROM staff JOIN roles ON staff.role_id = roles.id WHERE staff.organization_id = stores.organization_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND (staff.store_id IS NULL OR staff.store_id = stores.id) AND roles.name IN ('OWNER', 'ADMIN', 'MANAGER')));--> statement-breakpoint
CREATE POLICY "stores_delete_owner" ON "stores" FOR DELETE TO authenticated USING (EXISTS (SELECT 1 FROM staff JOIN roles ON staff.role_id = roles.id WHERE staff.organization_id = stores.organization_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND roles.name = 'OWNER'));--> statement-breakpoint
ALTER TABLE "store_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "store_settings_select_member" ON "store_settings" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM stores JOIN staff ON staff.organization_id = stores.organization_id WHERE stores.id = store_settings.store_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND (staff.store_id IS NULL OR staff.store_id = stores.id)));--> statement-breakpoint
CREATE POLICY "store_settings_select_public" ON "store_settings" FOR SELECT TO anon USING (true);--> statement-breakpoint
CREATE POLICY "store_settings_insert_staff" ON "store_settings" FOR INSERT TO authenticated WITH CHECK (EXISTS (SELECT 1 FROM stores JOIN staff ON staff.organization_id = stores.organization_id JOIN roles ON staff.role_id = roles.id WHERE stores.id = store_settings.store_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND (staff.store_id IS NULL OR staff.store_id = stores.id) AND roles.name IN ('OWNER', 'ADMIN')));--> statement-breakpoint
CREATE POLICY "store_settings_update_staff" ON "store_settings" FOR UPDATE TO authenticated USING (EXISTS (SELECT 1 FROM stores JOIN staff ON staff.organization_id = stores.organization_id JOIN roles ON staff.role_id = roles.id WHERE stores.id = store_settings.store_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND (staff.store_id IS NULL OR staff.store_id = stores.id) AND roles.name IN ('OWNER', 'ADMIN', 'MANAGER'))) WITH CHECK (EXISTS (SELECT 1 FROM stores JOIN staff ON staff.organization_id = stores.organization_id JOIN roles ON staff.role_id = roles.id WHERE stores.id = store_settings.store_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND (staff.store_id IS NULL OR staff.store_id = stores.id) AND roles.name IN ('OWNER', 'ADMIN', 'MANAGER')));--> statement-breakpoint
ALTER TABLE "store_domains" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "store_domains_select_member" ON "store_domains" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM stores JOIN staff ON staff.organization_id = stores.organization_id WHERE stores.id = store_domains.store_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND (staff.store_id IS NULL OR staff.store_id = stores.id)));--> statement-breakpoint
CREATE POLICY "store_domains_select_public" ON "store_domains" FOR SELECT TO anon USING (true);--> statement-breakpoint
CREATE POLICY "store_domains_manage_staff" ON "store_domains" FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM stores JOIN staff ON staff.organization_id = stores.organization_id JOIN roles ON staff.role_id = roles.id WHERE stores.id = store_domains.store_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND roles.name IN ('OWNER', 'ADMIN'))) WITH CHECK (EXISTS (SELECT 1 FROM stores JOIN staff ON staff.organization_id = stores.organization_id JOIN roles ON staff.role_id = roles.id WHERE stores.id = store_domains.store_id AND staff.user_id = (SELECT auth.uid()) AND staff.is_active = true AND roles.name IN ('OWNER', 'ADMIN')));--> statement-breakpoint
ALTER TABLE "staff" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "staff_select_member" ON "staff" FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM staff s2 WHERE s2.organization_id = staff.organization_id AND s2.user_id = (SELECT auth.uid()) AND s2.is_active = true));--> statement-breakpoint
CREATE POLICY "staff_manage_owner_admin" ON "staff" FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM staff s2 JOIN roles ON s2.role_id = roles.id WHERE s2.organization_id = staff.organization_id AND s2.user_id = (SELECT auth.uid()) AND s2.is_active = true AND roles.name IN ('OWNER', 'ADMIN'))) WITH CHECK (EXISTS (SELECT 1 FROM staff s2 JOIN roles ON s2.role_id = roles.id WHERE s2.organization_id = staff.organization_id AND s2.user_id = (SELECT auth.uid()) AND s2.is_active = true AND roles.name IN ('OWNER', 'ADMIN')));--> statement-breakpoint
ALTER TABLE "roles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "role_permissions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "roles_select_authenticated" ON "roles" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "permissions_select_authenticated" ON "permissions" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "role_permissions_select_authenticated" ON "role_permissions" FOR SELECT TO authenticated USING (true);