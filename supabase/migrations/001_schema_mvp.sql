-- =============================================================================
-- NextCoop — Schema MVP
-- =============================================================================

-- ── Tipos enumerados ──────────────────────────────────────────────────────────

create type tipo_organizacao   as enum ('cooperativa', 'associacao', 'central');
create type plano_organizacao  as enum ('essencial', 'cooperativa', 'agro', 'impacto', 'enterprise');
create type role_usuario       as enum ('super_admin', 'org_admin', 'financeiro', 'tecnico', 'comercial', 'conselho_fiscal', 'cooperado', 'parceiro');
create type status_cooperado   as enum ('proposta', 'probatorio', 'ativo', 'inadimplente', 'suspenso', 'demitido', 'excluido');
create type tipo_lancamento    as enum ('receita', 'despesa', 'transferencia');
create type status_lancamento  as enum ('pendente', 'pago', 'cancelado', 'agendado');
create type tipo_assembleia    as enum ('AGO', 'AGE', 'reuniao_CA', 'reuniao_CF');
create type status_assembleia  as enum ('agendada', 'realizada', 'cancelada');
create type categoria_documento as enum (
  'estatuto', 'ata', 'contrato', 'convenio', 'edital',
  'certidao', 'licenca', 'relatorio', 'financeiro', 'projeto', 'aditivo', 'outro'
);
create type tipo_notificacao   as enum (
  'alerta_documento', 'alerta_caf', 'alerta_certidao',
  'assembleia_convocacao', 'financeiro_vencimento',
  'cooperado_novo', 'sistema', 'outro'
);

-- ── Organizações ──────────────────────────────────────────────────────────────

