-- ========================================
-- 025_produtores_contas_caixa.sql
-- ========================================

-- 1. PRODUTOS
CREATE TABLE produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  categoria text,
  unidade text NOT NULL DEFAULT 'kg',
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 2. COTAÇÕES
CREATE TABLE cotacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  data date NOT NULL,
  preco_externo numeric(10,2) NOT NULL,
  preco_cooperado numeric(10,2) NOT NULL,
  registrado_por uuid REFERENCES usuarios(id),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizacao_id, produto_id, data)
);

-- 3. PRODUTORES
CREATE TABLE produtores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf text,
  telefone text,
  email text,
  municipio text,
  endereco text,
  tipo text NOT NULL DEFAULT 'externo'
    CHECK (tipo IN ('externo','cooperado')),
  cooperado_id uuid REFERENCES cooperados(id),
  area_total_ha numeric(10,2),
  area_cacau_ha numeric(10,2),
  tem_certificacao boolean NOT NULL DEFAULT false,
  tipo_certificacao text,
  banco text,
  agencia text,
  conta_bancaria text,
  tipo_conta text CHECK (tipo_conta IN ('corrente','poupanca','pix')),
  chave_pix text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. CONTAS DO PRODUTOR
CREATE TABLE contas_produtor (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  produtor_id uuid NOT NULL REFERENCES produtores(id) ON DELETE CASCADE,
  saldo_financeiro numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizacao_id, produtor_id)
);

-- 5. SALDOS PRODUTO (estoque virtual por produtor)
CREATE TABLE saldos_produto (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conta_id uuid NOT NULL REFERENCES contas_produtor(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade numeric(12,3) NOT NULL DEFAULT 0,
  UNIQUE (conta_id, produto_id)
);

-- 6. ESTOQUE FÍSICO (galpão — independente do virtual)
CREATE TABLE estoque_fisico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES produtos(id) ON DELETE CASCADE,
  quantidade numeric(12,3) NOT NULL DEFAULT 0,
  ultima_atualizacao timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organizacao_id, produto_id)
);

-- 7. SESSÕES DE CAIXA (criada antes de movimentacoes_conta pois é referenciada por ela)
CREATE TABLE sessoes_caixa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  data date NOT NULL,
  hora_abertura timestamptz NOT NULL DEFAULT now(),
  hora_fechamento timestamptz,
  saldo_inicial_especie numeric(12,2) NOT NULL,
  saldo_final_especie numeric(12,2),
  total_entradas_especie numeric(12,2) NOT NULL DEFAULT 0,
  total_saidas_especie numeric(12,2) NOT NULL DEFAULT 0,
  total_pix numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'aberta'
    CHECK (status IN ('aberta','fechada')),
  observacoes_fechamento text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. MOVIMENTAÇÕES DA CONTA (extrato virtual — imutável)
