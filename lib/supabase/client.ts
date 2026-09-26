import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPublicEnv } from "@/lib/env";

let browserClient: SupabaseClient | null = null;

/** Cliente Supabase para Client Components (sessão via cookies, protegido por RLS). */
export function createClient(): SupabaseClient {
  if (!browserClient) {
    const { supabaseUrl, supabaseKey } = getPublicEnv();
    browserClient = createBrowserClient(supabaseUrl, supabaseKey);
  }
  return browserClient;
}
