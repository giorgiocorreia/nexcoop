CREATE TABLE plano_contas_escritorio (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas_parceiras(id) ON DELETE CASCADE,
  codigo TEXT NOT NULL,
  nome TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('ATIVO','PASSIVO','PATRIMONIO_LIQUIDO','RECEITA','DESPESA')),
  nivel INTEGER NOT NULL DEFAULT 1,
  aceita_lancamento BOOLEAN NOT NULL DEFAULT TRUE,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(empresa_id, codigo)
);

ALTER TABLE plano_contas_escritorio ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parceiro_acessa_plano_escritorio" ON plano_contas_escritorio FOR ALL USING (
  empresa_id IN (
    SELECT empresa_id FROM profissionais_parceiros
    WHERE usuario_id = auth.uid() AND ativo = TRUE
  )
);

CREATE POLICY "service_role_plano_escritorio" ON plano_contas_escritorio FOR ALL USING (
  auth.role() = 'service_role'
);
