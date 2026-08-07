# NexCoop — Status dos Módulos

## Status geral

| Módulo | Status | Última atualização |
|---|---|---|
| Autenticação / Onboarding | ✅ Completo | — |
| Cooperados / Filiados | ✅ Completo | 24/07/2026 — foto do cooperado (bucket `avatares`) + card de carteirinha na ficha + emissão/impressão em lote na lista |
| Tesouraria (continuidade + transferência entre caixas + custódia) | ✅ Completo | 06/08/2026 — leitura de saldo da Loja passa a preferir o caixa **aberto** (migration 094); antes pegava o mais recente e o saldo herdado saía do caixa errado |
| Financeiro / Assembleias / Documentos / Mensalidades | ✅ Completo | 04/07/2026 — UI redesign |
| Stripe (modo teste) | ✅ Completo | — |
| Super Admin | ✅ Completo | 04/07/2026 — UI redesign |
| Captação (CRM/Kanban + Radar CAR/Bahia) | ✅ Completo | 04/07/2026 — UI redesign |
| Contábil (migrations 015–024, 061; 13 telas) | ✅ Completo | 04/07/2026 — UI + classificação automática |
| Comercialização / Caixa Cacau | ✅ Completo | 06/08/2026 — gerador de recibos em Impressos (migrations 092/093) |
| NF-e entrada via Focus NFe | ✅ Produção | 16/07/2026 — emitindo em produção (não homologação) |
| Dashboard Admin (cotação cacau + TradingView) | ✅ Completo | 04/07/2026 — UI redesign |
| Audit logs | ✅ Completo | 04/07/2026 — UI redesign |
| Gestão de usuários | ✅ Completo | 04/07/2026 — UI redesign |
| Loja Agropecuária Fases 0–5 | ✅ Completo | 06/08/2026 — blindagem do caixa (migration 094): 1 aberto por operador, abertura idempotente, validação na sangria |
| Loja Agropecuária Fase 6 (fiscal) | 🔄 Parcial | 23/06/2026 |
| Escritório (portal contador) | ✅ Completo | 04/07/2026 — UI redesign |
| Landing page | ✅ Completo | 04/07/2026 |
| Carteirinha de identificação | ✅ Completo | 24/07/2026 — migration 089; QR de verificação ao vivo (`/v/{codigo}`), PDF individual A4 e lote 4/folha, emissão individual e em lote, recorte de foto 3:4 |
| Portal do Filiado | ✅ MVP | 24/07/2026 — `/filiado`: saldo + extrato PDF, carteirinha digital com QR e upload da própria foto; cotas/documentos/assembleias pendentes |
| Fluxo de Saque / Vendas Comercialização | ✅ Completo | 16/07/2026 — `registrarConversaoESaque` + `/comercializacao/vendas` |

## UI — Design System (jul/2026)

Todos os módulos usam o kit em `components/nexcoop/ui/`:
- `PageLayout`, `HubStyles`, `KpiCard`, `LinkCard`, `ContentCard`, `COM_C`
- Constantes: `MODULO_NEXCOOP`, `MODULO_LOJA`, `MODULO_CONTABIL`, `MODULO_CAPTACAO`, `MODULO_CONFIG`, `MODULO_ESCRITORIO`
- Exceção: PDV (`/loja/pdv`) mantém layout full-screen próprio

## Loja Agropecuária — Fase 6 (em andamento)

### Blindagem do caixa (migration 094, 06/08/2026)
Paridade com o caixa da Comercialização. A continuidade (fechamento de hoje =
abertura de amanhã) já existia; faltavam as travas que impedem ela de ler o
caixa errado — ver `docs/comercializacao.md` §1.0 para o lado espelhado.
- **1 caixa aberto por operador** (`loja_caixas_unico_aberto_por_usuario`).
  Loja e Comercialização seguem **independentes**: o mesmo usuário pode ter os
  dois abertos ao mesmo tempo
- `getSaldoResponsabilidadeLoja` passa a **preferir o caixa aberto** em vez do
  mais recente — com órfão aberto + fechamento posterior o saldo herdado saía
  do caixa errado
- `abrirCaixaLoja` **idempotente** (devolve `jaAberto` em vez de erro); fim do
  `.maybeSingle()` que errava com 2 caixas abertos e virava "caixa fechado"
