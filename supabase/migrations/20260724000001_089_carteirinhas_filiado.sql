-- Migration 089: Carteirinha de identificação do filiado (cooperado_carteirinhas)
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-07-24
--
-- Carteirinha física (PDF) e digital do cooperado, com QR code de verificação
-- pública. O QR aponta para https://{slug}.nexcoop.com.br/v/{codigo} (ou
-- https://nexcoop.com.br/v/{codigo} para org sem site próprio). A página
-- pública consulta o banco AO VIVO — não há dado "congelado" na carteirinha,
-- desligar o cooperado revoga o acesso instantaneamente.
--
-- IMPORTANTE (RLS): a página pública de verificação `/v/{codigo}` NÃO usa as
-- policies abaixo — é servida via createAdminClient() no server (mesmo
-- padrão da migration 085 para o site público). O role `anon` não recebe
-- NENHUMA policy nesta tabela; toda leitura pública passa por service_role
-- no backend, nunca pelo cliente anon do navegador.
--
-- Esta migration cria só a estrutura. NÃO há backfill de emissão — gerar
-- carteirinha é ato administrativo (define validade, quem emitiu) feito pela
-- tela do admin na Fase 3, não pela migration.
--
-- Regra de negócio (NÃO decidida no schema, documentada aqui): o status
-- exibido na verificação deriva de cooperados.status (enum status_cooperado:
-- proposta/probatorio/ativo/inadimplente/suspenso/demitido/excluido) e é
-- calculado em código de aplicação, não no banco. Decisão do Giorgio
-- (24/07/2026): 'inadimplente' conta como ATIVO na carteirinha — vínculo é
-- vínculo, situação financeira não é exposta a terceiros que escaneiam o QR.
-- ============================================================================

CREATE TABLE IF NOT EXISTS cooperado_carteirinhas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id    uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  cooperado_id      uuid NOT NULL REFERENCES cooperados(id) ON DELETE CASCADE,
  codigo            text NOT NULL UNIQUE
                      CHECK (codigo ~ '^[A-Za-z0-9]{12}$'),
  via               integer NOT NULL DEFAULT 1 CHECK (via >= 1),
  emitida_em        timestamptz NOT NULL DEFAULT now(),
  valida_ate        date,
  revogada_em       timestamptz,
  motivo_revogacao  text,
  emitida_por       uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  criado_em         timestamptz NOT NULL DEFAULT now(),
  atualizado_em     timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE cooperado_carteirinhas IS
  'Carteirinha de identificação do filiado (física em PDF e digital), com QR code de verificação pública ao vivo. Cada linha é UMA via emitida; a 2ª via exige revogar a anterior primeiro (ver índice único parcial uq_carteirinha_ativa_por_cooperado). A verificação em /v/{codigo} sempre consulta o vínculo atual do cooperado — a carteirinha não "congela" status nenhum.';

COMMENT ON COLUMN cooperado_carteirinhas.codigo IS
  'Token opaco de verificação que vai na URL do QR (/v/{codigo}). Gerado aleatório (12 alfanuméricos), NUNCA o UUID do cooperado nem o CPF — evita enumeração de registros e vazamento de PII pela URL pública. O UNIQUE já cria o índice de lookup usado pela página de verificação.';

COMMENT ON COLUMN cooperado_carteirinhas.via IS
  'Numeração da via (1ª via, 2ª via por perda/dano etc.) — apenas informativo, não afeta a validação.';

COMMENT ON COLUMN cooperado_carteirinhas.valida_ate IS
  'Validade impressa no cartão físico (prazo esperado de renovação). NULL = sem prazo impresso. A autoridade final da verificação é sempre o status ao vivo consultado no banco (cooperados.status + revogada_em) — esta data apenas antecipa visualmente um vencimento esperado, não revoga nada por si só.';

COMMENT ON COLUMN cooperado_carteirinhas.revogada_em IS
  'Quando preenchida, esta via está revogada (perda, 2ª via emitida, desligamento do cooperado etc.) e a verificação pública deve exibir carteirinha inválida independente de valida_ate.';

COMMENT ON COLUMN cooperado_carteirinhas.emitida_por IS
  'Usuário admin que emitiu esta via (auditoria). ON DELETE SET NULL — não perder o histórico da carteirinha se o usuário emissor for removido.';

-- Índice único parcial: no máximo UMA carteirinha ATIVA (não revogada) por
-- cooperado. Emitir 2ª via exige revogar a anterior antes (revogada_em NOT NULL),
-- senão o INSERT da nova via colide com este índice.
CREATE UNIQUE INDEX IF NOT EXISTS uq_carteirinha_ativa_por_cooperado
  ON cooperado_carteirinhas (cooperado_id)
  WHERE revogada_em IS NULL;

CREATE INDEX IF NOT EXISTS idx_carteirinhas_org_cooperado
  ON cooperado_carteirinhas (organizacao_id, cooperado_id);

-- O UNIQUE de `codigo` já cria o índice usado no lookup da página pública
-- (WHERE codigo = $1) — nenhum índice adicional necessário para isso.

CREATE TRIGGER trg_carteirinhas_atualizado
  BEFORE UPDATE ON cooperado_carteirinhas
  FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

ALTER TABLE cooperado_carteirinhas ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da própria org (painel interno). A página pública
-- /v/{codigo} NÃO passa por aqui — ver nota no topo do arquivo.
CREATE POLICY "membros leem carteirinhas da propria org" ON cooperado_carteirinhas
  FOR SELECT USING (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

-- INSERT/UPDATE/DELETE: só admin da org
CREATE POLICY "admin gerencia carteirinhas da propria org" ON cooperado_carteirinhas
  FOR ALL USING (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND funcoes && ARRAY['admin']
    )
  )
  WITH CHECK (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM usuarios
      WHERE id = auth.uid()
        AND funcoes && ARRAY['admin']
    )
  );

-- ============================================================================
-- Rollback (comentado):
-- DROP POLICY IF EXISTS "admin gerencia carteirinhas da propria org" ON cooperado_carteirinhas;
-- DROP POLICY IF EXISTS "membros leem carteirinhas da propria org" ON cooperado_carteirinhas;
-- DROP TRIGGER IF EXISTS trg_carteirinhas_atualizado ON cooperado_carteirinhas;
-- DROP TABLE IF EXISTS cooperado_carteirinhas;
