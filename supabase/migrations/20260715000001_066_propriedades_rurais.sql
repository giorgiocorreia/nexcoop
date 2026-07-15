-- 066 — Propriedades rurais como lista (N por cooperado)
--
-- Até aqui cada cooperado tinha no máximo UMA propriedade rural, guardada
-- em colunas soltas na própria tabela cooperados (nome_propriedade,
-- area_total_ha, latitude, longitude, caf_numero, caf_situacao,
-- caf_validade, dap_numero). Produtor pode ter mais de uma propriedade —
-- essa migration cria uma tabela própria (propriedades_rurais, N por
-- cooperado) e migra o que já existia preenchido em cooperados como a
-- primeira propriedade da lista.
--
-- As colunas antigas em cooperados NÃO são removidas (evita quebrar
-- leitura de código/relatório que ainda não migrou), só deixam de ser a
-- fonte de verdade daqui pra frente — a UI passa a ler/escrever só em
-- propriedades_rurais.
--
-- Rodar no SQL Editor do Supabase Dashboard.

create table propriedades_rurais (
  id              uuid primary key default gen_random_uuid(),
  organizacao_id  uuid not null references organizacoes(id) on delete cascade,
  cooperado_id    uuid not null references cooperados(id) on delete cascade,
  nome            text,
  area_total_ha   numeric(10,2),
  latitude        numeric(10,6),
  longitude       numeric(10,6),
  caf_numero      text,
  caf_situacao    text,
  caf_validade    date,
  dap_numero      text,
  criado_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now()
);

create index on propriedades_rurais (cooperado_id);
create index on propriedades_rurais (organizacao_id);

alter table propriedades_rurais enable row level security;

create policy "same_org" on propriedades_rurais
  for all using (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

comment on table propriedades_rurais is
  'Propriedades rurais de um cooperado (0..N). Substitui os campos soltos de propriedade que existiam em cooperados (mantidos por compatibilidade, não usados pela UI a partir da 066).';

-- Backfill: cooperados com nome_propriedade preenchido viram a 1ª propriedade da lista.
insert into propriedades_rurais (
  organizacao_id, cooperado_id, nome, area_total_ha, latitude, longitude,
  caf_numero, caf_situacao, caf_validade, dap_numero
)
select
  organizacao_id, id, nome_propriedade, area_total_ha, latitude, longitude,
  caf_numero, caf_situacao, caf_validade, dap_numero
from cooperados
where nome_propriedade is not null
   or area_total_ha is not null
   or caf_numero is not null
   or dap_numero is not null;
