-- Migration 030: Comprovante de Pagamento ao Produtor
CREATE TABLE IF NOT EXISTS comprovantes_pagamento (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id       UUID NOT NULL REFERENCES organizacoes(id),
  movimentacao_id      UUID NOT NULL REFERENCES movimentacoes_conta(id),
  numero_sequencial    INTEGER NOT NULL,
  status               TEXT NOT NULL DEFAULT 'emitido'
                         CHECK (status IN ('emitido','cancelado')),
  snapshot             JSONB NOT NULL DEFAULT '{}',
  emitido_por          UUID REFERENCES usuarios(id),
  emitido_em           TIMESTAMPTZ DEFAULT now(),
  cancelado_em         TIMESTAMPTZ,
  cancelado_por        UUID REFERENCES usuarios(id),
  motivo_cancelamento  TEXT,
  created_at           TIMESTAMPTZ DEFAULT now(),

  UNIQUE (organizacao_id, numero_sequencial),
  UNIQUE (movimentacao_id)
);

CREATE INDEX IF NOT EXISTS idx_comprovantes_pagamento_org
  ON comprovantes_pagamento(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_comprovantes_pagamento_mov
  ON comprovantes_pagamento(movimentacao_id);
CREATE INDEX IF NOT EXISTS idx_comprovantes_pagamento_status
  ON comprovantes_pagamento(status);

-- Sequência por organização
CREATE OR REPLACE FUNCTION proximo_numero_comprovante_pagamento(p_org_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_next INTEGER;
BEGIN
  SELECT COALESCE(MAX(numero_sequencial), 0) + 1
    INTO v_next
    FROM comprovantes_pagamento
   WHERE organizacao_id = p_org_id;
  RETURN v_next;
END;
$$;

-- RLS
ALTER TABLE comprovantes_pagamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_select_comprovantes_pagamento"
  ON comprovantes_pagamento FOR SELECT
  USING (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_insert_comprovantes_pagamento"
  ON comprovantes_pagamento FOR INSERT
  WITH CHECK (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );

CREATE POLICY "org_update_comprovantes_pagamento"
  ON comprovantes_pagamento FOR UPDATE
  USING (
    organizacao_id = (
      SELECT organizacao_id FROM usuarios WHERE id = auth.uid()
    )
  );
