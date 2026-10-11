"use client";

import { useEffect, useState } from "react";
import { Board, type BoardLead } from "@/components/board";
import { loadPipeline } from "@/lib/data";
import type { Source, Stage } from "@/lib/types";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; stages: Stage[]; sources: Source[]; leads: BoardLead[] };

export default function PipelinePage() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    loadPipeline().then((r) =>
      setState(r.ok ? { status: "ready", ...r.data } : { status: "error", message: r.error }),
    );
  }, []);

  if (state.status === "loading") return <p className="empty">Carregando…</p>;
  if (state.status === "error") {
    return (
      <p className="err">
        Não foi possível carregar o pipeline ({state.message}). Confira se as migrations do banco foram
        executadas.
      </p>
    );
  }
  return <Board stages={state.stages} sources={state.sources} initialLeads={state.leads} />;
}
