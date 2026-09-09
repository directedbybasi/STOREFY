import { createBrowserClient } from "@supabase/ssr";

/**
 * Creates a public Supabase client for client-side React components.
 * Strictly uses public anon key.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
