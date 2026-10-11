"use client";

import Link from "next/link";
import { useState } from "react";
import { createLead, moveLead } from "@/features/leads/actions";
import type { Lead, Source, Stage } from "@/lib/types";

export type BoardLead = Lead & { pending: number; due: number };

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

export function Board({
  stages,
  sources,
  initialLeads,
}: {
  stages: Stage[];
  sources: Source[];
  initialLeads: BoardLead[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [q, setQ] = useState("");
  const [dragId, setDragId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newStage, setNewStage] = useState<string | null>(null);

  const sourceName = (id: string | null) => sources.find((s) => s.id === id)?.name;
  const query = q.trim().toLowerCase();
  const visible = (l: BoardLead) =>
    !query ||
    [l.name, l.company, l.email, l.phone].some((v) => (v ?? "").toLowerCase().includes(query));
  const dueTotal = leads.reduce((n, l) => n + l.due, 0);

  async function onDrop(e: React.DragEvent<HTMLElement>, stageId: string) {
    e.preventDefault();
    setOverStage(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;

    const cards = [...e.currentTarget.querySelectorAll<HTMLElement>("[data-card]")].filter(
      (c) => c.dataset.id !== id,
    );
    const before = cards.find((c) => {
      const r = c.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });

    // Posição = ponto médio entre os vizinhos; grava só este lead.
    const list = leads.filter((l) => l.stage_id === stageId && l.id !== id).sort(byPosition);
    let position: number;
    if (before) {
      const i = list.findIndex((l) => l.id === before.dataset.id);
      const next = list[i].position;
      const prev = i > 0 ? list[i - 1].position : next - 2000;
      position = (prev + next) / 2;
    } else {
      position = (list.length ? list[list.length - 1].position : 0) + 1000;
    }

    const snapshot = leads;
    setError(null);
    setLeads((ls) => ls.map((l) => (l.id === id ? { ...l, stage_id: stageId, position } : l)));

    const res = await moveLead(id, stageId, position);
    if (!res.ok) {
      setLeads(snapshot);
      setError(res.error);
    }
  }

  return (
    <>
      <div className="top">
        <input className="search" type="search" placeholder="Buscar por nome ou empresa"
          aria-label="Buscar lead" value={q} onChange={(e) => setQ(e.target.value)} />
        <span className="sp" />
        <button className="btn pri" disabled={!stages.length}
          onClick={() => setNewStage(stages[0]?.id ?? null)}>
          + Novo lead
        </button>
      </div>

      <p className="stats">
        {leads.length} lead{leads.length === 1 ? "" : "s"} · {dueTotal} follow-up
        {dueTotal === 1 ? "" : "s"} para hoje ou atrasado{dueTotal === 1 ? "" : "s"}
      </p>

      {error && <p className="err" role="alert">{error}</p>}

      {newStage !== null && (
        <NewLeadForm
          stages={stages}
          sources={sources}
          defaultStage={newStage}
          onCancel={() => setNewStage(null)}
          onCreated={(lead) => {
            setLeads((ls) => [...ls, { ...lead, pending: 0, due: 0 }]);
            setNewStage(null);
          }}
        />
      )}

      {!stages.length ? (
        <p className="empty">
          Nenhum estágio encontrado. Confira se a migration inicial foi executada para o seu usuário.
        </p>
      ) : (
        <div className="board">
          {stages.map((s) => {
            const all = leads.filter((l) => l.stage_id === s.id).sort(byPosition);
            const shown = all.filter(visible);
            return (
              <section
                key={s.id}
                className={`col${overStage === s.id ? " over" : ""}`}
                style={{ ["--c" as string]: s.color }}
                onDragOver={(e) => {
                  if (!dragId) return;
                  e.preventDefault();
                  setOverStage(s.id);
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) setOverStage(null);
                }}
                onDrop={(e) => onDrop(e, s.id)}
              >
                <div className="ch">
                  <span>{s.name}</span>
                  <span className="cnt">{all.length}</span>
                  <button className="btn ghost add" aria-label={`Novo lead em ${s.name}`}
                    onClick={() => setNewStage(s.id)}>+</button>
                </div>

                {shown.map((l) => (
                  <div key={l.id} data-card data-id={l.id}
                    className={`card${dragId === l.id ? " drag" : ""}`}
                    draggable
                    onDragStart={(e) => {
                      setDragId(l.id);
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", l.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setOverStage(null);
                    }}
                  >
                    <Link href={`/lead?id=${l.id}`} draggable={false}>{l.name}</Link>
                    {l.company && <div className="sub">{l.company}</div>}
                    <div className="meta">
                      {sourceName(l.source_id) && <span className="tag">{sourceName(l.source_id)}</span>}
                      {l.due > 0 ? (
                        <span className="tag late">
                          {l.due} follow-up{l.due > 1 ? "s" : ""} pendente{l.due > 1 ? "s" : ""}
                        </span>
                      ) : l.pending > 0 ? (
                        <span className="tag">
                          {l.pending} agendado{l.pending > 1 ? "s" : ""}
                        </span>
                      ) : null}
                    </div>
                  </div>
                ))}

                {shown.length === 0 && (
                  <div className="empty">{all.length ? "Nenhum resultado." : "Arraste um lead para cá."}</div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </>
  );
}

function NewLeadForm({
  stages,
  sources,
  defaultStage,
  onCancel,
  onCreated,
}: {
  stages: Stage[];
  sources: Source[];
  defaultStage: string;
  onCancel: () => void;
  onCreated: (lead: Lead) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    const res = await createLead({
      name: String(f.get("name") ?? ""),
      company: String(f.get("company") ?? ""),
      email: String(f.get("email") ?? ""),
      phone: String(f.get("phone") ?? ""),
      sourceId: String(f.get("source") ?? "") || null,
      stageId: String(f.get("stage") ?? ""),
    });
    setSaving(false);
    if (!res.ok) setError(res.error);
    else onCreated(res.data);
  }

  return (
    <form className="box" onSubmit={onSubmit}>
      <h2>Novo lead</h2>
      <div className="fg">
        <div><label className="lbl" htmlFor="nl-name">Nome</label>
          <input id="nl-name" name="name" required autoFocus /></div>
        <div><label className="lbl" htmlFor="nl-company">Empresa</label>
          <input id="nl-company" name="company" /></div>
        <div><label className="lbl" htmlFor="nl-email">E-mail</label>
          <input id="nl-email" name="email" type="email" /></div>
        <div><label className="lbl" htmlFor="nl-phone">Telefone</label>
          <input id="nl-phone" name="phone" /></div>
        <div><label className="lbl" htmlFor="nl-source">Origem</label>
          <select id="nl-source" name="source" defaultValue="">
            <option value="">Sem origem</option>
            {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
        <div><label className="lbl" htmlFor="nl-stage">Estágio</label>
          <select id="nl-stage" name="stage" defaultValue={defaultStage}>
            {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select></div>
      </div>
      {error && <p className="err" style={{ marginTop: 12 }} role="alert">{error}</p>}
      <div className="row">
        <button className="btn pri" disabled={saving}>{saving ? "Salvando…" : "Salvar lead"}</button>
        <button type="button" className="btn ghost" onClick={onCancel}>Cancelar</button>
      </div>
    </form>
  );
}
