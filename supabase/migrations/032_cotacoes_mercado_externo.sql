-- 032_cotacoes_mercado_externo.sql
-- Criado: 2026-06-12
-- Cotações globais de mercado (CEPEA e ICE/NY) coletadas pelo cron a cada 6h
-- e configuração de preços sugeridos por org/produto

-- ─────────────────────────────────────────────────────────────────────────────
-- cotacoes_mercado_externo
-- Dados globais — sem organizacao_id, pois o preço de mercado é o mesmo para todas as orgs
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists cotacoes_mercado_externo (
  id              uuid primary key default gen_random_uuid(),
  produto         text not null default 'cacau',
  fonte           text not null check (fonte in ('cepea', 'ice_ny')),
  preco_usd       numeric(12, 4),
  preco_brl       numeric(12, 4),
  cambio_usd_brl  numeric(8, 4),
  data_referencia date not null,
  coletado_em     timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- uma cotação por fonte/produto/dia
create unique index if not exists cotacoes_mercado_externo_uidx
  on cotacoes_mercado_externo (fonte, produto, data_referencia);

-- RLS: qualquer usuário autenticado lê; apenas service_role escreve (cron)
alter table cotacoes_mercado_externo enable row level security;

create policy "cotacoes_mercado_externo: leitura autenticada"
  on cotacoes_mercado_externo for select
  using (auth.role() in ('authenticated', 'service_role'));

create policy "cotacoes_mercado_externo: insert service_role"
  on cotacoes_mercado_externo for insert
  with check (auth.role() = 'service_role');

create policy "cotacoes_mercado_externo: update service_role"
  on cotacoes_mercado_externo for update
  using (auth.role() = 'service_role');

-- ─────────────────────────────────────────────────────────────────────────────
-- config_precos_sugeridos
-- Por org + produto: percentuais aplicados sobre o preço de mercado para
-- gerar sugestão de preço_cooperado e preço_externo
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists config_precos_sugeridos (
  id                   uuid primary key default gen_random_uuid(),
  organizacao_id       uuid not null references organizacoes(id) on delete cascade,
  produto_id           uuid not null references produtos(id) on delete cascade,
  percentual_cooperado numeric(5, 2) not null default 95.00,
  percentual_externo   numeric(5, 2) not null default 90.00,
  ativo                boolean not null default true,
  updated_at           timestamptz not null default now(),
  unique (organizacao_id, produto_id)
);

alter table config_precos_sugeridos enable row level security;

create policy "config_precos_sugeridos: org acesso total"
  on config_precos_sugeridos for all
  using (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );
