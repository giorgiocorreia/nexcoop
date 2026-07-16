# NexCoop — Contexto do Projeto

Você está no repositório do **NexCoop**, SaaS multi-tenant para cooperativas e associações brasileiras.
Stack: Next.js + TypeScript + Supabase + Vercel. Branch: `main`.

## Identidade rápida
- Supabase ID: `cufovlntqfobutwvfcea`
- Org teste: COOPAIBI — `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- Super admin: gio.pessoal@gmail.com
- Deploy: nexcoop.com.br (Vercel Hobby)

---

## Regras críticas — NUNCA violar em nenhum arquivo

1. **NUNCA** usar `auth_org_id()` — sempre subquery:
   ```sql
   (select organizacao_id from usuarios where id = auth.uid())
   ```

2. **`createAdminClient()`** para: writes org-level, relatórios, queries cross-table.
   **`createClient()`** apenas para: `auth.getUser()`, verificar permissão do usuário logado.

3. **Migrations** sempre via Supabase Dashboard SQL Editor — nunca `npx supabase db push`.

4. **`npx tsc --noEmit`** antes de todo commit. Se falhar, corrigir antes de commitar.

5. **Funções puras** (parse, formatação, cálculo — sem I/O) NUNCA entram em arquivo `"use server"`.
   - Padrão: `lib/modulo/feature.ts` (server actions) + `lib/modulo/feature-utils.ts` (utilitários puros)

6. **Joins PostgREST com FK ambígua**: especificar explicitamente.
   - Ex: `usuarios!loja_caixas_usuario_id_fkey`
   - `loja_caixas` tem DUAS FKs para `usuarios` (`usuario_id` e `conferido_por`) — sempre query separada.

7. **Permissões** apenas via `lib/permissoes.ts` — nunca inline.

8. **Types** em `types/database.ts` — atualizar a cada nova tabela.

9. **Snapshots** (`saldos_produtor_snapshot`, `resultado_safra_snapshot`) mantidos exclusivamente por triggers Postgres — server actions NUNCA atualizam diretamente.

10. **pdf-lib** para PDFs (pdfkit incompatível com Vercel serverless).

---

## Próxima migration
A próxima migration disponível é a **070**. Este número fica desatualizado com
frequência (já causou colisão de numeração várias vezes) — SEMPRE confirmar o
número real em `docs/SCHEMA.md` e em `ls supabase/migrations/` antes de criar
qualquer migration nova, nunca confiar só neste arquivo.

## UI kit (jul/2026)
Todas as telas novas usam `components/nexcoop/ui/` — `PageLayout`, `COM_C`, `MODULO_*`.
Referência: `app/(sistema)/dashboard/DashboardClient.tsx`, `app/(sistema)/financeiro/FinanceiroLista.tsx`.

---

## Quando delegar para subagentes

- Criar ou alterar migration SQL → subagente `nexcoop-migration-writer`
- Qualquer coisa do módulo Comercialização (lotes, cotações, safras, NF-e) → subagente `nexcoop-comercializacao`
- Qualquer coisa fiscal (NF-e, Focus NFe, CFOP, devoluções) → subagente `nexcoop-fiscal`

Se a tarefa cruzar dois subagentes, execute o de schema primeiro, depois o de feature.