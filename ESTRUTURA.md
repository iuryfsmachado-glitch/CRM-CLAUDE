# Estrutura de pastas — CRM (Next.js App Router + Supabase)

```
crm/
├── supabase/
│   └── migrations/
│       └── 20261011000000_init_crm.sql     # schema, RLS, seed de estágios
│
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/page.tsx              # login (magic link / e-mail+senha)
│   │   ├── (app)/                          # área protegida
│   │   │   ├── layout.tsx                  # sidebar + checagem de sessão
│   │   │   ├── pipeline/page.tsx           # kanban (rota inicial)
│   │   │   ├── leads/
│   │   │   │   ├── page.tsx                # tabela de leads (busca/filtro)
│   │   │   │   └── [id]/page.tsx           # detalhe: dados + notas + tarefas
│   │   │   ├── tasks/page.tsx              # follow-ups: atrasadas / hoje / próximas
│   │   │   └── settings/stages/page.tsx    # criar, renomear, reordenar, excluir estágios
│   │   ├── auth/callback/route.ts          # troca code -> sessão (Supabase)
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── features/                           # 1 pasta por domínio; UI + actions juntas
│   │   ├── leads/
│   │   │   ├── actions.ts                  # server actions: create/update/delete/moveLead
│   │   │   ├── queries.ts                  # leituras (server-side)
│   │   │   ├── schema.ts                   # zod
│   │   │   └── components/                 # LeadForm, LeadsTable, LeadCard...
│   │   ├── pipeline/
│   │   │   ├── actions.ts                  # stages CRUD + reorder
│   │   │   ├── queries.ts
│   │   │   ├── schema.ts
│   │   │   ├── position.ts                 # cálculo de posição (ponto médio)
│   │   │   └── components/                 # KanbanBoard, KanbanColumn, StageManager
│   │   ├── notes/
│   │   │   ├── actions.ts
│   │   │   ├── queries.ts
│   │   │   └── components/                 # NoteTimeline, NoteForm
│   │   └── tasks/
│   │       ├── actions.ts
│   │       ├── queries.ts
│   │       ├── schema.ts
│   │       └── components/                 # TaskList, TaskForm
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── server.ts                   # createServerClient (cookies)
│   │   │   ├── client.ts                   # createBrowserClient
│   │   │   └── middleware.ts               # refresh de sessão
│   │   ├── database.types.ts               # gerado: supabase gen types typescript
│   │   └── utils.ts
│   │
│   ├── components/ui/                      # primitivos (shadcn/ui)
│   └── middleware.ts                       # protege rotas (app)
│
├── .env.local.example                      # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
├── package.json
└── README.md
```

## Decisões

- **Mutations via Server Actions**, leituras em Server Components; Supabase só com a anon key + RLS (sem service role no app).
- **Kanban**: `@dnd-kit` no cliente com update otimista; ao soltar, `moveLead(leadId, stageId, beforeId, afterId)` grava `stage_id` + `position`.
- **Ordenação**: `position` é `double precision`; ao inserir entre A e B usa-se `(A + B) / 2`, sem reescrever a coluna inteira. Se a precisão degradar, uma rotina renumera aquela coluna.
- **Estágios customizáveis**: excluir um estágio com leads exige escolher o estágio de destino (a FK é `on delete restrict`). `kind` (`open`/`won`/`lost`) mantém métricas funcionando mesmo com renomeações.
- **Lembretes**: `tasks.remind_at` + índice parcial nas pendentes. Primeira versão: tela "Tarefas" com atrasadas/hoje/próximas. Notificação por e-mail/push seria um passo seguinte (Supabase cron + Edge Function).
