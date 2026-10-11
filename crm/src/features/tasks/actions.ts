
import { authedClient, NOT_SIGNED_IN } from "@/lib/auth";
import type { ActionResult, Task } from "@/lib/types";

export async function addTask(
  leadId: string,
  title: string,
  remindAt: string,
): Promise<ActionResult<Task>> {
  const supabase = await authedClient();
  if (!supabase) return { ok: false, error: NOT_SIGNED_IN };

  const t = title.trim();
  if (!t) return { ok: false, error: "Descreva o follow-up." };
  if (Number.isNaN(Date.parse(remindAt))) return { ok: false, error: "Data de lembrete inválida." };

  const { data, error } = await supabase
    .from("tasks")
    .insert({ lead_id: leadId, title: t, remind_at: remindAt })
    .select()
    .single();

  if (error) return { ok: false, error: "Não foi possível agendar o follow-up." };
  return { ok: true, data: data as Task };
}

export async function setTaskDone(id: string, done: boolean): Promise<ActionResult<Task>> {
  const supabase = await authedClient();
  if (!supabase) return { ok: false, error: NOT_SIGNED_IN };

  const { data, error } = await supabase
    .from("tasks")
    .update({ completed_at: done ? new Date().toISOString() : null })
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Não foi possível atualizar o follow-up." };
  return { ok: true, data: data as Task };
}

export async function deleteTask(id: string): Promise<ActionResult> {
  const supabase = await authedClient();
  if (!supabase) return { ok: false, error: NOT_SIGNED_IN };

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir o follow-up." };
  return { ok: true, data: undefined };
}
