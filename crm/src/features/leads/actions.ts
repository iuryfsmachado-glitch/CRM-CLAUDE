
import { authedClient, NOT_SIGNED_IN } from "@/lib/auth";
import type { ActionResult, Lead } from "@/lib/types";

const clean = (v: string | null | undefined) => {
  const t = (v ?? "").trim();
  return t === "" ? null : t;
};

export async function createLead(input: {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  sourceId?: string | null;
  stageId: string;
}): Promise<ActionResult<Lead>> {
  const supabase = await authedClient();
  if (!supabase) return { ok: false, error: NOT_SIGNED_IN };

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Informe o nome do lead." };
  if (!input.stageId) return { ok: false, error: "Escolha um estágio." };

  // O novo lead entra no fim da coluna.
  const { data: last } = await supabase
    .from("leads")
    .select("position")
    .eq("stage_id", input.stageId)
    .order("position", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data, error } = await supabase
    .from("leads")
    .insert({
      name,
      company: clean(input.company),
      email: clean(input.email),
      phone: clean(input.phone),
      source_id: input.sourceId || null,
      stage_id: input.stageId,
      position: (last?.position ?? 0) + 1000,
    })
    .select()
    .single();

  if (error) return { ok: false, error: "Não foi possível salvar o lead." };
  return { ok: true, data: data as Lead };
}

export async function moveLead(
  id: string,
  stageId: string,
  position: number,
): Promise<ActionResult> {
  const supabase = await authedClient();
  if (!supabase) return { ok: false, error: NOT_SIGNED_IN };
  if (!Number.isFinite(position)) return { ok: false, error: "Posição inválida." };

  const { data, error } = await supabase
    .from("leads")
    .update({ stage_id: stageId, position })
    .eq("id", id)
    .select("id");

  // RLS não gera erro quando a linha não é sua: só devolve zero linhas.
  if (error || !data?.length) return { ok: false, error: "Não foi possível mover o lead." };
  return { ok: true, data: undefined };
}

export async function updateLead(
  id: string,
  patch: {
    name?: string;
    company?: string | null;
    email?: string | null;
    phone?: string | null;
    source_id?: string | null;
    stage_id?: string;
  },
): Promise<ActionResult<Lead>> {
  const supabase = await authedClient();
  if (!supabase) return { ok: false, error: NOT_SIGNED_IN };

  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) {
    const n = patch.name.trim();
    if (!n) return { ok: false, error: "O nome não pode ficar vazio." };
    body.name = n;
  }
  if (patch.company !== undefined) body.company = clean(patch.company);
  if (patch.email !== undefined) body.email = clean(patch.email);
  if (patch.phone !== undefined) body.phone = clean(patch.phone);
  if (patch.source_id !== undefined) body.source_id = patch.source_id || null;
  if (patch.stage_id !== undefined) body.stage_id = patch.stage_id;

  const { data, error } = await supabase
    .from("leads")
    .update(body)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error || !data) return { ok: false, error: "Não foi possível atualizar o lead." };
  return { ok: true, data: data as Lead };
}

export async function deleteLead(id: string): Promise<ActionResult> {
  const supabase = await authedClient();
  if (!supabase) return { ok: false, error: NOT_SIGNED_IN };

  const { error } = await supabase.from("leads").delete().eq("id", id);
  if (error) return { ok: false, error: "Não foi possível excluir o lead." };
  return { ok: true, data: undefined };
}
