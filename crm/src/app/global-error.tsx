"use client";

// Último recurso: erros que derrubam o layout raiz.
export default function GlobalError({ error }: { error: Error }) {
  return (
    <html lang="pt-BR">
      <body style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
        <h1>Algo deu errado</h1>
        <p style={{ color: "#b3261e" }}>{error.message || "Erro desconhecido."}</p>
        <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, overflowWrap: "anywhere" }}>
          {(error.stack ?? "").split("\n").slice(0, 6).join("\n")}
        </pre>
      </body>
    </html>
  );
}
