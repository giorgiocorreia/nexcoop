ALTER TABLE sessoes_caixa
  ADD COLUMN IF NOT EXISTS snapshot_estoque jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS saldo_especie_calculado numeric(12,2) DEFAULT 0;

CREATE TABLE IF NOT EXISTS aportes_sangrias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  sessao_caixa_id uuid NOT NULL REFERENCES sessoes_caixa(id) ON DELETE CASCADE,
  tipo text NOT NULL CHECK (tipo IN ('aporte', 'sangria')),
  valor numeric(12,2) NOT NULL CHECK (valor > 0),
  autorizado_por uuid NOT NULL REFERENCES usuarios(id),
  executado_por uuid NOT NULL REFERENCES usuarios(id),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE aportes_sangrias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members can view aportes_sangrias"
  ON aportes_sangrias FOR SELECT
  USING (organizacao_id IN (
    SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
  ));

CREATE POLICY "caixa_cacau admin can insert aportes_sangrias"
  ON aportes_sangrias FOR INSERT
  WITH CHECK (organizacao_id IN (
    SELECT organizacao_id FROM usuarios
    WHERE id = auth.uid()
    AND (funcoes && ARRAY['admin','caixa_cacau'])
  ));

CREATE INDEX IF NOT EXISTS idx_aportes_sangrias_sessao ON aportes_sangrias(sessao_caixa_id);
CREATE INDEX IF NOT EXISTS idx_aportes_sangrias_org ON aportes_sangrias(organizacao_id);
