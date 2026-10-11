
import { authedClient, NOT_SIGNED_IN } from "@/lib/auth";
import type { ActionResult, Note } from "@/lib/types";

export async function addNote(leadId: string, content: string): Promise<ActionResult<Note>> {
  const supabase = await authedClient();
  if (!supabase) return { ok: false, error: NOT_SIGNED_IN };

  const text = content.trim();
  if (!text) return { ok: false, error: "Escreva a nota antes de salvar." };

  const { data, error } = await supabase
    .from("lead_notes")
    .insert({ lead_id: leadId, content: text })
    .select()
    .single();

  if (error) return { ok: false, error: "Não foi possível salvar a nota." };
  return { ok: true, data: data as Note };
}