- `registrarSangriaLoja` valida org, status e titularidade do caixa
- `loja_sangrias.forma_pagamento`: só aporte em **espécie** é cédula na gaveta
- Aporte simples no PDV **não pede autorização**; sangria e transferência sim

### Concluído (23/06/2026)
- Migration 040: NCM/CFOP em loja_produtos, colunas fiscais em organizacoes, loja_notas_fiscais
- Migration 041: campos de pagamento completo em loja_vendas
- Migration 042: conferência de caixa (status_conferencia, valor_fisico_*, conferido_por)
- Migration 043: loja_unidades (unidades dinâmicas, remove CHECK fixo)
- Migration 044: campos fiscais em loja_compras (chave_acesso_nfe, serie_nfe, data_emissao_nfe, emitente_nfe, cnpj_emitente, valor_nfe, status_nfe)
- ModalNotaFiscal: UI completa no PDV pós-venda
- Badge de nota no Rel. Vendas
- ModalFechamentoCaixa: checklist com valores físicos (espécie, débito, crédito) + lista PIX
- Tela /loja/conferencia: gerente confere sessões
- Action conferirCaixa
- Relatórios loja: todos usando adminClient (RLS corrigido)
- Joins loja_caixas→usuarios desambiguados
- Campo de pesquisa de fornecedor com cadastro rápido inline (Nova Compra)
- Campo de pesquisa de produto com link para cadastro (Nova Compra)
- PDV: lista de produtos em linhas (em vez de grid de cards)
- Unidades dinâmicas: tela /loja/unidades, select dinâmico em produtos
- Cancelamento de compra com estorno de estoque
- Edição inline de unidades
- Botão Editar na listagem de produtos
- Tela Entradas NF-e (/loja/entradas) — KPIs, tabela com status fiscal, modal vincular com consulta SEFAZ, modal ver dados salvos (21/06/2026)
- LojaHub: aba Compras ativa com cards Nova Compra, Histórico e Entradas NF-e (21/06/2026)
- Migration 051: campos de fechamento completos em loja_caixas (valor_fechamento, total_especie/pix/cartao/saldo/sangrias/aportes, saldo_final_especie, conferência)
- Painel admin de caixas (/loja/caixas): visualização caixas abertos + forçar fechamento + fechamentos recentes (23/06/2026)
- Multi-caixa: abrirCaixaLoja valida por usuario_id, não por org inteira (23/06/2026)
- fecharCaixaLoja: suporte a `forcarComoAdmin` sem filtro usuario_id (23/06/2026)
- criarLancamento em finalizarVenda (integração contábil automática)
- registrarCompra → lançamento despesa; cancelarVenda → cancela lançamento (04/07/2026)
- Hub loja em `LojaHubClient.tsx` com kit UI compartilhado (04/07/2026)
- Menu Loja simplificado: Rel. Vendas/Estoque/Caixa e Conferência removidos do sidebar (acessíveis via Hub)
- Join PostgREST conferencia corrigido — query separada para usuarios (24/06/2026)

### Pendente no módulo
- Campo status_nfe na tela Nova Compra (verificar se foi implementado)
- Filtros por função nas relatórios (caixa_loja vê só suas vendas) — action existe, UI pendente
- Relatórios A4 em PDF (vendas, estoque, compras)
- Extrato conta corrente cooperado na Loja
- Emissão NF-e/NFC-e real — bloqueado (aguarda Marcos: CSC, NCMs, CSTs, regime)
- Teste endpoint Focus NFe homologação para NF-e de terceiros

### Bloqueado — aguardando contador (Marcos/Contabahia)
- CSC ID e CSC Token NFC-e
- NCMs dos produtos
- Regime tributário confirmado
- CSTs ICMS/PIS/COFINS
- Emissão real NF-e/NFC-e via Focus NFe

## Contábil 🔄
Última atualização: 07/08/2026

### Concluído (base)
- 13 telas com UI kit (`PageLayout` + `MODULO_CONTABIL` + `COM_C`)
- Classificação automática na escrituração (migration 061, toggle em Sobras → Configurações)
- Integração Financeiro → Contábil via `criarLancamento`:
  - Mensalidades, cotas (`quitarParcela`), comercialização, loja (compras + cancelamento venda)
