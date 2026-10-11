import { createClient as create, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

// Cliente único no navegador. A sessão fica no localStorage; quem protege os
// dados é o RLS do banco, que enxerga o JWT do usuário logado.
export function createClient(): SupabaseClient {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("Variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ausentes no build.");
  }

  client = create(url, key, {
    auth: { flowType: "pkce", persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}
