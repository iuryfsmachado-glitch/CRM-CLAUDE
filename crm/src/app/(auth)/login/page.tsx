"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Quem já tem sessão (ou acabou de voltar do link do e-mail) vai direto ao pipeline.
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace("/pipeline");
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) router.replace("/pipeline");
    });
    return () => sub.subscription.unsubscribe();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const supabase = createClient();

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("E-mail ou senha incorretos.");
      else {
        router.replace("/pipeline");
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/login/`,
        },
      });
      if (error) setError(error.message);
      else if (data.session) {
        router.replace("/pipeline");
      } else {
        setInfo("Enviamos um link de confirmação para o seu e-mail.");
      }
    }
    setLoading(false);
  }

  return (
    <main className="auth">
      <h1>{mode === "signin" ? "Entrar" : "Criar conta"}</h1>

      <form onSubmit={onSubmit}>
        <div>
          <label className="lbl" htmlFor="email">E-mail</label>
          <input id="email" type="email" required autoComplete="email" value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="lbl" htmlFor="password">Senha</label>
          <input id="password" type="password" required minLength={8}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>

        {error && <p className="err">{error}</p>}
        {info && <p className="ok">{info}</p>}

        <button className="btn pri" disabled={loading}>
          {loading ? "Aguarde…" : mode === "signin" ? "Entrar" : "Criar conta"}
        </button>
      </form>

      <button type="button" className="btn ghost"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "Ainda não tenho conta" : "Já tenho conta"}
      </button>
    </main>
  );
}
