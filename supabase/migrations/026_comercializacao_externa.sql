-- ========================================
-- 026_comercializacao_externa.sql
-- ========================================

-- 1. SAFRAS
CREATE TABLE safras (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  ano integer NOT NULL,
  descricao text,
  estimativa_kg numeric(12,3),
  taxa_comercializacao numeric(5,2) NOT NULL DEFAULT 3.00,
  status text NOT NULL DEFAULT 'planejamento'
    CHECK (status IN ('planejamento','em_andamento','encerrada')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizacao_id, ano)
);

-- 2. COMPRADORES
CREATE TABLE compradores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  tipo text CHECK (tipo IN ('exportador','industria','trader','outro')),
  cnpj text,
  contato text,
  email text,
  telefone text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 3. LOTES
CREATE TABLE lotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  safra_id uuid NOT NULL REFERENCES safras(id),
  produto_id uuid NOT NULL REFERENCES produtos(id),
  codigo text NOT NULL,
  peso_total_kg numeric(12,3) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberto'
    CHECK (status IN ('aberto','em_venda','entregue')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizacao_id, codigo)
);

-- 4. VENDAS EXTERNAS
CREATE TABLE vendas_externas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  safra_id uuid NOT NULL REFERENCES safras(id),
  lote_id uuid NOT NULL REFERENCES lotes(id),
  comprador_id uuid NOT NULL REFERENCES compradores(id),
  data_venda date NOT NULL,
  quantidade_kg numeric(12,3) NOT NULL,
  preco_kg numeric(10,2) NOT NULL,
  valor_bruto numeric(14,2) GENERATED ALWAYS AS (quantidade_kg * preco_kg) STORED,
  taxa_comercializacao_pct numeric(5,2) NOT NULL,
  valor_taxa numeric(14,2),
  custos_logistica numeric(14,2) NOT NULL DEFAULT 0,
  valor_liquido numeric(14,2),
  status text NOT NULL DEFAULT 'rascunho'
    CHECK (status IN ('rascunho','confirmada','entregue','paga')),
  lancamento_id uuid REFERENCES lancamentos(id),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 5. RETIRADAS EXTERNAS — vincular à venda
ALTER TABLE retiradas_externas
  ADD COLUMN IF NOT EXISTS venda_externa_id uuid REFERENCES vendas_externas(id),
  ADD COLUMN IF NOT EXISTS safra_id uuid REFERENCES safras(id);

-- 6. DISTRIBUIÇÃO DE RESULTADO
CREATE TABLE distribuicao_resultado (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  venda_externa_id uuid NOT NULL REFERENCES vendas_externas(id),
  produtor_id uuid NOT NULL REFERENCES produtores(id),
  conta_id uuid NOT NULL REFERENCES contas_produtor(id),
  quantidade_kg numeric(12,3) NOT NULL,
  percentual numeric(8,4) NOT NULL,
  valor_bruto numeric(14,2) NOT NULL,
  valor_liquido numeric(14,2) NOT NULL,
  status text NOT NULL DEFAULT 'calculado'
    CHECK (status IN ('calculado','pago')),
  data_pagamento date,
  movimentacao_id uuid REFERENCES movimentacoes_conta(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (venda_externa_id, produtor_id)
);

-- RLS
ALTER TABLE safras ENABLE ROW LEVEL SECURITY;
ALTER TABLE compradores ENABLE ROW LEVEL SECURITY;
ALTER TABLE lotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendas_externas ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribuicao_resultado ENABLE ROW LEVEL SECURITY;

-- POLICIES: safras
CREATE POLICY "org members can view safras"
  ON safras FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));
CREATE POLICY "admin financeiro can manage safras"
  ON safras FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid() AND (funcoes && ARRAY['admin','financeiro'])
  ));

-- POLICIES: compradores
CREATE POLICY "org members can view compradores"
  ON compradores FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));
CREATE POLICY "admin financeiro can manage compradores"
  ON compradores FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid() AND (funcoes && ARRAY['admin','financeiro'])
  ));

-- POLICIES: lotes
CREATE POLICY "org members can view lotes"
  ON lotes FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));
CREATE POLICY "admin financeiro tecnico can manage lotes"
  ON lotes FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid() AND (funcoes && ARRAY['admin','financeiro','tecnico'])
  ));

-- POLICIES: vendas_externas
CREATE POLICY "org members can view vendas_externas"
  ON vendas_externas FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));
CREATE POLICY "admin financeiro can manage vendas_externas"
  ON vendas_externas FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid() AND (funcoes && ARRAY['admin','financeiro'])
  ));

-- POLICIES: distribuicao_resultado
CREATE POLICY "org members can view distribuicao_resultado"
  ON distribuicao_resultado FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));
CREATE POLICY "admin financeiro can manage distribuicao_resultado"
  ON distribuicao_resultado FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid() AND (funcoes && ARRAY['admin','financeiro'])
  ));

-- TRIGGER: calcular valor_taxa e valor_liquido
CREATE OR REPLACE FUNCTION fn_calcular_venda_externa()
RETURNS TRIGGER AS $$
BEGIN
  NEW.valor_taxa := ROUND((NEW.quantidade_kg * NEW.preco_kg) * (NEW.taxa_comercializacao_pct / 100), 2);
  NEW.valor_liquido := ROUND((NEW.quantidade_kg * NEW.preco_kg) - NEW.valor_taxa - NEW.custos_logistica, 2);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_calcular_venda_externa
  BEFORE INSERT OR UPDATE ON vendas_externas
  FOR EACH ROW EXECUTE FUNCTION fn_calcular_venda_externa();

-- TRIGGER: atualizar status do lote
CREATE OR REPLACE FUNCTION fn_atualizar_status_lote()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'confirmada' AND OLD.status = 'rascunho' THEN
    UPDATE lotes SET status = 'em_venda' WHERE id = NEW.lote_id;
  END IF;
  IF NEW.status = 'entregue' THEN
    UPDATE lotes SET status = 'entregue' WHERE id = NEW.lote_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_status_lote
  AFTER UPDATE ON vendas_externas
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_status_lote();
