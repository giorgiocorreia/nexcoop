# Plano: Integração Bancária e Verificação de Pix Recebidos

**Status:** Não iniciado — documento de referência
**Criado em:** 19/07/2026

---

## Motivação

Hoje o NexCoop não enxerga as contas bancárias da cooperativa. Consequências:

- Pix recebido (mensalidade, cota, venda) precisa ser conferido manualmente no
  app do banco e baixado à mão no Financeiro.
- A tela `/financeiro/tesouraria` escritura transferências entre contas
  **hardcoded** (`cofre`, `caixa_loja`, `banco`) — cria o lançamento contábil,
  mas não reflete nem consulta saldo real de banco nenhum.
- Não existe conciliação: nada garante que o Financeiro bate com o extrato.

**Objetivo:** verificar Pix recebidos automaticamente (pagamento chega → sistema
localiza a cobrança e baixa o lançamento pendente) e conciliar extrato bancário
com os lançamentos do Financeiro.

---

## Caminhos possíveis

### 1. API Pix de um PSP/banco com webhook (o mais direto pro objetivo)

Gerar cobranças Pix (QR code / copia-e-cola) com `txid` próprio e receber
webhook quando o pagamento confirma → baixa automática do lançamento vinculado.

Candidatos:

| Provedor | Observação |
|----------|------------|
| Sicoob / Sicredi | Comuns em cooperativas; têm API Pix oficial |
| Banco Inter | API gratuita pra conta PJ |
| Efí (ex-Gerencianet) | Especializada em Pix, webhook maduro |
| Asaas / Cora / Mercado Pago | Alternativas com onboarding simples |

Exige conta PJ no provedor + credenciais/certificado **por organização**
(multi-tenant: cada coop conecta a própria conta; credenciais cifradas por org).

### 2. Open Finance via agregador (Pluggy, Belvo, Klavi)

Leitura de extrato de qualquer banco sem trocar de conta. Bom pra conciliação
geral (não só Pix), mas é polling de extrato (não webhook instantâneo) e tem
custo por conexão ativa.

### 3. Import manual de extrato OFX/CSV (degrau zero)

Upload de extrato + parser + tela de conciliação (casar linhas do extrato com
lançamentos pendentes). Sem dependência externa. A UI de conciliação construída
aqui é reaproveitada quando a fonte virar API.

---

## Sequência sugerida

1. **(3) Import OFX/CSV primeiro** — valor imediato e cria a fundação: tabelas
   (`contas_bancarias`, `extrato_bancario`, `conciliacoes`) e a tela de
   conciliação.
2. **(1) API Pix no banco que a COOPAIBI usa** — webhook pra baixa automática
   das cobranças geradas pelo sistema.
3. **(2) Open Finance** — só se surgirem muitas coops com bancos diferentes e o
   import manual virar gargalo.

---

## Pré-requisitos técnicos

- **Cadastro de contas bancárias reais por organização** — substitui os ids
  fixos da tela de tesouraria. A tesouraria passa a transferir entre contas
  cadastradas.
- **Vínculo de lançamento ↔ conta bancária ↔ identificador externo**
  (`txid` / `endToEndId` do Pix) pra conciliação idempotente — o mesmo webhook
  entregue duas vezes não pode baixar dois lançamentos.
- **Endpoint de webhook com validação** (mTLS ou assinatura, conforme o
  provedor) — seguir o padrão do webhook do WhatsApp (`app/api/whatsapp/`).
- **RLS e regras do CLAUDE.md** — writes via `createAdminClient()`, policies
  com subquery de `organizacao_id`, migrations numeradas via Dashboard.

---

## Fora de escopo (por enquanto)

- Iniciar pagamentos (Pix out) a partir do NexCoop — só leitura/recebimento.
- Boleto e cartão — já cobertos parcialmente pelo Stripe (assinaturas da
  plataforma); cobrança das coops aos filiados via boleto é outra discussão.
