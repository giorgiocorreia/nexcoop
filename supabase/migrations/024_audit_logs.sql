CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES organizacoes(id) ON DELETE SET NULL,
  usuario_id UUID,
  usuario_email TEXT,
  role TEXT,
  acao TEXT NOT NULL,
  modulo TEXT NOT NULL,
  descricao TEXT,
  dados_antes JSONB,
  dados_depois JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Somente leitura para membros da org
CREATE POLICY "org_le_seus_logs" ON audit_logs
  FOR SELECT USING (
    org_id IN (
      SELECT organizacao_id FROM usuarios
      WHERE id = auth.uid()
    )
  );

-- Somente service_role pode inserir
CREATE POLICY "service_role_insere_log" ON audit_logs
  FOR INSERT WITH CHECK (auth.role() = 'service_role');
