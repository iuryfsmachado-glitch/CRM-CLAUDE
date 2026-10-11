import { createClient } from "@/lib/supabase/client";

// Cliente do Supabase com sessão válida, ou null se não houver login.
// O RLS continua sendo a barreira real: user_id vem do JWT, nunca do app.
export async function authedClient() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session ? supabase : null;
}

export const NOT_SIGNED_IN = "Sua sessão expirou. Entre novamente.";