CREATE TABLE movimentacoes_conta (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  conta_id uuid NOT NULL REFERENCES contas_produtor(id),
  usuario_id uuid NOT NULL REFERENCES usuarios(id),
  sessao_caixa_id uuid REFERENCES sessoes_caixa(id),
  tipo text NOT NULL CHECK (tipo IN (
    'entrega',
    'conversao',
    'saque_especie',
    'saque_pix',
    'compra_loja',
    'ajuste_produto',
    'ajuste_financeiro',
    'estorno'
  )),
  produto_id uuid REFERENCES produtos(id),
  quantidade_produto numeric(12,3),
  preco_unitario numeric(10,2),
  valor_financeiro numeric(12,2),
  forma_pagamento text CHECK (forma_pagamento IN ('especie','pix')),
  referencia_id uuid,
  referencia_tipo text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. MOVIMENTAÇÕES DO ESTOQUE FÍSICO (log galpão — imutável)
CREATE TABLE movimentacoes_estoque_fisico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES produtos(id),
  tipo text NOT NULL CHECK (tipo IN (
    'entrada',
    'saida_entrega',
    'ajuste_positivo',
    'ajuste_negativo'
  )),
  quantidade numeric(12,3) NOT NULL,
  responsavel_id uuid NOT NULL REFERENCES usuarios(id),
  referencia_id uuid,
  referencia_tipo text,
  numero_nf text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. RETIRADAS EXTERNAS (saída física para moageira/comprador)
CREATE TABLE retiradas_externas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES produtos(id),
  responsavel_id uuid NOT NULL REFERENCES usuarios(id),
  data_retirada date NOT NULL,
  destino text NOT NULL,
  quantidade_retirada numeric(12,3) NOT NULL,
  quantidade_confirmada numeric(12,3),
  numero_nf text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. SOLICITAÇÕES DE VENDA (cooperado solicita, caixa executa)
CREATE TABLE solicitacoes_venda (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  conta_id uuid NOT NULL REFERENCES contas_produtor(id),
  produtor_id uuid NOT NULL REFERENCES produtores(id),
  cotacao_id uuid NOT NULL REFERENCES cotacoes(id),
  produto_id uuid NOT NULL REFERENCES produtos(id),
  quantidade_kg numeric(12,3) NOT NULL,
  valor_estimado numeric(12,2) NOT NULL,
  forma_pagamento text NOT NULL CHECK (forma_pagamento IN ('pix','especie')),
  chave_pix text,
  status text NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','em_analise','executada','recusada')),
  justificativa_recusa text,
  executada_por uuid REFERENCES usuarios(id),
  executada_em timestamptz,
  movimentacao_id uuid REFERENCES movimentacoes_conta(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ========================================
-- FOREIGN KEY ADICIONAL (ciclo sessoes_caixa ↔ movimentacoes_conta)
-- sessoes_caixa precisa existir antes de movimentacoes_conta,
-- mas movimentacoes_conta referencia sessoes_caixa.
-- A FK foi declarada inline acima — sem problema pois sessoes_caixa
-- é criada antes neste script.
-- ========================================

-- ========================================
-- RLS — habilitar em todas as tabelas
-- ========================================

ALTER TABLE produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE cotacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE produtores ENABLE ROW LEVEL SECURITY;
ALTER TABLE contas_produtor ENABLE ROW LEVEL SECURITY;
ALTER TABLE saldos_produto ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_fisico ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_conta ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque_fisico ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessoes_caixa ENABLE ROW LEVEL SECURITY;
ALTER TABLE retiradas_externas ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_venda ENABLE ROW LEVEL SECURITY;

-- ========================================
-- POLÍTICAS RLS
-- Padrão NexCoop: membro da org lê, admin/funcao específica escreve.
-- super_admin acessa tudo via createAdminClient() — sem política necessária.
-- ========================================

-- produtos
CREATE POLICY "org members can view produtos"
  ON produtos FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin can manage produtos"
  ON produtos FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND ('admin' = ANY(funcoes))
  ));

-- cotacoes
CREATE POLICY "org members can view cotacoes"
  ON cotacoes FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin financeiro can manage cotacoes"
  ON cotacoes FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND (funcoes && ARRAY['admin','financeiro'])
  ));

-- produtores
CREATE POLICY "org members can view produtores"
  ON produtores FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin caixa_cacau tecnico can manage produtores"
  ON produtores FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND (funcoes && ARRAY['admin','caixa_cacau','tecnico'])
  ));

-- contas_produtor
CREATE POLICY "org members can view contas_produtor"
  ON contas_produtor FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin caixa_cacau can manage contas_produtor"
  ON contas_produtor FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND (funcoes && ARRAY['admin','caixa_cacau'])
  ));

-- saldos_produto
CREATE POLICY "org members can view saldos_produto"
  ON saldos_produto FOR SELECT
  USING (conta_id IN (
    SELECT id FROM contas_produtor
    WHERE organizacao_id IN (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  ));

CREATE POLICY "admin caixa_cacau can manage saldos_produto"
  ON saldos_produto FOR ALL
  USING (conta_id IN (
    SELECT id FROM contas_produtor
    WHERE organizacao_id IN (
      SELECT organizacao_id FROM usuarios
      WHERE id = auth.uid()
      AND (funcoes && ARRAY['admin','caixa_cacau'])
    )
  ));

-- estoque_fisico
CREATE POLICY "org members can view estoque_fisico"
  ON estoque_fisico FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin caixa_cacau tecnico can manage estoque_fisico"
  ON estoque_fisico FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND (funcoes && ARRAY['admin','caixa_cacau','tecnico'])
  ));

-- movimentacoes_conta
CREATE POLICY "org members can view movimentacoes_conta"
  ON movimentacoes_conta FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin caixa_cacau can insert movimentacoes_conta"
  ON movimentacoes_conta FOR INSERT
  WITH CHECK (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND (funcoes && ARRAY['admin','caixa_cacau'])
  ));

-- movimentacoes_estoque_fisico
CREATE POLICY "org members can view movimentacoes_estoque_fisico"
  ON movimentacoes_estoque_fisico FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin caixa_cacau tecnico can insert movimentacoes_estoque_fisico"
  ON movimentacoes_estoque_fisico FOR INSERT
  WITH CHECK (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND (funcoes && ARRAY['admin','caixa_cacau','tecnico'])
  ));

-- sessoes_caixa
CREATE POLICY "org members can view sessoes_caixa"
  ON sessoes_caixa FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "caixa_cacau admin can manage sessoes_caixa"
  ON sessoes_caixa FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND (funcoes && ARRAY['admin','caixa_cacau'])
  ));

-- retiradas_externas
CREATE POLICY "org members can view retiradas_externas"
  ON retiradas_externas FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin financeiro can manage retiradas_externas"
  ON retiradas_externas FOR ALL
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND (funcoes && ARRAY['admin','financeiro'])
  ));

