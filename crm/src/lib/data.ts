import { createClient } from "@/lib/supabase/client";
import type { BoardLead } from "@/components/board";
import type { Lead, Note, Source, Stage, Task } from "@/lib/types";

type Loaded<T> = { ok: true; data: T } | { ok: false; error: string };

export async function loadPipeline(): Promise<
  Loaded<{ stages: Stage[]; sources: Source[]; leads: BoardLead[] }>
> {
  const supabase = createClient();
  const [stages, leads, sources, tasks] = await Promise.all([
    supabase.from("pipeline_stages").select("*").order("position"),
    supabase.from("leads").select("*").order("position"),
    supabase.from("lead_sources").select("id,name").order("name"),
    supabase.from("tasks").select("lead_id,remind_at").is("completed_at", null),
  ]);

  const failed = [stages, leads, sources, tasks].find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  // Follow-ups pendentes por lead (e quantos já venceram) para o selo do card.
  const now = Date.now();
  const pending = new Map<string, { pending: number; due: number }>();
  for (const t of tasks.data ?? []) {
    const p = pending.get(t.lead_id) ?? { pending: 0, due: 0 };
    p.pending += 1;
    if (new Date(t.remind_at).getTime() <= now) p.due += 1;
    pending.set(t.lead_id, p);
  }

  return {
    ok: true,
    data: {
      stages: (stages.data ?? []) as Stage[],
      sources: (sources.data ?? []) as Source[],
      leads: ((leads.data ?? []) as Lead[]).map((l) => ({
        ...l,
        pending: pending.get(l.id)?.pending ?? 0,
        due: pending.get(l.id)?.due ?? 0,
      })),
    },
  };
}

export async function loadLead(id: string): Promise<
  Loaded<{ lead: Lead; stages: Stage[]; sources: Source[]; notes: Note[]; tasks: Task[] } | null>
> {
  const supabase = createClient();
  const { data: lead, error } = await supabase.from("leads").select("*").eq("id", id).maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!lead) return { ok: true, data: null }; // inexistente ou de outro usuário

  const [stages, sources, notes, tasks] = await Promise.all([
    supabase.from("pipeline_stages").select("*").order("position"),
    supabase.from("lead_sources").select("id,name").order("name"),
    supabase.from("lead_notes").select("*").eq("lead_id", id).order("created_at", { ascending: false }),
    supabase.from("tasks").select("*").eq("lead_id", id).order("remind_at"),
  ]);
  const failed = [stages, sources, notes, tasks].find((r) => r.error);
  if (failed?.error) return { ok: false, error: failed.error.message };

  return {
    ok: true,
    data: {
      lead: lead as Lead,
      stages: (stages.data ?? []) as Stage[],
      sources: (sources.data ?? []) as Source[],
      notes: (notes.data ?? []) as Note[],
      tasks: (tasks.data ?? []) as Task[],
    },
  };
}
