"use client";

// Mostra o erro real na tela (em vez da mensagem genérica do Next) para
// facilitar o diagnóstico. Não contém segredos: só a mensagem e o início da pilha.
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="auth">
      <h1>Algo deu errado</h1>
      <p className="err">{error.message || "Erro desconhecido."}</p>
      <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--ink-2)", overflowWrap: "anywhere" }}>
        {(error.stack ?? "").split("\n").slice(0, 6).join("\n")}
      </pre>
      <button className="btn pri" onClick={reset}>Tentar de novo</button>
    </main>
  );
}