create table organizacoes (
  id               uuid primary key default gen_random_uuid(),
  nome             text not null,
  nome_curto       text,
  cnpj             text unique,
  tipo             tipo_organizacao not null default 'cooperativa',
  email            text,
  telefone         text,
  site             text,
  logo_url         text,
  cep              text,
  logradouro       text,
  numero           text,
  complemento      text,
  bairro           text,
  cidade           text not null default '',
  estado           text not null default '',
  caf_numero       text,
  caf_situacao     text,
  caf_validade     date,
  data_fundacao    date,
  registro_juceb   text,
  ativo            boolean not null default true,
  plano            plano_organizacao not null default 'essencial',
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

-- ── Usuários ──────────────────────────────────────────────────────────────────

create table usuarios (
  id               uuid primary key references auth.users(id) on delete cascade,
  organizacao_id   uuid references organizacoes(id) on delete set null,
  nome_completo    text not null,
  cpf              text,
  email            text not null,
  telefone         text,
  avatar_url       text,
  role             role_usuario not null default 'cooperado',
  ativo            boolean not null default true,
  ultimo_acesso    timestamptz,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

-- ── Cooperados ────────────────────────────────────────────────────────────────

create table cooperados (
  id                  uuid primary key default gen_random_uuid(),
  organizacao_id      uuid not null references organizacoes(id) on delete cascade,
  usuario_id          uuid references usuarios(id) on delete set null,
  nome_completo       text not null,
  cpf                 text,
  rg                  text,
  data_nascimento     date,
  sexo                text check (sexo in ('M', 'F', 'outro')),
  email               text,
  telefone            text,
  whatsapp            text,
  foto_url            text,
  cep                 text,
  logradouro          text,
  numero              text,
  complemento         text,
  bairro              text,
  cidade              text,
  estado              text,
  nome_propriedade    text,
  area_total_ha       numeric,
  latitude            numeric,
  longitude           numeric,
  caf_numero          text,
  caf_situacao        text,
  caf_validade        date,
  dap_numero          text,
  status              status_cooperado not null default 'proposta',
  data_admissao       date,
  data_saida          date,
  motivo_saida        text,
  numero_matricula    text,
  tipo                text not null default 'pessoa_fisica' check (tipo in ('pessoa_fisica', 'pessoa_juridica')),
  cnpj_pj             text,
  representante_nome  text,
  representante_cpf   text,
  criado_em           timestamptz not null default now(),
  atualizado_em       timestamptz not null default now()
);

-- ── Lançamentos financeiros ───────────────────────────────────────────────────

create table lancamentos (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  tipo              tipo_lancamento not null,
  status            status_lancamento not null default 'pendente',
  descricao         text not null,
  valor             numeric(15,2) not null check (valor > 0),
  data_competencia  date not null,
  data_vencimento   date,
  data_pagamento    date,
  categoria_id      uuid,
  conta_id          uuid,
  conta_destino_id  uuid,
  cooperado_id      uuid references cooperados(id) on delete set null,
  centro_custo      text,
  projeto_id        uuid,
  recorrente        boolean not null default false,
  frequencia        text check (frequencia in ('mensal', 'trimestral', 'anual')),
  comprovante_url   text,
  numero_documento  text,
  observacoes       text,
  usuario_id        uuid references usuarios(id) on delete set null,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

-- ── Assembleias ───────────────────────────────────────────────────────────────

create table assembleias (
  id                    uuid primary key default gen_random_uuid(),
  organizacao_id        uuid not null references organizacoes(id) on delete cascade,
  tipo                  tipo_assembleia not null,
  titulo                text not null,
  data_realizacao       timestamptz not null,
  local                 text,
  modalidade            text not null default 'presencial' check (modalidade in ('presencial', 'remota', 'hibrida')),
  status                status_assembleia not null default 'agendada',
  data_convocacao       date,
  convocacao_enviada    boolean not null default false,
  edital_url            text,
  quorum_minimo         integer,
  total_presentes       integer not null default 0,
  quorum_atingido       boolean not null default false,
  pauta                 text,
  observacoes           text,
  ata_gerada            boolean not null default false,
  ata_url               text,
  ata_assinada          boolean not null default false,
  usuario_id            uuid references usuarios(id) on delete set null,
  criado_em             timestamptz not null default now(),
  atualizado_em         timestamptz not null default now()
);

-- ── Documentos ────────────────────────────────────────────────────────────────

create table documentos (
  id                uuid primary key default gen_random_uuid(),
  organizacao_id    uuid not null references organizacoes(id) on delete cascade,
  nome              text not null,
  descricao         text,
  categoria         categoria_documento not null default 'outro',
  arquivo_url       text not null,
  tamanho_bytes     bigint,
  tipo_mime         text,
  versao            integer not null default 1,
  documento_pai_id  uuid references documentos(id) on delete set null,
  data_emissao      date,
  data_validade     date,
  orgao_emissor     text,
  numero_documento  text,
  alerta_dias       integer not null default 30,
  restrito          boolean not null default false,
  usuario_id        uuid references usuarios(id) on delete set null,
  criado_em         timestamptz not null default now(),
  atualizado_em     timestamptz not null default now()
);

-- ── Notificações ──────────────────────────────────────────────────────────────

create table notificacoes (
  id               uuid primary key default gen_random_uuid(),
  organizacao_id   uuid not null references organizacoes(id) on delete cascade,
  usuario_id       uuid not null references usuarios(id) on delete cascade,
  tipo             tipo_notificacao not null default 'sistema',
  titulo           text not null,
  mensagem         text not null,
  lida             boolean not null default false,
  data_leitura     timestamptz,
  link             text,
  ref_tipo         text,
  ref_id           uuid,
  criado_em        timestamptz not null default now()
);

-- ── Índices ───────────────────────────────────────────────────────────────────

create index on cooperados  (organizacao_id);
create index on cooperados  (status);
create index on lancamentos (organizacao_id);
create index on lancamentos (status);
create index on lancamentos (data_competencia);
create index on assembleias (organizacao_id);
create index on assembleias (status);
create index on assembleias (data_realizacao);
create index on documentos  (organizacao_id);
create index on documentos  (categoria);
create index on documentos  (data_validade);
create index on notificacoes (usuario_id, lida);

-- ── Row-Level Security ────────────────────────────────────────────────────────

alter table organizacoes  enable row level security;
alter table usuarios       enable row level security;
alter table cooperados     enable row level security;
alter table lancamentos    enable row level security;
alter table assembleias    enable row level security;
alter table documentos     enable row level security;
alter table notificacoes   enable row level security;

-- Helper: retorna o organizacao_id do usuário autenticado
create or replace function auth_org_id()
returns uuid language sql stable security definer as $$
  select organizacao_id from usuarios where id = auth.uid()
$$;

-- Helper: retorna o role do usuário autenticado
create or replace function auth_role()
returns text language sql stable security definer as $$
  select role::text from usuarios where id = auth.uid()
$$;

-- Organizações: apenas membros da org
create policy "org_members" on organizacoes
  for all using (id = auth_org_id());

-- Usuários: membros da mesma org
create policy "same_org" on usuarios
  for all using (organizacao_id = auth_org_id());

-- Cooperados
create policy "same_org" on cooperados
  for all using (organizacao_id = auth_org_id());

-- Lançamentos
create policy "same_org" on lancamentos
  for all using (organizacao_id = auth_org_id());

-- Assembleias
create policy "same_org" on assembleias
  for all using (organizacao_id = auth_org_id());

-- Documentos: restritos apenas para org_admin
create policy "same_org_public" on documentos
  for all using (
    organizacao_id = auth_org_id()
    and (not restrito or auth_role() in ('org_admin', 'super_admin'))
  );

-- Notificações: apenas o próprio usuário
create policy "proprio_usuario" on notificacoes
  for all using (usuario_id = auth.uid());

-- ── Trigger: atualizado_em ────────────────────────────────────────────────────

create or replace function set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end;
$$;

create trigger trg_organizacoes_atualizado
  before update on organizacoes
  for each row execute function set_atualizado_em();

create trigger trg_usuarios_atualizado
  before update on usuarios
  for each row execute function set_atualizado_em();

create trigger trg_cooperados_atualizado
  before update on cooperados
  for each row execute function set_atualizado_em();

create trigger trg_lancamentos_atualizado
  before update on lancamentos
  for each row execute function set_atualizado_em();

create trigger trg_assembleias_atualizado
  before update on assembleias
  for each row execute function set_atualizado_em();

create trigger trg_documentos_atualizado
  before update on documentos
  for each row execute function set_atualizado_em();

-- ── Trigger: criar usuário ao registrar em auth ───────────────────────────────

create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into usuarios (id, email, nome_completo, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'nome_completo', split_part(new.email, '@', 1)),
    'cooperado'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