- De/Para exclusivo para exportação SPED (não classifica lançamentos do dia a dia)
- SPED ECD **auxiliar** (`gerarSpedECD`) — base TXT, **não** entrega formal RFB

### Concluído (07/08/2026 — parceiro + NF-e consulta)
- **`/contabil/nfe` independente** de `/comercializacao/fiscal`:
  - Código em `app/(sistema)/contabil/nfe/*` + `actions.ts` próprios
  - Só consulta: sem Cancelar, sem CC-e, sem Docs de lote
  - Abas: Saídas · Entradas · Devoluções
  - Entradas: KPIs, busca/filtro, exportar XMLs em ZIP (seleção em 2 passos)
  - Sync silencioso de entradas `processando` no load (Focus → `autorizada`)
- **Fiscal operacional** permanece em `/comercializacao/fiscal` (cancelar, CC-e, ZIP lote, e-mail)
- **Parceiro contábil (portal escritório)**
  - Login comum `/login` → redireciona para `/escritorio` (não dashboard da coop)
  - Cookie `parceiro_org_id` ao entrar no cliente; botão **«Meu escritório»** + chip com logo/nome da org
  - Sidebar no cliente: logo NexCoop + logo da org; grupos «Cliente · Contábil»; atalho limpa cookie
  - Painel do escritório: rótulo **«Meu escritório contábil»**
- **Bugs NF-e de entrada (gravação)**
  - Update usava coluna inexistente `emitido_em` → falhava (PGRST204); UI mostrava «autorizada»/Reimprimir e o banco ficava `processando` sem chave
  - Correto: **`emitida_em`**
  - Modal de emissão: só «NF-e autorizada» com chave; se SEFAZ ainda processa → «Aguardando SEFAZ» + polling

### Contato escritório COOPAIBI (produção)
- Empresa: Contabahia Soluções Empresariais (`empresas_parceiras`)
- Responsável no sistema: **Érica Almeida** — `fiscal@contabahia.com.br` (antes Evely / ealmeida@…)

### Roadmap / melhorias
- Plano detalhado (código, banco, UX, SPED, cooperativa): **`docs/PLANO_CONTABIL.md`**
- **Plano de testes** (personas, casos, smoke, regressão 07/08): **`docs/PLANO_TESTES_CONTABIL.md`**
- P0: segurança de contexto do parceiro por request; hub contábil; período global; performance de balancete

### Pendente no módulo
- Hub `/contabil` (dashboard do contador)
- Plano de contas: botão «Nova Conta» funcional + edição/inativação
- Drill-down demonstrações → razão
- Amarração NF-e autorizada ↔ partidas (fila «sem escriturar»)
- Verificar se migration **062** (`acesso_fiscal`) está de fato no banco de produção (código já não depende dela no select do parceiro)
- Dados: entradas históricas ainda em `processando` sem chave — reconsultar Focus (abrir lote ou listar entradas contábil após deploy do fix `emitida_em`)

## Comercialização 🔄
Última atualização: 19/07/2026

### Resultado por safra — realizado + marcação a mercado (19/07/2026)

A tela `/comercializacao/resultado` e o KPI "Resultado Comercialização" do
dashboard (só cooperativa) leem `vw_resultado_comercializacao` (migration 082),
que decompõe o lucro em duas pontas:

- **Realizado** — só transações consumadas (kg vendido × custo já convertido
  pelo produtor), armazenado em `resultado_safra_snapshot.lucro_realizado_rs`
  (coluna GENERATED, mantida por trigger). Nunca muda retroativamente — é a
  base pra apuração e divisão de sobras no fim do exercício.
- **Ajuste a mercado** — posição em aberto (estoque físico − passivo à ordem)
  avaliada à cotação vigente, calculada **na leitura** pela view, sem trigger
  nem job. Flutua a cada mudança de cotação; não entra na divisão de sobras.
- **Lucro corrente** = realizado + ajuste a mercado (número do card do
  dashboard). **Exposição** = kg vendidos ainda sem custo fixado.

Decisão de produto (Giorgio): a cotação de conversão não é travada na venda do
lote — o produtor pode esperar a alta pra converter, risco de preço aceito
conscientemente pela cooperativa. O papel da tela é dar visibilidade
(realizado + exposição), não eliminar o risco.

