-- Migration 018: Configurações Contábeis + Fechamento de Exercício

-- Configurações contábeis da org (percentuais REFAC, Fundo de Reserva, etc.)
CREATE TABLE configuracoes_contabeis (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE UNIQUE,
  percentual_fundo_reserva NUMERIC(5,2) NOT NULL DEFAULT 10.00,
  percentual_refac NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  percentual_fates NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  criterio_distribuicao TEXT NOT NULL DEFAULT 'proporcional_operacoes'
    CHECK (criterio_distribuicao IN ('proporcional_operacoes','proporcional_cotas','igualitario')),
  observacoes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Registro de fechamento de exercício
CREATE TABLE fechamentos_exercicio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  exercicio_id UUID NOT NULL REFERENCES exercicios_contabeis(id) ON DELETE CASCADE UNIQUE,
  sobras_brutas NUMERIC(15,2) NOT NULL DEFAULT 0,
  fundo_reserva NUMERIC(15,2) NOT NULL DEFAULT 0,
  refac NUMERIC(15,2) NOT NULL DEFAULT 0,
  fates NUMERIC(15,2) NOT NULL DEFAULT 0,
  sobras_distribuiveis NUMERIC(15,2) NOT NULL DEFAULT 0,
  fechado_por UUID NOT NULL REFERENCES auth.users(id),
  fechado_por_perfil TEXT NOT NULL CHECK (fechado_por_perfil IN ('contador','admin')),
  crc_contador TEXT,
  hash_fechamento TEXT NOT NULL,
  observacoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE configuracoes_contabeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE fechamentos_exercicio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_acessa_config_contabil" ON configuracoes_contabeis FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
  OR org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);

CREATE POLICY "org_acessa_fechamentos" ON fechamentos_exercicio FOR ALL USING (
  org_id IN (SELECT org_id FROM usuarios WHERE id = auth.uid())
  OR org_id IN (SELECT org_id FROM contador_org WHERE usuario_id = auth.uid() AND ativo = TRUE)
);
