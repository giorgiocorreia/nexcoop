-- Migration 014: Módulo Loja Agropecuária

-- Categorias de produtos
CREATE TABLE loja_categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Produtos / SKUs
CREATE TABLE loja_produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES loja_categorias(id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade TEXT NOT NULL DEFAULT 'un' CHECK (unidade IN ('kg','un','l','cx','sc','g','ml','dz')),
  preco_venda NUMERIC(12,2) NOT NULL DEFAULT 0,
  preco_custo NUMERIC(12,2) NOT NULL DEFAULT 0,
  estoque_atual NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_minimo NUMERIC(12,3) NOT NULL DEFAULT 0,
  estoque_maximo NUMERIC(12,3),
  controla_estoque BOOLEAN NOT NULL DEFAULT true,
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Vendas (cabeçalho)
CREATE TABLE loja_vendas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  cooperado_id UUID REFERENCES cooperados(id) ON DELETE SET NULL,
  tipo_cliente TEXT NOT NULL DEFAULT 'externo' CHECK (tipo_cliente IN ('cooperado','externo')),
  status TEXT NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','finalizada','cancelada')),
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  desconto NUMERIC(12,2) NOT NULL DEFAULT 0,
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  forma_pagamento TEXT CHECK (forma_pagamento IN ('dinheiro','pix','cartao','fiado','credito_cooperado')),
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  finalizada_em TIMESTAMPTZ
);

-- Itens da venda
CREATE TABLE loja_venda_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venda_id UUID NOT NULL REFERENCES loja_vendas(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES loja_produtos(id),
  quantidade NUMERIC(12,3) NOT NULL,
  preco_unitario NUMERIC(12,2) NOT NULL,
  desconto_item NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL
);

-- Movimentações de estoque (ledger de auditoria)
CREATE TABLE loja_movimentacoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES loja_produtos(id),
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada','saida','ajuste','devolucao')),
  quantidade NUMERIC(12,3) NOT NULL,
  quantidade_anterior NUMERIC(12,3) NOT NULL,
  quantidade_nova NUMERIC(12,3) NOT NULL,
  motivo TEXT,
  referencia_id UUID,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Pedidos de compra / reposição
CREATE TABLE loja_compras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id UUID NOT NULL REFERENCES usuarios(id),
  fornecedor TEXT,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho','enviado','recebido','cancelado')),
  total NUMERIC(12,2) NOT NULL DEFAULT 0,
  observacao TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  recebido_em TIMESTAMPTZ
);

-- Itens do pedido de compra
CREATE TABLE loja_compra_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  compra_id UUID NOT NULL REFERENCES loja_compras(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES loja_produtos(id),
  quantidade NUMERIC(12,3) NOT NULL,
  preco_unitario NUMERIC(12,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0
);

-- Índices de performance
CREATE INDEX idx_loja_produtos_org ON loja_produtos(org_id) WHERE ativo = true;
CREATE INDEX idx_loja_vendas_org ON loja_vendas(org_id);
CREATE INDEX idx_loja_vendas_criado ON loja_vendas(org_id, criado_em DESC);
CREATE INDEX idx_loja_movimentacoes_produto ON loja_movimentacoes(produto_id, criado_em DESC);

-- RLS
ALTER TABLE loja_categorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_venda_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_movimentacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_compras ENABLE ROW LEVEL SECURITY;
ALTER TABLE loja_compra_itens ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "org_acesso_loja_categorias" ON loja_categorias
  FOR ALL USING (org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "org_acesso_loja_produtos" ON loja_produtos
  FOR ALL USING (org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "org_acesso_loja_vendas" ON loja_vendas
  FOR ALL USING (org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "org_acesso_loja_venda_itens" ON loja_venda_itens
  FOR ALL USING (venda_id IN (
    SELECT id FROM loja_vendas WHERE org_id IN (
      SELECT org_id FROM usuarios WHERE id = auth.uid()
    )
  ));

CREATE POLICY "org_acesso_loja_movimentacoes" ON loja_movimentacoes
  FOR ALL USING (org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "org_acesso_loja_compras" ON loja_compras
  FOR ALL USING (org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid()));

CREATE POLICY "org_acesso_loja_compra_itens" ON loja_compra_itens
  FOR ALL USING (compra_id IN (
    SELECT id FROM loja_compras WHERE org_id IN (
      SELECT org_id FROM usuarios WHERE id = auth.uid()
    )
  ));

-- Registrar funções do módulo Loja
INSERT INTO funcoes_disponiveis (funcao, descricao, modulo) VALUES
  ('gerente_loja', 'Acesso completo ao módulo Loja — produtos, estoque, compras, relatórios', 'loja'),
  ('vendedor', 'Acesso ao PDV e visualização de estoque', 'loja'),
  ('atendente', 'Acesso ao PDV apenas', 'loja')
ON CONFLICT (funcao) DO NOTHING;