-- solicitacoes_venda
CREATE POLICY "produtor can view own solicitacoes"
  ON solicitacoes_venda FOR SELECT
  USING (
    organizacao_id IN (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "cooperado can insert solicitacoes_venda"
  ON solicitacoes_venda FOR INSERT
  WITH CHECK (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "admin caixa_cacau can update solicitacoes_venda"
  ON solicitacoes_venda FOR UPDATE
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND (funcoes && ARRAY['admin','caixa_cacau'])
  ));

-- ========================================
-- FUNÇÃO: nova funcao caixa_cacau
-- ========================================

INSERT INTO funcoes_disponiveis (funcao, descricao)
VALUES ('caixa_cacau', 'Registra pesagem, movimenta contas de produtores e opera o caixa do módulo de comercialização')
ON CONFLICT (funcao) DO NOTHING;

-- ========================================
-- DADOS INICIAIS: produtos padrão cacau para COOPAIBI
-- (apenas para a organização de teste — remover em produção ou tornar opcional)
-- ========================================

-- NÃO inserir dados hardcoded aqui.
-- Produtos serão cadastrados pelo admin de cada org via interface.

-- ========================================
-- TRIGGERS: atualizar saldos automaticamente
-- ========================================

-- Trigger: atualizar estoque_fisico ao inserir movimentacao_estoque_fisico
CREATE OR REPLACE FUNCTION fn_atualizar_estoque_fisico()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO estoque_fisico (organizacao_id, produto_id, quantidade, ultima_atualizacao)
  VALUES (NEW.organizacao_id, NEW.produto_id, 0, now())
  ON CONFLICT (organizacao_id, produto_id) DO NOTHING;

  IF NEW.tipo IN ('entrada', 'ajuste_positivo') THEN
    UPDATE estoque_fisico
    SET quantidade = quantidade + NEW.quantidade,
        ultima_atualizacao = now()
    WHERE organizacao_id = NEW.organizacao_id
      AND produto_id = NEW.produto_id;
  ELSE
    UPDATE estoque_fisico
    SET quantidade = quantidade - NEW.quantidade,
        ultima_atualizacao = now()
    WHERE organizacao_id = NEW.organizacao_id
      AND produto_id = NEW.produto_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_estoque_fisico
  AFTER INSERT ON movimentacoes_estoque_fisico
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_estoque_fisico();

-- Trigger: atualizar saldos_produto e saldo_financeiro ao inserir movimentacao_conta
CREATE OR REPLACE FUNCTION fn_atualizar_saldos_conta()
RETURNS TRIGGER AS $$
BEGIN
  -- Movimentações que alteram saldo de produto
  IF NEW.tipo = 'entrega' AND NEW.produto_id IS NOT NULL THEN
    INSERT INTO saldos_produto (conta_id, produto_id, quantidade)
    VALUES (NEW.conta_id, NEW.produto_id, 0)
    ON CONFLICT (conta_id, produto_id) DO NOTHING;

    UPDATE saldos_produto
    SET quantidade = quantidade + NEW.quantidade_produto
    WHERE conta_id = NEW.conta_id AND produto_id = NEW.produto_id;
  END IF;

  IF NEW.tipo IN ('conversao', 'ajuste_produto') AND NEW.produto_id IS NOT NULL THEN
    UPDATE saldos_produto
    SET quantidade = quantidade - NEW.quantidade_produto
    WHERE conta_id = NEW.conta_id AND produto_id = NEW.produto_id;
  END IF;

  -- Movimentações que alteram saldo financeiro
  IF NEW.tipo = 'conversao' AND NEW.valor_financeiro IS NOT NULL THEN
    UPDATE contas_produtor
    SET saldo_financeiro = saldo_financeiro + NEW.valor_financeiro
    WHERE id = NEW.conta_id;
  END IF;

  IF NEW.tipo IN ('saque_especie','saque_pix','compra_loja') AND NEW.valor_financeiro IS NOT NULL THEN
    UPDATE contas_produtor
    SET saldo_financeiro = saldo_financeiro - ABS(NEW.valor_financeiro)
    WHERE id = NEW.conta_id;
  END IF;

  IF NEW.tipo = 'ajuste_financeiro' AND NEW.valor_financeiro IS NOT NULL THEN
    UPDATE contas_produtor
    SET saldo_financeiro = saldo_financeiro + NEW.valor_financeiro
    WHERE id = NEW.conta_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_atualizar_saldos_conta
  AFTER INSERT ON movimentacoes_conta
  FOR EACH ROW EXECUTE FUNCTION fn_atualizar_saldos_conta();

-- Trigger: criar conta automaticamente ao cadastrar produtor
CREATE OR REPLACE FUNCTION fn_criar_conta_produtor()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO contas_produtor (organizacao_id, produtor_id)
  VALUES (NEW.organizacao_id, NEW.id)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_criar_conta_produtor
  AFTER INSERT ON produtores
  FOR EACH ROW EXECUTE FUNCTION fn_criar_conta_produtor();
