"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LeadDetail } from "@/components/lead-detail";
import { loadLead } from "@/lib/data";
import type { Lead, Note, Source, Stage, Task } from "@/lib/types";

type Data = { lead: Lead; stages: Stage[]; sources: Source[]; notes: Note[]; tasks: Task[] };
type State =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "error"; message: string }
  | { status: "ready"; data: Data };

// Exportação estática não tem rota dinâmica /leads/[id]: o id vai na query (?id=).
function LeadView() {
  const id = useSearchParams().get("id");
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    if (!id) return setState({ status: "missing" });
    loadLead(id).then((r) => {
      if (!r.ok) setState({ status: "error", message: r.error });
      else if (!r.data) setState({ status: "missing" });
      else setState({ status: "ready", data: r.data });
    });
  }, [id]);

  if (state.status === "loading") return <p className="empty">Carregando…</p>;
  if (state.status === "error") return <p className="err">Não foi possível carregar o lead ({state.message}).</p>;
  if (state.status === "missing") {
    return (
      <>
        <p className="empty">Lead não encontrado.</p>
        <Link href="/pipeline" className="btn">← Pipeline</Link>
      </>
    );
  }

  const d = state.data;
  return (
    <LeadDetail
      key={d.lead.id}
      lead={d.lead}
      stages={d.stages}
      sources={d.sources}
      initialNotes={d.notes}
      initialTasks={d.tasks}
    />
  );
}

export default function LeadPage() {
  return (
    <Suspense fallback={<p className="empty">Carregando…</p>}>
      <LeadView />
    </Suspense>
  );
}
