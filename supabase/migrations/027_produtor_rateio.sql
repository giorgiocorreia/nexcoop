-- Migration 027: Expansão cadastro produtor + tabela rateio_entrega

ALTER TABLE produtores
  ADD COLUMN IF NOT EXISTS nome_propriedade text,
  ADD COLUMN IF NOT EXISTS tipo_posse text CHECK (tipo_posse IN ('proprietario', 'meeiro', 'arrendatario')),
  ADD COLUMN IF NOT EXISTS percentual_posse numeric(5,2) CHECK (percentual_posse > 0 AND percentual_posse <= 100),
  ADD COLUMN IF NOT EXISTS ie_produtor_rural text;

CREATE TABLE IF NOT EXISTS rateio_entrega (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  movimentacao_id uuid NOT NULL REFERENCES movimentacoes_conta(id) ON DELETE CASCADE,
  produtor_id uuid NOT NULL REFERENCES produtores(id) ON DELETE CASCADE,
  percentual numeric(5,2) NOT NULL CHECK (percentual > 0 AND percentual <= 100),
  quantidade_rateada numeric(12,4) NOT NULL,
  valor_rateado numeric(12,2),
  criado_em timestamptz DEFAULT now()
);

ALTER TABLE rateio_entrega ENABLE ROW LEVEL SECURITY;

CREATE POLICY "rateio_entrega_org" ON rateio_entrega
  FOR ALL USING (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_rateio_entrega_movimentacao ON rateio_entrega(movimentacao_id);
CREATE INDEX IF NOT EXISTS idx_rateio_entrega_produtor ON rateio_entrega(produtor_id);
CREATE INDEX IF NOT EXISTS idx_produtores_tipo_posse ON produtores(tipo_posse);
