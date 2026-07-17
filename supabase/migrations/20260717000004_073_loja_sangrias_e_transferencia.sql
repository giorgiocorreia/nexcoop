-- Migration 073: formaliza loja_sangrias (schema drift) + vínculo de transferência entre módulos
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-17

-- ============================================================
-- 1) Formalização de loja_sangrias
--
-- Esta tabela já existe em produção desde 2026-07 mas nunca foi
-- versionada em nenhuma migration do repo (schema drift). O código
-- em lib/loja/actions.ts já acessa ela via `(admin as any).from(...)`.
-- Bloco abaixo é idempotente e não-destrutivo — apenas documenta o
-- schema real, sem efeito em produção (a tabela já existe lá exatamente
-- assim). Permite recriar o ambiente do zero em dev/staging.
-- ============================================================

create table if not exists loja_sangrias (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references organizacoes(id) on delete cascade,
  caixa_id       uuid not null references loja_caixas(id) on delete cascade,
  tipo           text not null check (tipo in ('aporte', 'sangria')),
  valor          numeric(12,2) not null check (valor > 0),
  autorizado_por uuid not null references usuarios(id),
  executado_por  uuid not null references usuarios(id),
  observacoes    text,
  created_at     timestamptz not null default now()
);

alter table loja_sangrias enable row level security;

-- Política de SELECT: qualquer membro da organização
drop policy if exists "org members can view loja_sangrias" on loja_sangrias;
create policy "org members can view loja_sangrias"
  on loja_sangrias for select
  using (org_id = (select organizacao_id from usuarios where id = auth.uid()));

-- Política de INSERT: restrita a admin ou gerente_loja
drop policy if exists "admin ou gerente_loja pode inserir loja_sangrias" on loja_sangrias;
create policy "admin ou gerente_loja pode inserir loja_sangrias"
  on loja_sangrias for insert
  with check (
    org_id = (select organizacao_id from usuarios where id = auth.uid())
    and exists (
      select 1 from usuarios
      where id = auth.uid()
        and funcoes && array['admin', 'gerente_loja']
    )
  );

create index if not exists idx_loja_sangrias_caixa on loja_sangrias(caixa_id);
create index if not exists idx_loja_sangrias_org   on loja_sangrias(org_id);

-- ============================================================
-- 2) Vínculo de transferência entre Comercialização e Loja
--
-- `referencia_transferencia_id` é gerado em código (não é FK — as duas
-- pontas de uma transferência vivem em tabelas diferentes: aportes_sangrias
-- e loja_sangrias). Um valor comum entre as duas linhas linka as pontas.
-- `origem_transferencia` documenta qual módulo é "o outro lado".
-- ============================================================

alter table aportes_sangrias
  add column if not exists origem_transferencia text
    check (origem_transferencia in ('comercializacao', 'loja')) default null,
  add column if not exists referencia_transferencia_id uuid default null;

alter table loja_sangrias
  add column if not exists origem_transferencia text
    check (origem_transferencia in ('comercializacao', 'loja')) default null,
  add column if not exists referencia_transferencia_id uuid default null;

create index if not exists idx_aportes_sangrias_ref_transf on aportes_sangrias(referencia_transferencia_id);
create index if not exists idx_loja_sangrias_ref_transf   on loja_sangrias(referencia_transferencia_id);

-- Rollback (comentado):
-- ALTER TABLE aportes_sangrias DROP COLUMN IF EXISTS origem_transferencia;
-- ALTER TABLE aportes_sangrias DROP COLUMN IF EXISTS referencia_transferencia_id;
-- ALTER TABLE loja_sangrias DROP COLUMN IF EXISTS origem_transferencia;
-- ALTER TABLE loja_sangrias DROP COLUMN IF EXISTS referencia_transferencia_id;
-- DROP INDEX IF EXISTS idx_aportes_sangrias_ref_transf;
-- DROP INDEX IF EXISTS idx_loja_sangrias_ref_transf;
-- DROP POLICY IF EXISTS "org members can view loja_sangrias" ON loja_sangrias;
-- DROP POLICY IF EXISTS "admin ou gerente_loja pode inserir loja_sangrias" ON loja_sangrias;
-- DROP TABLE IF EXISTS loja_sangrias;
