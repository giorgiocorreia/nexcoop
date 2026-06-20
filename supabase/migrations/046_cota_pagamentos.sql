-- ============================================================
-- Migration 046: Pagamentos de Cotas de Cooperados
-- ============================================================

CREATE TABLE IF NOT EXISTS public.cota_pagamentos (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cota_id          UUID NOT NULL REFERENCES public.cotas_cooperado(id) ON DELETE CASCADE,
  cooperado_id     UUID NOT NULL REFERENCES public.cooperados(id) ON DELETE CASCADE,
  organizacao_id   UUID NOT NULL REFERENCES public.organizacoes(id) ON DELETE CASCADE,
  valor_total_cota NUMERIC(14,2) NOT NULL,
  valor_pago       NUMERIC(14,2) NOT NULL CHECK (valor_pago > 0),
  forma_pagamento  TEXT NOT NULL CHECK (forma_pagamento IN ('dinheiro','pix','cartao','promessa')),
  data_pagamento   DATE NULL,
  data_vencimento  DATE NULL,
  status           TEXT NOT NULL DEFAULT 'pendente'
                   CHECK (status IN ('pago','pendente','vencido')),
  numero_parcela   INTEGER NOT NULL DEFAULT 1,
  total_parcelas   INTEGER NOT NULL DEFAULT 1,
  registrado_por   UUID NULL REFERENCES public.usuarios(id) ON DELETE SET NULL,
  observacoes      TEXT NULL,
  criado_em        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_pagamento_data CHECK (
    (forma_pagamento = 'promessa' AND data_vencimento IS NOT NULL)
    OR
    (forma_pagamento != 'promessa' AND data_pagamento IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_cota_pagamentos_cota       ON public.cota_pagamentos(cota_id);
CREATE INDEX IF NOT EXISTS idx_cota_pagamentos_cooperado  ON public.cota_pagamentos(cooperado_id);
CREATE INDEX IF NOT EXISTS idx_cota_pagamentos_org        ON public.cota_pagamentos(organizacao_id);
CREATE INDEX IF NOT EXISTS idx_cota_pagamentos_status     ON public.cota_pagamentos(status);
CREATE INDEX IF NOT EXISTS idx_cota_pagamentos_vencimento ON public.cota_pagamentos(data_vencimento);

ALTER TABLE public.cota_pagamentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_cota_pagamentos" ON public.cota_pagamentos
  USING (organizacao_id = (
    SELECT organizacao_id FROM public.usuarios WHERE id = auth.uid()
  ));