Duas correções de dados na mesma leva (migrations 083/084, achadas com dados
reais da COOPAIBI): `saldos_produtor_snapshot` estava congelado desde a
migration 052 (trigger só resolvia `safra_id` via `lote_id`, que
`entrega`/`conversao`/`ajuste_produto` raramente têm); e `lote_itens` nunca
era gravado pelo código de aplicação desde a 052, deixando lotes de fora do
resultado (fallback via `movimentacoes_conta` pra lote mono-produto + backfill
corrigem o histórico). Detalhe técnico completo em `docs/comercializacao.md`
e `docs/PLANO_RESULTADO_COMERCIALIZACAO.md`.

### ✅ Concluído
- Cadastro produtores e compradores (com campos fiscais)
- Cotações de preço por produto/safra
- Caixa Cacau (sessões + entregas + conversões)
- Lotes (criação, composição, fechamento)
- NF-e de entrada por produtor (modal seleção de preço)
- NF-e de saída por lote (/lotes/[id]/nfe)
- ZIP XMLs + DANFE + CSV cooperados + email
- Sincronização status NF-e (/api/nfe/sincronizar)
- Sidebar: itens de gestão restritos a admin
- Polling 5s no BotaoNfe quando status = processando (23/06/2026)
- Tela gestão NF-e Saída (/comercializacao/fiscal): KPIs, tabela, cancelamento, downloads XML/DANFE (23/06/2026)
- focusDelete: cancelamento NF-e via DELETE /v2/nfe/{ref} (23/06/2026)
- criarLancamento após NF-e saída autorizada (integração contábil automática)
- criarLancamento em pagarDistribuicao (integração contábil automática)
- criarLancamento em registrarConversaoESaque (integração contábil automática)
- Fix calcularDistribuicao: filtro por lote_id (antes usava todas entregas da org)
- Bug fix getLancamentosPendentes: org_id → organizacao_id, data → data_competencia
- Botão NF-e saída alterna para Reimprimir após autorização (24/06/2026)
- Badge NF-e autorizada no card de lote na listagem (24/06/2026)
- iniciarLote: descrição sem padrão hardcoded (24/06/2026)
- Multi-operador: `getSessaoAberta()` filtra por `usuario_id` (26/06/2026)
- Painel admin `/comercializacao/caixas`: sessões abertas + histórico + forçar fechamento (26/06/2026)
- Saída avulsa de caixa: modal + lançamento financeiro + upload `'comprovantes'` (26/06/2026)
- Dashboard com dados reais: `movimentacoes_conta` (tipo='entrega'), saldo correto, lotes filtrados por status válido (26/06/2026)
- Saldo atual no header: `saldo_especie_calculado - total_saidas_especie` (26/06/2026)
- Filtros de "hoje" no dashboard: fuso Brasília UTC-3 (26/06/2026)
- Safra obrigatória em `iniciarLote` (16/07/2026)
- Módulo Resultado por Safra (`/comercializacao/resultado`) — receita − custo − taxa − FUNRURAL (16/07/2026)
- Tela de vendas lote → comprador (`/comercializacao/vendas`) (16/07/2026)
- Separação `FOCUSNFE_AMBIENTE_LOJA` / `FOCUSNFE_AMBIENTE_COMERCIALIZACAO` por módulo (16/07/2026)
- `vw_saldos_produtor`: view PostgreSQL saldo_kg por produtor/produto (migration 052) (16/07/2026)
- Venda de lote como transferência interna sem NF-e — comprador é empresa do próprio cooperado (migrations 067/068, 16/07/2026)
- Quebra de peso em vendas — comprador paga peso recebido, reduz valor a receber (migration 069, 16/07/2026)
- Consulta de NF-e em status "processando" religada na UI fiscal (16/07/2026)
- Continuidade de caixa + transferência entre caixas (Comercialização↔Loja e same-module) + custódia no dashboard (migrations 073/074, 17/07/2026)
- Cadastro rápido de produto, preço de custo opcional e unidade dinâmica no fluxo de entrega (17/07/2026)
- Relatório Saídas de Caixa (`/comercializacao/relatorios/saidas-caixa`): filtros aditivos combináveis (tipo/forma/produtor + mês/ano), PDF A4, cobre saques/avulsas/sangrias/ajustes; KPI "Pagamentos a produtores" no dashboard (18/07/2026)
- Saídas avulsas visíveis em Operações do dia + fix de data (coluna `date` não recua mais um dia por fuso) (18/07/2026)
- Resultado por safra reescrito (realizado + marcação a mercado, `vw_resultado_comercializacao`) + KPI "Resultado Comercialização" no dashboard; fix `saldos_produtor_snapshot` congelado desde a 052; fix FUNRURAL indevido em transferência interna; fix composição de lote sem gravar `lote_itens` (migrations 082/083/084, 19/07/2026)
- Anti-duplicata de sessão de caixa + reconsulta NF-e saída + ZIP/e-mail estável (migration **090**, **Grok / xAI**, 27–28/07/2026): 1 `sessoes_caixa` aberta por operador; loja e comercialização continuam independentes
- NF-e de saída com **ICMS diferido (CST 51)** + **Carta de Correção Eletrônica** (migration **091**, 30/07/2026): botão CC-e na tela fiscal com histórico, PDF/XML e envio por e-mail ao comprador; `nfe_eventos` registra inclusive as tentativas recusadas. NF-e de **entrada** segue em CST 41
- **Gerador de recibos** em `/comercializacao/impressos` (migrations **092/093**, 06/08/2026): PDF A4 com 2 vias na mesma folha + linha de corte, numeração sequencial por org (compare-and-swap), valor por extenso, competência mês/ano, e texto/assinatura que invertem conforme quem recebeu o dinheiro. Detalhes em `docs/comercializacao.md` §3.1

