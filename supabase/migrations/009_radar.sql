-- ============================================================
-- NextCoop — Radar de captação (fontes e resultados)
-- ============================================================

-- Campos adicionais no perfil de captação
alter table perfil_captacao
  add column if not exists municipios    text[] default '{}',
  add column if not exists tipo_org      text[] default '{}',
  add column if not exists descricao_org text;

-- Fontes do radar cadastradas pela org
create table if not exists radar_fontes (
  id               uuid primary key default gen_random_uuid(),
  organizacao_id   uuid references organizacoes(id) on delete cascade not null,
  nome             text not null,
  url              text not null,
  tipo             text not null default 'nacional',
  ativo            boolean default true,
  ultima_varredura timestamptz,
  criado_em        timestamptz default now()
);

-- Resultados de cada varredura
create table if not exists radar_resultados (
  id                     uuid primary key default gen_random_uuid(),
  organizacao_id         uuid references organizacoes(id) on delete cascade not null,
  fonte_id               uuid references radar_fontes(id) on delete cascade,
  titulo                 text not null,
  descricao              text,
  financiador            text,
  url_edital             text,
  valor_estimado         numeric(15,2),
  prazo_submissao        date,
  areas_tematicas        text[] default '{}',
  publico_alvo           text[] default '{}',
  score                  integer default 0,
  compatibilidade        text default 'parcial',
  motivo                 text,
  adicionado_ao_pipeline boolean default false,
  oportunidade_id        uuid references oportunidades(id),
  varredura_em           timestamptz default now()
);

-- RLS
alter table radar_fontes enable row level security;
alter table radar_resultados enable row level security;

create policy "radar_fontes_org" on radar_fontes
  using (organizacao_id = (
    select organizacao_id from usuarios where id = auth.uid()
  ));

create policy "radar_resultados_org" on radar_resultados
  using (organizacao_id = (
    select organizacao_id from usuarios where id = auth.uid()
  ));
