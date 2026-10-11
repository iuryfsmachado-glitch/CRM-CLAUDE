-- CRM simples: leads, estágios de pipeline customizáveis, notas e tarefas.
-- Cada linha pertence a um usuário (user_id) e é isolada por RLS.
--
-- Como executar: Supabase Dashboard > SQL Editor > New query > colar e Run.
-- Rode UMA vez em um projeto limpo (os CREATE não são idempotentes).
-- Alternativa: salvar em supabase/migrations/ e rodar `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------
-- pipeline_stages: colunas do kanban (customizáveis)
-- ---------------------------------------------------------------
create table public.pipeline_stages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  color       text not null default '#64748b',          -- hex, usado no header da coluna
  position    double precision not null,                 -- ordem das colunas
  kind        text not null default 'open'
              check (kind in ('open', 'won', 'lost')),   -- permite métricas de conversão
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index pipeline_stages_user_position_idx
  on public.pipeline_stages (user_id, position);

create trigger pipeline_stages_updated_at
  before update on public.pipeline_stages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- lead_sources: origens (começam com padrões, mas são editáveis)
-- ---------------------------------------------------------------
create table public.lead_sources (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- ---------------------------------------------------------------
-- leads
-- ---------------------------------------------------------------
create table public.leads (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  stage_id    uuid not null references public.pipeline_stages(id) on delete restrict,
  source_id   uuid references public.lead_sources(id) on delete set null,
  name        text not null check (char_length(name) between 1 and 120),
  company     text,
  email       text,
  phone       text,
  position    double precision not null default 0,       -- ordem do card dentro da coluna
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index leads_user_stage_position_idx on public.leads (user_id, stage_id, position);
create index leads_user_created_idx        on public.leads (user_id, created_at desc);

create trigger leads_updated_at
  before update on public.leads
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- lead_notes: histórico de notas (append-only na prática)
-- ---------------------------------------------------------------
create table public.lead_notes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id     uuid not null references public.leads(id) on delete cascade,
  content     text not null check (char_length(content) > 0),
  created_at  timestamptz not null default now()
);

create index lead_notes_lead_created_idx on public.lead_notes (lead_id, created_at desc);

-- ---------------------------------------------------------------
-- tasks: follow-ups com data de lembrete
-- ---------------------------------------------------------------
create table public.tasks (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lead_id       uuid not null references public.leads(id) on delete cascade,
  title         text not null check (char_length(title) > 0),
  remind_at     timestamptz not null,                    -- quando lembrar
  completed_at  timestamptz,                             -- null = pendente
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index tasks_user_pending_remind_idx
  on public.tasks (user_id, remind_at) where completed_at is null;
create index tasks_lead_idx on public.tasks (lead_id);

create trigger tasks_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- Integridade: lead/stage/nota/tarefa sempre do mesmo dono
-- ---------------------------------------------------------------
create or replace function public.assert_same_owner()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_owner uuid;
begin
  if tg_table_name = 'leads' then
    select user_id into parent_owner from public.pipeline_stages where id = new.stage_id;
  else
    select user_id into parent_owner from public.leads where id = new.lead_id;
  end if;

  if parent_owner is distinct from new.user_id then
    raise exception 'owner mismatch on %', tg_table_name;
  end if;

  if tg_table_name = 'leads' and new.source_id is not null then
    select user_id into parent_owner from public.lead_sources where id = new.source_id;
    if parent_owner is distinct from new.user_id then
      raise exception 'owner mismatch on leads.source_id';
    end if;
  end if;
  return new;
end;
$$;

create trigger leads_same_owner
  before insert or update of stage_id, source_id, user_id on public.leads
  for each row execute function public.assert_same_owner();

create trigger lead_notes_same_owner
  before insert or update of lead_id, user_id on public.lead_notes
  for each row execute function public.assert_same_owner();

create trigger tasks_same_owner
  before insert or update of lead_id, user_id on public.tasks
  for each row execute function public.assert_same_owner();

-- ---------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------
alter table public.pipeline_stages enable row level security;
alter table public.lead_sources    enable row level security;
alter table public.leads           enable row level security;
alter table public.lead_notes      enable row level security;
alter table public.tasks           enable row level security;

create policy "own stages" on public.pipeline_stages
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own sources" on public.lead_sources
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own leads" on public.leads
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own notes" on public.lead_notes
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "own tasks" on public.tasks
  for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------------------------------------------------------------
-- Seed: estágios e origens padrão
-- ---------------------------------------------------------------
create or replace function public.seed_user_defaults(uid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if exists (select 1 from public.pipeline_stages where user_id = uid) then
    return;
  end if;

  insert into public.pipeline_stages (user_id, name, color, position, kind) values
    (uid, 'Novo',        '#64748b', 1000, 'open'),
    (uid, 'Contato',     '#3b82f6', 2000, 'open'),
    (uid, 'Proposta',    '#f59e0b', 3000, 'open'),
    (uid, 'Negociação',  '#8b5cf6', 4000, 'open'),
    (uid, 'Ganho',       '#22c55e', 5000, 'won'),
    (uid, 'Perdido',     '#ef4444', 6000, 'lost');

  insert into public.lead_sources (user_id, name) values
    (uid, 'Indicação'),
    (uid, 'Site'),
    (uid, 'Instagram'),
    (uid, 'LinkedIn'),
    (uid, 'Evento'),
    (uid, 'Outro')
  on conflict (user_id, name) do nothing;
end;
$$;

-- Função interna: não deve ser chamável pela API (PostgREST).
revoke execute on function public.seed_user_defaults(uuid) from public, anon, authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_user_defaults(new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created_seed_crm
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuários que já existiam antes desta migration também recebem os padrões.
select public.seed_user_defaults(id) from auth.users;
