-- Migration 019: Livro Diário + Distribuição de Sobras + Exportações

-- Livro Diário — registro sequencial de todos os lançamentos contábeis
CREATE TABLE livro_diario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  exercicio_id UUID NOT NULL REFERENCES exercicios_contabeis(id),
  numero_lancamento INTEGER NOT NULL,
  data_lancamento DATE NOT NULL,
  historico TEXT NOT NULL,
  partida_id UUID REFERENCES partidas(id),
  valor NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(org_id, exercicio_id, numero_lancamento)
);

-- Distribuição de sobras por cooperado
CREATE TABLE distribuicao_sobras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  fechamento_id UUID NOT NULL REFERENCES fechamentos_exercicio(id) ON DELETE CASCADE,
  cooperado_id UUID NOT NULL REFERENCES cooperados(id),
  valor_operacoes NUMERIC(15,2) DEFAULT 0,
  percentual NUMERIC(8,4) DEFAULT 0,
  valor_sobras NUMERIC(15,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'calculado' CHECK (status IN ('calculado','pago','retido')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(fechamento_id, cooperado_id)
);

-- Exportações geradas
CREATE TABLE exportacoes_contabeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('sped_ecd','livro_diario_pdf','balancete_pdf','dre_pdf','balanco_pdf','razao_pdf')),
  exercicio_id UUID REFERENCES exercicios_contabeis(id),
  periodo_inicio DATE,
  periodo_fim DATE,
  gerado_por UUID REFERENCES auth.users(id),
  tamanho_bytes INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE livro_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribuicao_sobras ENABLE ROW LEVEL SECURITY;
ALTER TABLE exportacoes_contabeis ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_acessa_livro_diario" ON livro_diario FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
  OR org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);

CREATE POLICY "org_acessa_distribuicao" ON distribuicao_sobras FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
  OR org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);

CREATE POLICY "org_acessa_exportacoes" ON exportacoes_contabeis FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
  OR org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);
