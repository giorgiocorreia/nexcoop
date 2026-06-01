-- ============================================================
-- NextCoop — Loja Agropecuária
-- ============================================================

-- ── Fornecedores ─────────────────────────────────────────────

create table if not exists loja_fornecedores (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid references organizacoes(id) on delete cascade not null,
  nome         text          not null,
  cnpj         text,
  telefone     text,
  email        text,
  ativo        boolean       not null default true,
  criado_em    timestamptz   not null default now()
);

-- ── Clientes ─────────────────────────────────────────────────

create table if not exists loja_clientes (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid references organizacoes(id) on delete cascade not null,
  nome          text          not null,
  cpf           text,
  telefone      text,
  email         text,
  cooperado_id  uuid references cooperados(id) on delete set null,
  ativo         boolean       not null default true,
  criado_em     timestamptz   not null default now()
);

-- ── Produtos ─────────────────────────────────────────────────

create table if not exists loja_produtos (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid references organizacoes(id)     on delete cascade not null,
  nome              text           not null,
  categoria         text,
  unidade           text           not null
                      check (unidade in ('kg', 'litro', 'unidade', 'saco', 'caixa')),
  preco_normal      numeric(15,2)  not null,
  preco_cooperado   numeric(15,2)  not null,
  estoque_atual     numeric(15,3)  not null default 0,
  estoque_minimo    numeric(15,3),
  fornecedor_id     uuid references loja_fornecedores(id) on delete set null,
  ativo             boolean        not null default true,
  criado_em         timestamptz    not null default now(),
  atualizado_em     timestamptz    not null default now()
);

-- ── Lotes ────────────────────────────────────────────────────

create table if not exists loja_lotes (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid references organizacoes(id) on delete cascade not null,
  produto_id         uuid references loja_produtos(id) on delete cascade not null,
  numero_lote        text,
  data_validade      date,
  quantidade_entrada numeric(15,3)  not null,
  quantidade_atual   numeric(15,3)  not null,
  preco_custo        numeric(15,2)  not null,
  criado_em          timestamptz    not null default now()
);

-- ── Caixas ───────────────────────────────────────────────────

create table if not exists loja_caixas (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid references organizacoes(id) on delete cascade not null,
  usuario_id       uuid references usuarios(id)     on delete restrict  not null,
  valor_abertura   numeric(15,2)  not null default 0,
  valor_fechamento numeric(15,2),
  total_especie    numeric(15,2)  not null default 0,
  total_cartao     numeric(15,2)  not null default 0,
  total_pix        numeric(15,2)  not null default 0,
  status           text           not null default 'aberto'
                     check (status in ('aberto', 'fechado')),
  aberto_em        timestamptz    not null default now(),
  fechado_em       timestamptz
);

-- ── Vendas ───────────────────────────────────────────────────

create table if not exists loja_vendas (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references organizacoes(id)  on delete cascade  not null,
  caixa_id       uuid references loja_caixas(id)   on delete restrict not null,
  cliente_id     uuid references loja_clientes(id) on delete set null,
  cooperado_id   uuid references cooperados(id)    on delete set null,
  tipo_cliente   text           not null
                   check (tipo_cliente in ('cooperado', 'externo')),
  canal          text           not null default 'presencial'
                   check (canal in ('presencial', 'online')),
  status         text           not null default 'concluida'
                   check (status in ('concluida', 'cancelada', 'aguardando_retirada', 'retirada')),
  total          numeric(15,2)  not null default 0,
  pago_especie   numeric(15,2)  not null default 0,
  pago_cartao    numeric(15,2)  not null default 0,
  pago_pix       numeric(15,2)  not null default 0,
  criado_em      timestamptz    not null default now()
);

-- ── Itens de venda ───────────────────────────────────────────

create table if not exists loja_venda_itens (
  id              uuid primary key default gen_random_uuid(),
  venda_id        uuid references loja_vendas(id)   on delete cascade  not null,
  produto_id      uuid references loja_produtos(id) on delete restrict not null,
  lote_id         uuid references loja_lotes(id)    on delete set null,
  quantidade      numeric(15,3)  not null,
  preco_unitario  numeric(15,2)  not null,
  subtotal        numeric(15,2)  not null
);

-- ── Compras ──────────────────────────────────────────────────

