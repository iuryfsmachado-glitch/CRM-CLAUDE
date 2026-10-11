"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Em exportação estática não há servidor para proteger a rota: o portão é
// no navegador. Os dados em si continuam protegidos pelo RLS do Supabase.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.replace("/login");
      else setEmail(data.session.user.email ?? "");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) router.replace("/login");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function signOut() {
    await createClient().auth.signOut();
    router.replace("/login");
  }

  if (email === null) return <div className="wrap"><p className="empty">Carregando…</p></div>;

  return (
    <div className="wrap">
      <header className="top">
        <Link href="/pipeline" className="brand">Funil</Link>
        <span className="sp" />
        <span className="who">{email}</span>
        <button className="btn ghost" onClick={signOut}>Sair</button>
      </header>
      {children}
    </div>
  );
}
