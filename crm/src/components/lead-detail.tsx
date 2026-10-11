"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteLead, updateLead } from "@/features/leads/actions";
import { addNote } from "@/features/notes/actions";
import { addTask, deleteTask, setTaskDone } from "@/features/tasks/actions";
import type { Lead, Note, Source, Stage, Task } from "@/lib/types";

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

function remindLabel(iso: string) {
  const d = new Date(iso);
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diff = Math.round((day - startOfToday()) / 864e5);
  if (diff < 0) return diff === -1 ? "ontem" : `há ${-diff} dias`;
  if (diff === 0) return "hoje";
  if (diff === 1) return "amanhã";
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function LeadDetail({
  lead: initialLead,
  stages,
  sources,
  initialNotes,
  initialTasks,
}: {
  lead: Lead;
  stages: Stage[];
  sources: Source[];
  initialNotes: Note[];
  initialTasks: Task[];
}) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [notes, setNotes] = useState(initialNotes);
  const [tasks, setTasks] = useState(initialTasks);
  const [noteText, setNoteText] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState(tomorrow());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function saveField(patch: Parameters<typeof updateLead>[1]) {
    setError(null);
    const res = await updateLead(lead.id, patch);
    if (!res.ok) setError(res.error);
    else setLead(res.data);
  }

  async function onAddNote() {
    setBusy(true);
    setError(null);
    const res = await addNote(lead.id, noteText);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setNotes((n) => [res.data, ...n]);
    setNoteText("");
  }

  async function onAddTask() {
    if (!taskDate) return setError("Escolha a data do lembrete.");
    setBusy(true);
    setError(null);
    // 09:00 no fuso do navegador, para o lembrete cair no dia escolhido.
    const remindAt = new Date(`${taskDate}T09:00:00`).toISOString();
    const res = await addTask(lead.id, taskTitle, remindAt);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setTasks((t) => [...t, res.data].sort((a, b) => a.remind_at.localeCompare(b.remind_at)));
    setTaskTitle("");
  }

  async function onToggle(t: Task) {
    setError(null);
    const res = await setTaskDone(t.id, !t.completed_at);
    if (!res.ok) return setError(res.error);
    setTasks((ts) => ts.map((x) => (x.id === t.id ? res.data : x)));
  }

  async function onDeleteTask(id: string) {
    setError(null);
    const res = await deleteTask(id);
    if (!res.ok) return setError(res.error);
    setTasks((ts) => ts.filter((x) => x.id !== id));
  }

  async function onDeleteLead() {
    setBusy(true);
    const res = await deleteLead(lead.id);
    if (!res.ok) {
      setBusy(false);
      return setError(res.error);
    }
    router.replace("/pipeline");
    router.refresh();
  }

  const sortedTasks = [...tasks].sort(
    (a, b) => Number(!!a.completed_at) - Number(!!b.completed_at) || a.remind_at.localeCompare(b.remind_at),
  );

  return (
    <>
      <div className="top">
        <Link href="/pipeline" className="btn ghost">← Pipeline</Link>
        <h1>{lead.name}</h1>
      </div>

      {error && <p className="err" role="alert">{error}</p>}

      <div className="box">
        <div className="fg">
          <Field label="Nome" id="f-name" value={lead.name}
            onSave={(v) => saveField({ name: v })} />
          <Field label="Empresa" id="f-company" value={lead.company ?? ""}
            onSave={(v) => saveField({ company: v })} />
          <Field label="E-mail" id="f-email" type="email" value={lead.email ?? ""}
            onSave={(v) => saveField({ email: v })} />
          <Field label="Telefone" id="f-phone" value={lead.phone ?? ""}
            onSave={(v) => saveField({ phone: v })} />
          <div>
            <label className="lbl" htmlFor="f-source">Origem</label>
            <select id="f-source" value={lead.source_id ?? ""}
              onChange={(e) => saveField({ source_id: e.target.value || null })}>
              <option value="">Sem origem</option>
              {sources.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="lbl" htmlFor="f-stage">Estágio</label>
            <select id="f-stage" value={lead.stage_id}
              onChange={(e) => saveField({ stage_id: e.target.value })}>
              {stages.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="detail">
        <section className="box">
          <h2>Interações</h2>
          <label className="lbl" htmlFor="note">Registrar interação</label>
          <textarea id="note" value={noteText} placeholder="O que aconteceu neste contato?"
            onChange={(e) => setNoteText(e.target.value)} />
          <div className="row">
            <button className="btn pri" disabled={busy || !noteText.trim()} onClick={onAddNote}>
              Salvar interação
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            {notes.length === 0 && <div className="empty">Nenhuma interação registrada.</div>}
            {notes.map((n) => (
              <div key={n.id} className="note">
                {n.content}
                <time dateTime={n.created_at}>{fmtDateTime(n.created_at)}</time>
              </div>
            ))}
          </div>
        </section>

        <section className="box">
          <h2>Follow-ups</h2>
          <div className="fg">
            <div>
              <label className="lbl" htmlFor="task-title">Próximo passo</label>
              <input id="task-title" value={taskTitle} placeholder="Ex.: ligar para fechar"
                onChange={(e) => setTaskTitle(e.target.value)} />
            </div>
            <div>
              <label className="lbl" htmlFor="task-date">Lembrar em</label>
              <input id="task-date" type="date" value={taskDate}
                onChange={(e) => setTaskDate(e.target.value)} />
            </div>
          </div>
          <div className="row">
            <button className="btn pri" disabled={busy || !taskTitle.trim()} onClick={onAddTask}>
              Agendar follow-up
            </button>
          </div>
          <div style={{ marginTop: 16 }}>
            {sortedTasks.length === 0 && <div className="empty">Nenhum follow-up agendado.</div>}
            {sortedTasks.map((t) => {
              const late = !t.completed_at && new Date(t.remind_at).getTime() < startOfToday();
              return (
                <div key={t.id} className={`trow${t.completed_at ? " done" : ""}`}>
                  <input type="checkbox" checked={!!t.completed_at}
                    aria-label={`Concluir ${t.title}`} onChange={() => onToggle(t)} />
                  <div className="tt">{t.title}</div>
                  <span className={`tag${late ? " late" : ""}`}>{remindLabel(t.remind_at)}</span>
                  <button className="btn ghost" aria-label="Excluir follow-up"
                    onClick={() => onDeleteTask(t.id)}>×</button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="row">
        {confirmDelete ? (
          <>
            <span className="err" style={{ margin: 0 }}>
              Excluir apaga também as interações e os follow-ups deste lead.
            </span>
            <button className="btn danger" disabled={busy} onClick={onDeleteLead}>Confirmar exclusão</button>
            <button className="btn ghost" onClick={() => setConfirmDelete(false)}>Cancelar</button>
          </>
        ) : (
          <button className="btn ghost danger" onClick={() => setConfirmDelete(true)}>Excluir lead</button>
        )}
      </div>
    </>
  );
}

// Campo de texto que grava ao sair do campo, e só se o valor mudou.
function Field({
  label,
  id,
  value,
  type = "text",
  onSave,
}: {
  label: string;
  id: string;
  value: string;
  type?: string;
  onSave: (v: string) => void;
}) {
  const [v, setV] = useState(value);
  return (
    <div>
      <label className="lbl" htmlFor={id}>{label}</label>
      <input id={id} type={type} value={v} onChange={(e) => setV(e.target.value)}
        onBlur={() => v.trim() !== value.trim() && onSave(v)} />
    </div>
  );
}
