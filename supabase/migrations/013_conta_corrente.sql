-- ============================================================
-- NextCoop — Conta Corrente do Cooperado
-- ============================================================

-- ── Tabela principal ──────────────────────────────────────────

create table if not exists cooperado_conta_corrente (
  id                uuid          primary key default gen_random_uuid(),
  org_id            uuid          references organizacoes(id) on delete cascade not null,
  cooperado_id      uuid          references cooperados(id)   on delete cascade not null,
  tipo              text          not null
                      check (tipo in ('credito', 'debito')),
  origem            text          not null
                      check (origem in (
                        'entrega_producao', 'compra_loja', 'mensalidade',
                        'sobras', 'adiantamento', 'repasse', 'outro'
                      )),
  valor             numeric(15,2) not null check (valor > 0),
  saldo_apos        numeric(15,2) not null,
  referencia_id     uuid,
  referencia_tabela text,
  descricao         text          not null default '',
  criado_por        uuid          references usuarios(id) on delete set null,
  criado_em         timestamptz   not null default now()
);

-- ── Adiciona pago_saldo em loja_vendas ────────────────────────

alter table loja_vendas
  add column if not exists pago_saldo numeric(15,2) not null default 0;

-- ── RLS ──────────────────────────────────────────────────────

alter table cooperado_conta_corrente enable row level security;

create policy "conta_corrente_org" on cooperado_conta_corrente
  for all
  using      (org_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (org_id = (select organizacao_id from usuarios where id = auth.uid()));

-- ── View: saldo atual por cooperado ──────────────────────────
-- security_invoker faz a view herdar as permissões do chamador,
-- garantindo que o RLS da tabela seja aplicado normalmente.

create or replace view cooperado_saldo_atual
  with (security_invoker = on)
as
  select
    org_id,
    cooperado_id,
    coalesce(
      sum(case when tipo = 'credito' then valor else -valor end),
      0
    )::numeric(15,2) as saldo_atual
  from cooperado_conta_corrente
  group by org_id, cooperado_id;

-- ── Função: creditar_cooperado ────────────────────────────────
-- Executa como o usuário chamador (security invoker = padrão),
-- portanto o RLS garante isolamento de org automaticamente.
-- Advisory lock evita race condition em lançamentos simultâneos
-- para o mesmo cooperado.

create or replace function creditar_cooperado(
  p_org_id       uuid,
  p_cooperado_id uuid,
  p_valor        numeric,
  p_origem       text,
  p_descricao    text,
  p_criado_por   uuid
) returns cooperado_conta_corrente
language plpgsql as $$
declare
  v_saldo_atual  numeric(15,2);
  v_saldo_novo   numeric(15,2);
  v_registro     cooperado_conta_corrente;
begin
  if p_valor <= 0 then
    raise exception 'valor deve ser positivo (recebido: %)', p_valor;
  end if;

  -- Lock de transação por cooperado para evitar race condition
  perform pg_advisory_xact_lock(
    hashtext(p_org_id::text || ':' || p_cooperado_id::text)
  );

  -- Saldo atual calculado a partir de todos os lançamentos
  select coalesce(sum(case when tipo = 'credito' then valor else -valor end), 0)
    into v_saldo_atual
  from cooperado_conta_corrente
  where org_id = p_org_id
    and cooperado_id = p_cooperado_id;

  v_saldo_novo := v_saldo_atual + p_valor;

  insert into cooperado_conta_corrente (
    org_id, cooperado_id, tipo, origem,
    valor, saldo_apos, descricao, criado_por
  ) values (
    p_org_id, p_cooperado_id, 'credito', p_origem,
    p_valor, v_saldo_novo, coalesce(p_descricao, ''), p_criado_por
  )
  returning * into v_registro;

  return v_registro;
end;
$$;

-- ── Função: debitar_cooperado ─────────────────────────────────
-- Verifica saldo suficiente antes de lançar.
-- Levanta exceção com mensagem legível se saldo insuficiente.

create or replace function debitar_cooperado(
  p_org_id       uuid,
  p_cooperado_id uuid,
  p_valor        numeric,
  p_origem       text,
  p_descricao    text,
  p_criado_por   uuid
) returns cooperado_conta_corrente
language plpgsql as $$
declare
  v_saldo_atual  numeric(15,2);
  v_saldo_novo   numeric(15,2);
  v_registro     cooperado_conta_corrente;
begin
  if p_valor <= 0 then
    raise exception 'valor deve ser positivo (recebido: %)', p_valor;
  end if;

  -- Lock de transação por cooperado para evitar race condition
  perform pg_advisory_xact_lock(
    hashtext(p_org_id::text || ':' || p_cooperado_id::text)
  );

  -- Saldo atual calculado a partir de todos os lançamentos
  select coalesce(sum(case when tipo = 'credito' then valor else -valor end), 0)
    into v_saldo_atual
  from cooperado_conta_corrente
  where org_id = p_org_id
    and cooperado_id = p_cooperado_id;

  if v_saldo_atual < p_valor then
    raise exception
      'saldo insuficiente — saldo atual: R$ %, valor solicitado: R$ %',
      to_char(v_saldo_atual, 'FM999G999G990D00'),
      to_char(p_valor,       'FM999G999G990D00')
      using errcode = 'P0001';
  end if;

  v_saldo_novo := v_saldo_atual - p_valor;

  insert into cooperado_conta_corrente (
    org_id, cooperado_id, tipo, origem,
    valor, saldo_apos, descricao, criado_por
  ) values (
    p_org_id, p_cooperado_id, 'debito', p_origem,
    p_valor, v_saldo_novo, coalesce(p_descricao, ''), p_criado_por
  )
  returning * into v_registro;

  return v_registro;
end;
$$;

-- ── Índices ──────────────────────────────────────────────────

create index if not exists idx_conta_corrente_org
  on cooperado_conta_corrente (org_id);

create index if not exists idx_conta_corrente_cooperado
  on cooperado_conta_corrente (cooperado_id);

create index if not exists idx_conta_corrente_criado_em
  on cooperado_conta_corrente (criado_em desc);

-- Índice composto para a query de saldo (org_id + cooperado_id + tipo + valor)
create index if not exists idx_conta_corrente_saldo
  on cooperado_conta_corrente (org_id, cooperado_id)
  include (tipo, valor);
