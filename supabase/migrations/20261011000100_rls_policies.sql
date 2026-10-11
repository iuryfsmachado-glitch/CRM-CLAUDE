-- Row Level Security do CRM.
-- Rode DEPOIS de 20261011000000_init_crm.sql.
-- Seguro para rodar de novo: remove as políticas anteriores e recria.
--
-- Regra única: uma linha só é visível/alterável por quem é o dono (user_id = auth.uid()).
-- Visitantes sem login (role anon) não têm nenhum acesso às tabelas.

-- ---------------------------------------------------------------
-- 1. Privilégios: anon sem acesso, authenticated só o CRUD necessário
-- ---------------------------------------------------------------
revoke all on public.pipeline_stages, public.lead_sources, public.leads,
              public.lead_notes, public.tasks
  from anon;

grant select, insert, update, delete
  on public.pipeline_stages, public.lead_sources, public.leads,
     public.lead_notes, public.tasks
  to authenticated;

-- ---------------------------------------------------------------
-- 2. RLS ligado + uma política por operação em cada tabela
--    (select auth.uid()) em subselect: o Postgres avalia uma vez por
--    consulta em vez de uma vez por linha.
-- ---------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['pipeline_stages', 'lead_sources', 'leads', 'lead_notes', 'tasks']
  loop
    execute format('alter table public.%I enable row level security', t);

    -- políticas genéricas da migration inicial
    execute format('drop policy if exists "own rows" on public.%I', t);
    execute format('drop policy if exists %I on public.%I', t || '_select_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_update_own', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete_own', t);

    execute format($f$
      create policy %I on public.%I
        for select to authenticated
        using (user_id = (select auth.uid()))
    $f$, t || '_select_own', t);

    execute format($f$
      create policy %I on public.%I
        for insert to authenticated
        with check (user_id = (select auth.uid()))
    $f$, t || '_insert_own', t);

    -- using: só enxerga/edita linhas próprias; with check: não dá para
    -- "doar" a linha trocando user_id para outro usuário
    execute format($f$
      create policy %I on public.%I
        for update to authenticated
        using (user_id = (select auth.uid()))
        with check (user_id = (select auth.uid()))
    $f$, t || '_update_own', t);

    execute format($f$
      create policy %I on public.%I
        for delete to authenticated
        using (user_id = (select auth.uid()))
    $f$, t || '_delete_own', t);
  end loop;
end;
$$;

-- Nomes usados pela migration inicial (um "for all" por tabela)
drop policy if exists "own stages"  on public.pipeline_stages;
drop policy if exists "own sources" on public.lead_sources;
drop policy if exists "own leads"   on public.leads;
drop policy if exists "own notes"   on public.lead_notes;
drop policy if exists "own tasks"   on public.tasks;

-- ---------------------------------------------------------------
-- 3. Conferência (rode à parte, no SQL Editor)
-- ---------------------------------------------------------------
-- RLS ligado em todas as tabelas (rowsecurity deve ser true):
--   select tablename, rowsecurity from pg_tables where schemaname = 'public';
--
-- Políticas existentes (devem ser 4 por tabela, 20 no total):
--   select tablename, policyname, cmd from pg_policies
--   where schemaname = 'public' order by tablename, cmd;
--
-- Teste de isolamento, simulando um usuário (troque pelo UUID de um usuário real):
--   begin;
--   set local role authenticated;
--   set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-000000000000"}';
--   select count(*) from public.leads;     -- só os leads desse usuário
--   rollback;
--
-- Teste anon (deve falhar com "permission denied"):
--   begin;
--   set local role anon;
--   select * from public.leads;
--   rollback;
