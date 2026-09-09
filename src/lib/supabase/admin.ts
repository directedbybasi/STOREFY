import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Privileged Admin Supabase Client.
 * Uses SUPABASE_SERVICE_ROLE_KEY to bypass RLS for administrative background tasks.
 * STRICTLY SERVER-ONLY — Will trigger a build error if imported into client components.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "[STOREFY SUPABASE ADMIN ERROR] NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be defined."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
