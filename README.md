# Funil CRM

CRM simples com kanban, notas por lead e follow-ups. Next.js (exportação estática) + Supabase.

## Rodar localmente

```bash
cd crm
cp .env.local.example .env.local   # preencha URL e chave publishable
npm install
npm run dev                        # http://localhost:3100
```

## Banco

Execute no SQL Editor do Supabase, nesta ordem:

1. `supabase/migrations/20261011000000_init_crm.sql`
2. `supabase/migrations/20261011000100_rls_policies.sql`

## Publicação (GitHub Pages)

1. Repositório > Settings > Pages > Source: **GitHub Actions**.
2. Repositório > Settings > Secrets and variables > Actions > crie:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
3. Supabase > Authentication > URL Configuration: inclua a URL do Pages em *Site URL* e *Redirect URLs*.
4. Cada push na `main` publica automaticamente.

Os dados ficam protegidos por RLS: cada usuário só acessa as próprias linhas. Nunca versione `.env.local`.