create table if not exists loja_compras (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid references organizacoes(id)        on delete cascade  not null,
  fornecedor_id  uuid references loja_fornecedores(id)   on delete restrict not null,
  usuario_id     uuid references usuarios(id)            on delete restrict not null,
  numero_nota    text,
  total          numeric(15,2)  not null default 0,
  criado_em      timestamptz    not null default now()
);

-- ── Itens de compra ──────────────────────────────────────────

create table if not exists loja_compra_itens (
  id             uuid primary key default gen_random_uuid(),
  compra_id      uuid references loja_compras(id)   on delete cascade  not null,
  produto_id     uuid references loja_produtos(id)  on delete restrict not null,
  numero_lote    text,
  data_validade  date,
  quantidade     numeric(15,3)  not null,
  preco_custo    numeric(15,2)  not null,
  subtotal       numeric(15,2)  not null
);

-- ── Movimentos de estoque ────────────────────────────────────

create table if not exists loja_estoque_movimentos (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references organizacoes(id)  on delete cascade not null,
  produto_id      uuid references loja_produtos(id) on delete cascade not null,
  lote_id         uuid references loja_lotes(id)    on delete set null,
  tipo            text           not null
                    check (tipo in ('entrada', 'saida_venda', 'saida_manual', 'inventario')),
  quantidade      numeric(15,3)  not null,
  motivo          text,
  referencia_id   uuid,
  criado_em       timestamptz    not null default now()
);

-- ── Pedidos online ───────────────────────────────────────────

create table if not exists loja_pedidos_online (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid references organizacoes(id)  on delete cascade not null,
  cliente_id              uuid references loja_clientes(id) on delete set null,
  cooperado_id            uuid references cooperados(id)    on delete set null,
  status                  text           not null default 'pendente'
                            check (status in ('pendente', 'confirmado', 'pronto', 'retirado', 'cancelado')),
  data_retirada_solicitada date,
  total                   numeric(15,2)  not null default 0,
  observacao              text,
  criado_em               timestamptz    not null default now(),
  atualizado_em           timestamptz    not null default now()
);

-- ── Itens de pedido online ───────────────────────────────────

create table if not exists loja_pedido_itens (
  id              uuid primary key default gen_random_uuid(),
  pedido_id       uuid references loja_pedidos_online(id) on delete cascade  not null,
  produto_id      uuid references loja_produtos(id)       on delete restrict not null,
  quantidade      numeric(15,3)  not null,
  preco_unitario  numeric(15,2)  not null,
  subtotal        numeric(15,2)  not null
);

-- ── RLS ──────────────────────────────────────────────────────

alter table loja_fornecedores        enable row level security;
alter table loja_clientes            enable row level security;
alter table loja_produtos            enable row level security;
alter table loja_lotes               enable row level security;
alter table loja_caixas              enable row level security;
alter table loja_vendas              enable row level security;
alter table loja_venda_itens         enable row level security;
alter table loja_compras             enable row level security;
alter table loja_compra_itens        enable row level security;
alter table loja_estoque_movimentos  enable row level security;
alter table loja_pedidos_online      enable row level security;
alter table loja_pedido_itens        enable row level security;