### ❌ Pendente
- saldo_kg em contas_produtor (estoque à ordem)
- KPI Custo total: quantidade × cotação (não soma valor_pago)
- DRE integrado (comercialização + loja + custos operacionais) — chat dedicado com Marcos

## Cooperados — Fluxos implementados

| Fluxo | Descrição | Status |
|---|---|---|
| 1 | Cadastro direto de cooperado (com criação de usuário) | ✅ |
| 2 | Criação de usuário com checkbox "é cooperado?" | ✅ |
| 3 | Promoção de produtor externo a cooperado (`promoverProdutorACooperado`) | ✅ |
| 4 | Vincular usuário existente como cooperado — botão "Tornar Cooperado" em Configurações → Usuários | ✅ 20/06/2026 |

**Matrículas:** formato AANNNN, sequencial por org. COOPAIBI: 26001–26014 manuais, próxima automática 26015.

## Agente WhatsApp — Mariana ✅ Implementado
Última atualização: 16/07/2026

- **Status:** no ar em produção
- **Descrição:** bot de primeiro atendimento via WhatsApp com IA (Claude Haiku), qualificação de leads e transferência para humano
- **Stack:** Evolution API (Railway) + `/api/whatsapp/webhook` (Next.js) + Claude Haiku
- **Número:** 73999693548
- **Script definido:** 3 opções de menu (conhecer sistema / ver planos / falar com equipe)
- **Pendência:** falta validação de assinatura/origem do webhook (item #5 da auditoria de segurança)

## API Routes planejadas

- POST /api/whatsapp/webhook — recebe eventos da Evolution API, processa com Claude Haiku, retorna resposta ao prospect. Lógica de transferência para humano via notificação quando prospect solicitar.

## Variáveis de ambiente

- EVOLUTION_API_URL — URL da instância Evolution API no Railway
- EVOLUTION_API_KEY — Chave de autenticação Evolution API
- WHATSAPP_NUMBER=5573999693548

## Roadmap crítico

1. **Migração multi-org** (ANTES do segundo cliente): `usuarios.organizacao_id` (1:1) → `usuario_organizacoes` (many-to-many). ~70 arquivos, RLS completa. Abrir chat dedicado.
2. **Portal do Filiado**: ✅ MVP entregue (`/filiado`, 16/07/2026) — falta cotas/documentos/assembleias.
3. **Fluxo de saque** Comercialização: ✅ entregue (`registrarConversaoESaque`, 16/07/2026).
4. **NF-e/NFC-e emissão da Loja**: desbloquear quando contador (Marcos) responder — comercialização já emite em produção, o bloqueio é só da Loja.
5. Hotmail/Outlook DMARC
6. Sidebar: remover Mensalidades para cooperativas
7. Renomear cooperados → membros (futuro)
