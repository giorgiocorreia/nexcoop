-- Migration 091: Eventos de NF-e (CC-e) + parâmetros de diferimento do ICMS
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-30
--
-- Duas mudanças, ambas da NF-e de SAÍDA da comercialização (vendas_externas):
--
-- 1) organizacoes ganha os parâmetros do diferimento do ICMS. A NF-e de saída
--    passa de CST 41 (não tributada) para CST 51 (diferimento). O CST 51 exige
--    declarar vICMSOp (ICMS que seria devido), pDif (% diferido) e vICMSDif
--    (valor diferido) no item — e o vICMSDif TEM que ser exatamente
--    vICMSOp × pDif, senão a SEFAZ devolve rejeição 352.
--    Com pDif = 100% o valor a recolher é sempre zero, então a alíquota é
--    apenas declaratória; fica configurável para o contador ajustar sem deploy.
--
-- 2) nfe_eventos: histórico dos eventos pós-autorização da NF-e (hoje só
--    carta de correção; cancelamento fica preparado para migrar pra cá depois).
--    Antes disso não havia registro nenhum de CC-e no banco — o PDF só existia
--    na Focus.
-- ============================================================================

-- 1. Parâmetros de diferimento do ICMS na saída da comercialização
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS com_nfe_saida_aliquota_icms   numeric(5,2) NOT NULL DEFAULT 20.50,
  ADD COLUMN IF NOT EXISTS com_nfe_saida_perc_diferimento numeric(5,2) NOT NULL DEFAULT 100.00;

COMMENT ON COLUMN organizacoes.com_nfe_saida_aliquota_icms IS
  'Alíquota interna de ICMS (%) declarada no item da NF-e de saída da comercialização (CST 51). Padrão 20,50 = alíquota modal da Bahia em 2026. Com diferimento de 100% nada é recolhido, então este número é declaratório (compõe vICMSOp e vICMSDif) — mas precisa refletir a alíquota real do produto para a nota não ficar inconsistente com a escrita fiscal.';

COMMENT ON COLUMN organizacoes.com_nfe_saida_perc_diferimento IS
  'Percentual de diferimento (pDif) do ICMS na NF-e de saída, CST 51. 100 = diferimento total (vICMS = 0). Valores menores geram ICMS devido na própria nota: vICMS = vICMSOp - vICMSDif.';

-- 2. Eventos pós-autorização da NF-e de saída
CREATE TABLE IF NOT EXISTS nfe_eventos (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id   uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  venda_id         uuid NOT NULL REFERENCES vendas_externas(id) ON DELETE CASCADE,
  tipo             text NOT NULL CHECK (tipo IN ('carta_correcao', 'cancelamento')),
  referencia       text NOT NULL,
  chave_nfe        text,
  sequencia        integer,
  texto            text NOT NULL,
  status           text NOT NULL DEFAULT 'erro'
                     CHECK (status IN ('registrado', 'erro')),
  xml_url          text,
  pdf_url          text,
  mensagem_sefaz   text,
  criado_por       uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE nfe_eventos IS
  'Histórico de eventos pós-autorização das NF-e de saída da comercialização (vendas_externas). Uma linha por TENTATIVA, inclusive as que falharam (status=erro) — o registro do que foi enviado à SEFAZ é a razão de existir da tabela, então nada é apagado nem sobrescrito em caso de falha.';

COMMENT ON COLUMN nfe_eventos.sequencia IS
  'Número sequencial do evento na SEFAZ (nSeqEvento). Para CC-e é o número da carta: a mesma NF-e aceita até 20 cartas, cada uma SUBSTITUI as anteriores — a carta válida é sempre a de maior sequência.';

COMMENT ON COLUMN nfe_eventos.texto IS
  'Texto enviado: a correção (CC-e) ou a justificativa (cancelamento). Guardado como enviado à SEFAZ, após normalização.';

COMMENT ON COLUMN nfe_eventos.status IS
  'registrado = aceito pela SEFAZ; erro = rejeitado ou falha de comunicação (detalhe em mensagem_sefaz). Default é erro de propósito: uma linha só vira "registrado" quando a resposta da SEFAZ confirmar.';

CREATE INDEX IF NOT EXISTS idx_nfe_eventos_venda
  ON nfe_eventos (venda_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_nfe_eventos_org
  ON nfe_eventos (organizacao_id, criado_em DESC);

ALTER TABLE nfe_eventos ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da própria org
CREATE POLICY "membros leem eventos de nfe da propria org" ON nfe_eventos
  FOR SELECT USING (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

-- Escrita: nenhuma policy. Emitir evento fiscal é ato de servidor — passa
-- sempre por createAdminClient() na server action, que valida org e permissão
-- antes de chamar a SEFAZ. Cliente logado nunca insere aqui direto.

-- ============================================================================
-- Rollback (comentado):
-- DROP POLICY IF EXISTS "membros leem eventos de nfe da propria org" ON nfe_eventos;
-- DROP TABLE IF EXISTS nfe_eventos;
-- ALTER TABLE organizacoes
--   DROP COLUMN IF EXISTS com_nfe_saida_aliquota_icms,
--   DROP COLUMN IF EXISTS com_nfe_saida_perc_diferimento;
