-- Migration 092: Recibos avulsos (recibos + organizacoes.ultimo_numero_recibo)
-- Aplicar via: Supabase Dashboard → SQL Editor
-- Data: 2026-08-06
--
-- Gerador de recibos da tela Impressos (/comercializacao/impressos). Recibo
-- avulso, emitido em PDF A4 com duas vias na mesma folha, numeração sequencial
-- por organização — mesmo modelo já usado em `organizacoes.ultimo_numero_ficha`
-- (Ficha de Pesagem).
--
-- POR QUE PERSISTIR: recibo é documento contábil. A tabela existe para
-- (a) garantir numeração sequencial sem buraco/repetição, (b) permitir
-- reimpressão idêntica da 2ª via, (c) auditoria de quem emitiu o quê.
--
-- O QUE É SNAPSHOT E O QUE É AO VIVO: os dados da PESSOA e do ATO
-- (nome, cpf, valor, descrição, tipo, direção) são congelados aqui — a
-- reimpressão precisa sair idêntica ao papel já assinado. O cabeçalho da
-- COOPERATIVA (razão social, CNPJ, endereço, logo) é lido AO VIVO de
-- `organizacoes` na hora de gerar o PDF: se a cooperativa mudar de endereço,
-- a reimpressão sai com o endereço atual, e isso é o comportamento correto —
-- o emitente é o mesmo CNPJ, apenas o cadastro está mais fresco.
--
-- ESTE ARQUIVO NÃO FAZ BACKFILL. Recibo é ato administrativo com pessoa,
-- valor e assinatura — não existe recibo "retroativo" a inferir de outra
-- tabela.
-- ============================================================================

-- ── Numeração sequencial por org ────────────────────────────────────────────
ALTER TABLE organizacoes
  ADD COLUMN IF NOT EXISTS ultimo_numero_recibo integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN organizacoes.ultimo_numero_recibo IS
  'Último número de recibo emitido pela org. Reservado por compare-and-swap na server action gerarRecibo (UPDATE ... WHERE ultimo_numero_recibo = <valor lido>), nunca por SELECT MAX() — dois usuários emitindo ao mesmo tempo receberiam o mesmo número. O índice uq_recibo_numero_por_org é a rede de segurança final. Independente de ultimo_numero_ficha (Ficha de Pesagem): são dois talões distintos.';

-- ── Recibos ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recibos (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organizacao_id       uuid NOT NULL REFERENCES organizacoes(id) ON DELETE CASCADE,
  numero               integer NOT NULL CHECK (numero > 0),
  tipo                 text NOT NULL CHECK (tipo IN (
                         'prestacao_servico',
                         'pagamento',
                         'aluguel',
                         'doacao',
                         'adiantamento',
                         'diaria_rural',
                         'outros'
                       )),
  direcao              text NOT NULL CHECK (direcao IN ('recebemos', 'pagamos')),
  pessoa_nome          text NOT NULL CHECK (length(btrim(pessoa_nome)) >= 3),
  pessoa_cpf           text CHECK (pessoa_cpf IS NULL OR pessoa_cpf ~ '^[0-9]{11}$|^[0-9]{14}$'),
  valor                numeric(14,2) NOT NULL CHECK (valor > 0),
  descricao            text NOT NULL CHECK (length(btrim(descricao)) >= 3),
  emitido_em           timestamptz NOT NULL DEFAULT now(),
  emitido_por          uuid REFERENCES usuarios(id) ON DELETE SET NULL,
  cancelado_em         timestamptz,
  motivo_cancelamento  text,
  criado_em            timestamptz NOT NULL DEFAULT now(),
  atualizado_em        timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE recibos IS
  'Recibos avulsos emitidos pela tela Impressos. Uma linha por recibo emitido; o PDF (2 vias A4) é sempre regenerado a partir daqui, nada de arquivo armazenado. Recibo emitido NUNCA é editado nem apagado — errou, cancela (cancelado_em) e emite outro, preservando o número queimado.';

COMMENT ON COLUMN recibos.numero IS
  'Sequencial por organização, reservado em organizacoes.ultimo_numero_recibo. Único por org (uq_recibo_numero_por_org). Números de recibos cancelados permanecem queimados — a sequência não é reaproveitada.';

COMMENT ON COLUMN recibos.direcao IS
  'Quem recebeu o dinheiro, e portanto o texto impresso: "recebemos" = a cooperativa recebeu da pessoa ("Recebemos de FULANO a quantia de..."); "pagamos" = a pessoa recebeu da cooperativa ("Recebi da COOPERATIVA a quantia de..."). Derivado do tipo em lib/pdf/recibo-utils.ts (DIRECAO_PADRAO), mas gravado aqui porque a reimpressão precisa sair idêntica mesmo que a regra padrão do tipo mude depois.';

COMMENT ON COLUMN recibos.pessoa_cpf IS
  'Só dígitos, sem máscara: 11 (CPF) ou 14 (CNPJ). NULL permitido — recibo de pessoa sem documento à mão ainda é recibo válido; a máscara é aplicada na exibição/PDF, nunca gravada.';

COMMENT ON COLUMN recibos.valor IS
  'Valor em reais. O valor por extenso NÃO é gravado — é derivado deste campo em lib/pdf/recibo-utils.ts a cada geração, para não existirem duas fontes de verdade que possam divergir.';

COMMENT ON COLUMN recibos.emitido_em IS
  'Data/hora da emissão — é ela que sai impressa como data do recibo, não criado_em. Campos separados de propósito: se um dia a emissão passar a aceitar data retroativa, criado_em continua registrando quando a linha realmente entrou no banco (auditoria).';

COMMENT ON COLUMN recibos.cancelado_em IS
  'Quando preenchida, o recibo está cancelado e não deve ser reimpresso como válido. O número continua consumido (ver comentário de numero).';

-- Sequencial sem repetição dentro da org
CREATE UNIQUE INDEX IF NOT EXISTS uq_recibo_numero_por_org
  ON recibos (organizacao_id, numero);

-- Listagem da tela: recibos da org, mais recentes primeiro
CREATE INDEX IF NOT EXISTS idx_recibos_org_emitido
  ON recibos (organizacao_id, emitido_em DESC);

CREATE TRIGGER trg_recibos_atualizado
  BEFORE UPDATE ON recibos
  FOR EACH ROW EXECUTE FUNCTION trg_set_atualizado_em();

ALTER TABLE recibos ENABLE ROW LEVEL SECURITY;

-- SELECT: membros da própria org (histórico/reimpressão na tela Impressos).
CREATE POLICY "membros leem recibos da propria org" ON recibos
  FOR SELECT USING (
    organizacao_id = (select organizacao_id from usuarios where id = auth.uid())
  );

-- NENHUMA policy de escrita: emitir recibo consome numeração sequencial e é
-- sempre ato de servidor, via createAdminClient() na server action gerarRecibo.
-- Escrita direta pelo cliente furaria a reserva atômica do número.

-- ============================================================================
-- Rollback (comentado):
-- DROP POLICY IF EXISTS "membros leem recibos da propria org" ON recibos;
-- DROP TRIGGER IF EXISTS trg_recibos_atualizado ON recibos;
-- DROP TABLE IF EXISTS recibos;
-- ALTER TABLE organizacoes DROP COLUMN IF EXISTS ultimo_numero_recibo;
