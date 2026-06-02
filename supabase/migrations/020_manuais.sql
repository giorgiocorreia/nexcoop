-- Migration 020: Configurações do Sistema + Manuais

CREATE TABLE configuracoes_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chave TEXT NOT NULL UNIQUE,
  valor TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE configuracoes_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_gerencia_config" ON configuracoes_sistema FOR ALL USING (
  EXISTS (SELECT 1 FROM usuarios WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "todos_leem_config" ON configuracoes_sistema FOR SELECT USING (true);

INSERT INTO configuracoes_sistema (chave, valor) VALUES
  ('manual_contabil_url',    null),
  ('manual_financeiro_url',  null),
  ('manual_cooperados_url',  null),
  ('manual_captacao_url',    null),
  ('manual_assembleia_url',  null),
  ('manual_documentos_url',  null);

-- Bucket de manuais (execute separadamente no Storage ou via SQL):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('manuais', 'manuais', true);