-- Tabelas com org_id direto
create policy "loja_fornecedores_org" on loja_fornecedores
  for all
  using      (org_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (org_id = (select organizacao_id from usuarios where id = auth.uid()));

create policy "loja_clientes_org" on loja_clientes
  for all
  using      (org_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (org_id = (select organizacao_id from usuarios where id = auth.uid()));

create policy "loja_produtos_org" on loja_produtos
  for all
  using      (org_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (org_id = (select organizacao_id from usuarios where id = auth.uid()));

create policy "loja_lotes_org" on loja_lotes
  for all
  using      (org_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (org_id = (select organizacao_id from usuarios where id = auth.uid()));

create policy "loja_caixas_org" on loja_caixas
  for all
  using      (org_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (org_id = (select organizacao_id from usuarios where id = auth.uid()));

create policy "loja_vendas_org" on loja_vendas
  for all
  using      (org_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (org_id = (select organizacao_id from usuarios where id = auth.uid()));

create policy "loja_compras_org" on loja_compras
  for all
  using      (org_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (org_id = (select organizacao_id from usuarios where id = auth.uid()));

create policy "loja_estoque_movimentos_org" on loja_estoque_movimentos
  for all
  using      (org_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (org_id = (select organizacao_id from usuarios where id = auth.uid()));

create policy "loja_pedidos_online_org" on loja_pedidos_online
  for all
  using      (org_id = (select organizacao_id from usuarios where id = auth.uid()))
  with check (org_id = (select organizacao_id from usuarios where id = auth.uid()));

-- Tabelas filho (sem org_id — acesso via join com tabela pai)
create policy "loja_venda_itens_org" on loja_venda_itens
  for all
  using (
    exists (
      select 1 from loja_vendas v
      where v.id = venda_id
        and v.org_id = (select organizacao_id from usuarios where id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from loja_vendas v
      where v.id = venda_id
        and v.org_id = (select organizacao_id from usuarios where id = auth.uid())
    )
  );

create policy "loja_compra_itens_org" on loja_compra_itens
  for all
  using (
    exists (
      select 1 from loja_compras c
      where c.id = compra_id
        and c.org_id = (select organizacao_id from usuarios where id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from loja_compras c
      where c.id = compra_id
        and c.org_id = (select organizacao_id from usuarios where id = auth.uid())
    )
  );

create policy "loja_pedido_itens_org" on loja_pedido_itens
  for all
  using (
    exists (
      select 1 from loja_pedidos_online p
      where p.id = pedido_id
        and p.org_id = (select organizacao_id from usuarios where id = auth.uid())
    )
  )
  with check (
    exists (
      select 1 from loja_pedidos_online p
      where p.id = pedido_id
        and p.org_id = (select organizacao_id from usuarios where id = auth.uid())
    )
  );

-- ── Trigger atualizado_em ────────────────────────────────────

-- Reutiliza trg_set_atualizado_em() criada em 011 se já existir,
-- caso contrário cria aqui.
create or replace function trg_set_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$;

create trigger trg_loja_produtos_atualizado
  before update on loja_produtos
  for each row execute function trg_set_atualizado_em();

create trigger trg_loja_pedidos_online_atualizado
  before update on loja_pedidos_online
  for each row execute function trg_set_atualizado_em();

-- ── Índices ──────────────────────────────────────────────────

create index if not exists idx_loja_fornecedores_org        on loja_fornecedores        (org_id);
create index if not exists idx_loja_clientes_org            on loja_clientes            (org_id);
create index if not exists idx_loja_clientes_cooperado      on loja_clientes            (cooperado_id);
create index if not exists idx_loja_produtos_org            on loja_produtos            (org_id);
create index if not exists idx_loja_produtos_fornecedor     on loja_produtos            (fornecedor_id);
create index if not exists idx_loja_lotes_org               on loja_lotes               (org_id);
create index if not exists idx_loja_lotes_produto           on loja_lotes               (produto_id);
create index if not exists idx_loja_lotes_validade          on loja_lotes               (data_validade);
create index if not exists idx_loja_caixas_org              on loja_caixas              (org_id);
create index if not exists idx_loja_vendas_org              on loja_vendas              (org_id);
create index if not exists idx_loja_vendas_caixa            on loja_vendas              (caixa_id);
create index if not exists idx_loja_vendas_criado_em        on loja_vendas              (criado_em);
create index if not exists idx_loja_venda_itens_venda       on loja_venda_itens         (venda_id);
create index if not exists idx_loja_venda_itens_produto     on loja_venda_itens         (produto_id);
create index if not exists idx_loja_compras_org             on loja_compras             (org_id);
create index if not exists idx_loja_compras_criado_em       on loja_compras             (criado_em);
create index if not exists idx_loja_compra_itens_compra     on loja_compra_itens        (compra_id);
create index if not exists idx_loja_compra_itens_produto    on loja_compra_itens        (produto_id);
create index if not exists idx_loja_estoque_mov_org         on loja_estoque_movimentos  (org_id);
create index if not exists idx_loja_estoque_mov_produto     on loja_estoque_movimentos  (produto_id);
create index if not exists idx_loja_estoque_mov_criado_em   on loja_estoque_movimentos  (criado_em);
create index if not exists idx_loja_pedidos_online_org      on loja_pedidos_online      (org_id);
create index if not exists idx_loja_pedidos_online_criado   on loja_pedidos_online      (criado_em);
create index if not exists idx_loja_pedido_itens_pedido     on loja_pedido_itens        (pedido_id);
create index if not exists idx_loja_pedido_itens_produto    on loja_pedido_itens        (produto_id);
