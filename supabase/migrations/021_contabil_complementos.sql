-- Migration 021: Conciliação Bancária + Calendário de Obrigações

-- Extratos bancários importados
CREATE TABLE extratos_bancarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  banco TEXT NOT NULL,
  agencia TEXT,
  conta TEXT,
  data_inicio DATE NOT NULL,
  data_fim DATE NOT NULL,
  saldo_inicial NUMERIC(15,2) DEFAULT 0,
  saldo_final NUMERIC(15,2) DEFAULT 0,
  total_creditos NUMERIC(15,2) DEFAULT 0,
  total_debitos NUMERIC(15,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'importado' CHECK (status IN ('importado','conciliado','divergente')),
  importado_por UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens do extrato
CREATE TABLE extrato_itens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  extrato_id UUID NOT NULL REFERENCES extratos_bancarios(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC(15,2) NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('credito','debito')),
  documento TEXT,
  lancamento_id UUID REFERENCES lancamentos(id),
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','conciliado','ignorado')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Calendário de obrigações acessórias
CREATE TABLE obrigacoes_acessorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  periodicidade TEXT NOT NULL CHECK (periodicidade IN ('mensal','trimestral','semestral','anual')),
  dia_vencimento INTEGER NOT NULL,
  responsavel TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ocorrências do calendário
CREATE TABLE obrigacoes_ocorrencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  obrigacao_id UUID NOT NULL REFERENCES obrigacoes_acessorias(id) ON DELETE CASCADE,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','entregue','atrasada')),
  entregue_em TIMESTAMPTZ,
  observacao TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, obrigacao_id, data_vencimento)
);

ALTER TABLE extratos_bancarios    ENABLE ROW LEVEL SECURITY;
ALTER TABLE extrato_itens         ENABLE ROW LEVEL SECURITY;
ALTER TABLE obrigacoes_acessorias ENABLE ROW LEVEL SECURITY;
ALTER TABLE obrigacoes_ocorrencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_acessa_extratos" ON extratos_bancarios FOR ALL USING (
  org_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  OR org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);

CREATE POLICY "org_acessa_extrato_itens" ON extrato_itens FOR ALL USING (
  extrato_id IN (
    SELECT id FROM extratos_bancarios WHERE org_id IN (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  )
);

CREATE POLICY "org_acessa_obrigacoes" ON obrigacoes_acessorias FOR ALL USING (
  org_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  OR org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);

CREATE POLICY "org_acessa_ocorrencias" ON obrigacoes_ocorrencias FOR ALL USING (
  org_id IN (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  OR org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);
