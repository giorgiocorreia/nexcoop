# NexCoop — Changelog

## 2026-06-25

### Resultado por Safra
- `app/(sistema)/comercializacao/resultado/page.tsx`: +query lotesAndamento (status rascunho/aberto/em_venda/entregue)
- `app/(sistema)/comercializacao/resultado/ResultadoClient.tsx`: seção "Lotes em andamento" com progress steps, dados da venda e link para lote
- `fn_atualizar_resultado_safra_snapshot`: custo_aquisicao_rs via notas_entrega.valor_total; receita filtrada por status='paga'
- `supabase/migrations/20260625000005_055_trigger_custo_aquisicao_notas_entrada.sql`: migration correspondente

### Fix build — 25/06/2026 (commit 9693d20)
- `lib/comercializacao/devolucao-xml.ts` — utilitário puro extraído (sem `"use server"`): `parsearXmlDevolucao`, `DadosDevolucao`
- `lib/comercializacao/devolucao.ts` — removida função síncrona; re-exporta `DadosDevolucao` via `devolucao-xml`
- `components/comercializacao/ModalInformarPagamento.tsx` — import corrigido: `parsearXmlDevolucao` vem de `devolucao-xml`
- **Causa raiz:** `"use server"` proíbe exportar funções síncronas — Turbopack rejeita em build. Utilitários puros (sem I/O) nunca entram em arquivo `"use server"`.

### Correções e melhorias — Comercialização
- `app/(sistema)/comercializacao/lotes/[id]/nfe/actions.ts`: lançamento NF-e saída com `status='pendente'`; venda avança para `confirmada` na autorização
- `lib/comercializacao/lotes.actions.ts`: `listarLotes` corrigida (join `lote_itens` em vez de `produtos`); `criarLote` sem `produto_id`
- `app/(sistema)/comercializacao/vendas/page.tsx`: tipo `Lote` sem `produtos`
- `app/(sistema)/comercializacao/fiscal/FiscalNfeClient.tsx`: erro cancelamento no modal; modal Docs (XMLs, ZIP, email); email comprador pré-preenchido; mensagem sucesso email com delay
- `app/(sistema)/comercializacao/fiscal/actions.ts`: `buscarDocsLoteAction`, `gerarZipLoteAction`, `enviarZipEmailAction`
- `lib/comercializacao/zip-lote.ts`: parâmetro `emailOverride` adicionado
- `app/(sistema)/comercializacao/lotes/[id]/LoteDetalhe.tsx`: DANFE URL corrigida; "Ver notas fiscais" → `/comercializacao/fiscal`
- `components/Sidebar.tsx`: "NF-e Saída" → "Notas Fiscais"
- `app/(sistema)/comercializacao/fiscal/page.tsx`: título atualizado
- Banco: NF-es 1 e 4 do Lote 001 com `xml_url`/`danfe_url` corrigidas manualmente
- Banco: `vendas_externas` id `9f3c0b0e` → `confirmada`; lançamento correspondente → `pendente`

## 2026-06-24

### Migration 052 — Resultado por Safra: schema base
- `cotacoes`: `data (date)` → `vigente_a_partir_de (timestamptz)`; suporte intraday; UNIQUE antigo removido
- `movimentacoes_conta`: +`cotacao_id uuid FK`
- `lotes`: -`produto_id`; nova tabela `lote_itens (lote_id, produto_id, peso_kg)`; trigger `trg_sincronizar_peso_lote`
- Nova tabela `saldos_produtor_snapshot` com `saldo_kg GENERATED` e trigger `trg_atualizar_saldos_produtor_snapshot`
- Nova tabela `resultado_safra_snapshot` com `resultado_liquido_rs` e `preco_medio_kg` GENERATED; trigger `trg_atualizar_resultado_safra_snapshot`
- Views: `vw_saldos_produtor`, `vw_resultado_safra`
- Backfill histórico incluído na migration
- 10 arquivos TypeScript adaptados (cotacoes, lotes, NF-e, caixa)

## [24/06/2026] — Bugs Conferência + NF-e Saída + Badge Lote + Iniciar Lote

### Bugs corrigidos
- `/loja/conferencia` — join PostgREST `usuarios!loja_caixas_usuario_id_fkey` quebrava silenciosamente (tabela tem duas FKs para `usuarios`: `usuario_id` + `conferido_por`). Fix: query separada — busca `loja_caixas` sem join, coleta `usuario_id`s, busca `usuarios` separadamente, merge manual.
- `LoteDetalhe` — botão "Emitir NF-e de saída" não alternava para "Reimprimir" após autorização. Fix: `buscarLote` agora inclui `vendas_externas(id, status_nfe, chave_nfe, numero_nfe, serie_nfe)` + lógica `nfeAutorizada` no componente.
- Runtime error na página do lote — campo `danfe_url` inexistente em `vendas_externas`. Fix: removido do select, URL DANFE gerada via `https://focusnfe.com.br/danfe/{chave_nfe}`.
- Registro fantasma `vendas_externas` id `68f72b00` com todos campos nulos deletado do banco (causava `buscarLote` pegar venda null em vez da autorizada).

### Features
- Badge "NF-e nº X autorizada" no card de lote na listagem — `listarLotes` agora traz `vendas_externas(id, status_nfe, numero_nfe)`
- `iniciarLote`: descrição sem valor padrão hardcoded ('Cacau amêndoa seca' removido), placeholder genérico

### Arquivos modificados
- `app/(sistema)/loja/conferencia/page.tsx` — query separada para usuarios
- `app/(sistema)/comercializacao/lotes/actions.ts` — buscarLote + listarLotes com vendas_externas
- `app/(sistema)/comercializacao/lotes/[id]/LoteDetalhe.tsx` — lógica nfeAutorizada + botão condicional
- `app/(sistema)/comercializacao/lotes/LotesLista.tsx` — badge NF-e + descrição sem padrão

## [23/06/2026] — Sessão NF-e Saída + Integração Contábil + Multi-caixa Loja

### Migrations
- **050** — `lancamento_id UUID FK` em `vendas_externas` e `distribuicao_resultado`
- **051** — campos de fechamento completos em `loja_caixas`

### Novos arquivos
- `app/(sistema)/comercializacao/fiscal/page.tsx`
- `app/(sistema)/comercializacao/fiscal/FiscalNfeClient.tsx`
- `app/(sistema)/comercializacao/fiscal/actions.ts`
- `app/(sistema)/loja/caixas/page.tsx`
- `app/(sistema)/loja/caixas/CaixasAdminClient.tsx`
- `app/(sistema)/loja/caixas/actions.ts`
- `supabase/migrations/20260622000001_050_lancamentos_comercializacao.sql`
- `supabase/migrations/20260623000001_051_loja_caixas_campos_fechamento.sql`

### Arquivos modificados
- `lib/contabil/actions.ts` — bug fix getLancamentosPendentes (org_id → organizacao_id, data → data_competencia)
- `lib/focusnfe/client.ts` — focusDelete adicionado
- `app/(sistema)/comercializacao/lotes/[id]/nfe/actions.ts` — criarLancamento após NF-e autorizada
- `lib/comercializacao/distribuicao.actions.ts` — criarLancamento em pagarDistribuicao + fix lote_id
- `components/comercializacao/ModalNfeEntrada.tsx` — polling 5s status processando
- `lib/loja/actions.ts` — abrirCaixaLoja por usuario_id; fecharCaixaLoja com forcarComoAdmin; criarLancamento em finalizarVenda; log erro fechamento
- `app/(sistema)/cooperados/[id]/pagamentos-actions.ts` — criarLancamento parcelas pagas
- `lib/comercializacao/caixa.actions.ts` — criarLancamento em registrarConversaoESaque
- `components/Sidebar.tsx` — link NF-e Saída em Comercialização; painel Caixas em Loja; simplificação menu Loja

### Bugs corrigidos
- Escrituração contábil não listava lançamentos (campo errado org_id → organizacao_id)
- calcularDistribuicao usava todas as entregas da org (não filtrava por lote)
- fecharCaixaLoja bloqueava fechamento por outro usuário (filtro usuario_id removido para admin)
- abrirCaixaLoja bloqueava abertura de segundo caixa na org (agora por usuario)
- Erro hidratação React #418 em CaixasAdminClient (toLocaleString removido)
- loja_caixas sem colunas de fechamento (migration 051)

---

## 22/06/2026 — NF-e Saída + ZIP + Fixes Comercialização

### Novos arquivos
- lib/utils/cpf.ts — validação CPF com dígitos verificadores
- lib/comercializacao/zip-lote.ts — ZIP XMLs + CSV + email
- app/(sistema)/comercializacao/lotes/[id]/nfe/page.tsx
- app/(sistema)/comercializacao/lotes/[id]/nfe/NfeSaidaClient.tsx
- app/(sistema)/comercializacao/lotes/[id]/nfe/actions.ts
- app/api/nfe/sincronizar/route.ts — reconciliação status Focus NFe

### Arquivos modificados
- lib/email.ts — suporte a attachments
- lib/comercializacao/nfe.actions.ts — getCotacaoParaModal
- lib/comercializacao/compradores.actions.ts — campos fiscais
- components/comercializacao/ModalNfeEntrada.tsx — BotaoNfe abre modal + overlay fix
- components/Sidebar.tsx — gestão comercialização restrita a admin
- app/(sistema)/comercializacao/lotes/[id]/LoteDetalhe.tsx — pré-seleção entregas
- app/(sistema)/comercializacao/compradores/page.tsx — IE + endereço fiscal
- types/database.ts — notas_entrega: status + campos fiscais

### Fixes de dados (Supabase)
- notas_entrega: 3 notas sincronizadas via /api/nfe/sincronizar
- lotes: safra_id vinculado ao Lote 001
- vendas_externas: status_nfe limpo para reemissão em produção

---

## [22/06/2026] — Comercialização: NF-e saída, campos fiscais, sidebar, validação CPF

### Arquivos criados
- `app/(sistema)/comercializacao/lotes/[id]/nfe/page.tsx` — Server Component NF-e saída (async params Next.js 15)
- `app/(sistema)/comercializacao/lotes/[id]/nfe/NfeSaidaClient.tsx` — UI com KPIs, destinatário, botão emitir, estados sucesso/erro
- `app/(sistema)/comercializacao/lotes/[id]/nfe/actions.ts` — `emitirNfeSaidaAction`: payload Focus NFe (CFOP 5102, NCM 18010000), polling autorização, salva chave/número/status na venda
- `app/api/nfe/sincronizar/route.ts` — POST `{nota_id, referencia}` → consulta Focus NFe → atualiza `notas_entrega`
- `lib/utils/cpf.ts` — `validarCPF` (dígitos verificadores) + `cpfInvalidoMsg`

### Arquivos modificados
- `app/(sistema)/comercializacao/compradores/page.tsx` — campos fiscais (IE, logradouro, numero, bairro, CEP com máscara, municipio, UF); modal alargado 560px com scroll; `mascaraCEP`
- `lib/comercializacao/compradores.actions.ts` — `criarComprador` + `editarComprador` aceitam os 7 novos campos fiscais
- `components/Sidebar.tsx` — itens de gestão (Cotações, Lotes, Compradores, Vendas) restritos a admin; item Compradores adicionado
- `middleware.ts` — `/api/nfe` liberado da autenticação (igual a `/api/cron`)
- `types/database.ts` — `NotaEntrega`: status + 'autorizada' | 'processando' | 'rejeitada'; +14 campos fiscais
- `lib/fmt.ts` — adicionado `fmt.pct()`
- `app/(sistema)/comercializacao/lotes/[id]/LoteDetalhe.tsx` — pré-seleção inteligente (rascunho: todas disponíveis; aberto: só as do lote); `BotaoNfe` usa `entrega.movimentacao_id ?? entrega.id`
- `app/(sistema)/comercializacao/lotes/[id]/nfe/NfeSaidaClient.tsx` — URL DANFE usa variável `FOCUS_BASE_URL` via `urlCompleta`
- `app/(sistema)/cooperados/novo/page.tsx` — validação CPF com dígitos verificadores (PF + representante PJ)
- `app/(sistema)/cooperados/[id]/editar/page.tsx` — idem, com foco na aba 'pessoal' em caso de erro
- `components/usuarios/ModalCadastrarUsuario.tsx` — validação CPF quando preenchido
- `app/(sistema)/comercializacao/produtores/page.tsx` — validação CPF quando preenchido
- `app/(sistema)/perfil/PerfilUsuarioClient.tsx` — validação CPF quando preenchido

### Testes
- NF-e de saída homologação: autorizada nº 7, R$5.451,06, Barry Callebaut (Lote 001 COOPAIBI)
- `api/nfe/sincronizar`: duas NF-e de entrada reconciliadas com sucesso
  - `ENT-3ad97dc2-558d99ec` → chave `NFe29260654305114000179550010000000021743108593`
  - `ENT-3ad97dc2-db0dc8f5` → chave `NFe29260654305114000179550010000000031791514374`

### Pendências registradas
- Voltar FOCUSNFE_AMBIENTE=producao no Vercel
- iniciarLote: obrigar seleção de safra
- saldo_kg em contas_produtor
- KPI Custo total corrigir cálculo
- Módulo de resultado por safra
- Tela Vender produto
- Dashboard comercialização
- Sincronização automática NF-e no BotaoNfe
- Separação FOCUSNFE_AMBIENTE por módulo (loja vs comercializacao)
- Gerson/Marcelo: corrigir vínculo cooperado/produtor após lote; CPF Gerson 10 dígitos
- ZIP XMLs + PDF relatório para moageira

---

## [22/06/2026] — Comercialização: Lotes + NF-e entrada produção

### Migrations
- `049_lote_status_rascunho.sql`: adiciona status 'rascunho' ao CHECK de lotes.status

### Arquivos modificados
- `app/(sistema)/comercializacao/lotes/actions.ts` — `gerarLoteAutomatico` removida; `iniciarLote` criada (status rascunho, sem vínculo); `confirmarComposicaoLote` refatorada (desvincula tudo, vincula selecionados, promove para 'aberto'); `listarEntregasDisponiveis` e `listarEntregasDoLote` com `valor_pago` via join conversao por sessao_caixa_id + conta_id
- `app/(sistema)/comercializacao/lotes/LotesLista.tsx` — botão "Iniciar lote", status 'rascunho' em STATUS_LABEL/STATUS_COLOR
- `app/(sistema)/comercializacao/lotes/[id]/LoteDetalhe.tsx` — seleção começa vazia no rascunho; botão muda entre "Confirmar lote" / "Atualizar composição"; "Fechar lote" só aparece quando aberto + seleção > 0; `BotaoNfe` em todas as entregas
- `components/comercializacao/ModalNfeEntrada.tsx` — etapa de seleção de preço (cooperado/externo/manual); `useEffect` no `BotaoNfe` para verificar status ao montar
- `lib/comercializacao/nfe.actions.ts` — `emitirNfeEntradaAction` com `preco_unitario_override`; nova action `getCotacaoParaModal`
- `lib/focusnfe/emitir-nfe-entrada.ts` — suporte a `preco_unitario_override` (skip cotação quando informado)

### Infra
- `FOCUSNFE_AMBIENTE=producao` adicionado no Vercel (Production only)
- CSC NFC-e produção: ID 1, token 2BF39D09-64CD-4545-850D-D25BAB7B3215
- CSC NFC-e homologação: ID 1, token 1D4F937E-A986-44BA-8099-955413671F0B

### Fixes
- Join `movimentacoes_conta→contas_produtor→produtores` (sem FK direta)
- Custo do lote via `movimentacoes_conta` tipo='conversao' por `sessao_caixa_id + conta_id`
- `BotaoNfe` com `useEffect` verifica status ao montar (não exige clique para mostrar estado correto)
- `params` assíncrono no Next.js 15 em `lotes/[id]/page.tsx`

### Pendências registradas
- Emitir NF-e Flávio + Gerson (CPF do Gerson com 10 dígitos — campo zerado no banco)
- Validação CPF 11 dígitos em todos os campos do sistema
- NF-e de saída (`vendas_externas`) — próxima sessão
- Pacote ZIP XMLs para moageira — próxima sessão
- CSC NFC-e configurar no código (NFCE_CSC_ID_PRODUCAO, NFCE_CSC_TOKEN_PRODUCAO)

---

## [22/06/2026] — Comercialização: Lotes MVP

### Migration
- `048_comercializacao_lotes_fiscal.sql`: ALTER em 5 tabelas
  - `lotes`: safra_id/produto_id nullable, +produto_descricao, +data_fechamento
  - `movimentacoes_conta`: +lote_id (FK lotes), +chave_nfe_entrada, +xml_nfe_entrada
  - `vendas_externas`: +chave_nfe, +numero_nfe, +serie_nfe, +status_nfe, +xml_nfe, +data_emissao_nfe
  - `compradores`: +ie, +logradouro, +numero, +complemento, +bairro, +cep, +municipio, +uf
  - `produtos`: +ncm, +cfop_saida_interna, +cfop_saida_interestadual, +cst_icms, +cst_pis, +cst_cofins, +fator_saca

### Arquivos criados
- `app/(sistema)/comercializacao/lotes/actions.ts` — 9 server actions: listarLotes, listarEntregasDisponiveis, listarEntregasDoLote, gerarLoteAutomatico, confirmarComposicaoLote, fecharLote, buscarLote, listarCompradores, criarVendaExterna
- `app/(sistema)/comercializacao/lotes/page.tsx` — server component
- `app/(sistema)/comercializacao/lotes/LotesLista.tsx` — lista com botão "Gerar lote"
- `app/(sistema)/comercializacao/lotes/[id]/page.tsx` — server component (carrega lote + entregas + compradores)
- `app/(sistema)/comercializacao/lotes/[id]/LoteDetalhe.tsx` — KPIs tempo real, tabela tikável, salvar composição, fechar lote, painel venda → NF-e
- `lib/fmt.ts` — utilitários fmt.peso(), fmt.moeda(), fmt.data()

### Arquivos modificados
- `types/database.ts` — Lote (nullable safra_id/produto_id, +produto_descricao, +data_fechamento), MovimentacaoConta (+lote_id, +chave_nfe_entrada, +xml_nfe_entrada), Comprador (+endereço), VendaExterna (safra_id nullable, +campos NF-e), Produto (+campos fiscais)
- `components/Sidebar.tsx` — item "Lotes" ativo no submenu Comercialização

### Decisões de arquitetura
- Entrega de cacau vive em `movimentacoes_conta` (tipo='entrega'), não em `loja_compras`
- `loja_compras` = reposição da loja agropecuária (insumos), escopo completamente diferente
- Lote vincula `movimentacoes_conta` via `lote_id` (nullable FK)
- Numeração de lotes: sequencial por org, formato '001', '002'...
- `fator_saca=60` hardcoded por ora; campo em `produtos` para futura configuração por produto
- CFOP determinado por `compradores.uf` vs 'BA': 5101 (interna) / 6101 (interestadual)
- `distribuicao_resultado` mantida no schema mas não utilizada (modelo de rateio abandonado)
- `safra_id` em lotes: nullable — operador não precisa criar safra antes de abrir lote

---

## [21/06/2026] — Loja Agropecuária: Entradas NF-e

### Migration
- 044: ALTER TABLE loja_compras ADD COLUMN chave_acesso_nfe, serie_nfe, data_emissao_nfe, emitente_nfe, cnpj_emitente, valor_nfe, status_nfe

### Arquivos criados/modificados
- `app/(sistema)/loja/entradas/page.tsx` — criado
- `app/(sistema)/loja/entradas/EntradasNFeClient.tsx` — criado
- `app/(sistema)/loja/entradas/actions.ts` — criado (listarEntradasNFe, kpisEntradasNFe, consultarNFeNaSEFAZ, vincularNFe)
- `app/(sistema)/loja/LojaHub.tsx` — card "Entradas NF-e" ativado na aba Compras

### Decisões técnicas
- Consulta SEFAZ via Focus NFe homologação (endpoint /v2/nfe/{chave})
- status_nfe com CHECK constraint: 'com_chave' | 'sem_chave' | 'sem_nota'
- Compras de fornecedores informais nascem como 'sem_nota' (sem ação disponível)
- Dados da NF-e salvos localmente após vinculação (sem re-consulta SEFAZ no modal Ver)

---

## [21/06/2026] — Landing page v2 + planejamento agente WhatsApp

Arquivos criados:
- app/(landing)/DemoInterativa.tsx — client component com 4 abas interativas (useState), extraído de page.tsx para permitir interatividade sem tornar a page um client component

Arquivos modificados:
- app/(landing)/page.tsx — reestruturação completa:
  - Adicionados: Numeros(), Dores(), TelasReais(), Depoimento(), WppFlutuante()
  - Modificados: Navbar() (fundo escuro, CTA WhatsApp), Hero() (foto bg + overlay, mockup genérico), MockupDashboard() (sem logo org, números expressivos), Funcionalidades() (foto bg + 12 módulos), PorQueNexCoop() (foto bg, 6 diferenciais), Planos() (removida linha isenção fiscal, plano Agro com CTA WhatsApp), CTAFinal() (foto bg, CTA WhatsApp único), Rodape() (4 colunas completas com links reais)
  - Removidos: sistema de abas CSS com âncoras (substituído por useState no DemoInterativa.tsx)
  - Constante WPP_URL = 'https://wa.me/5573999693548'
  - Constante adicionada: DORES[] com 6 itens

Assets adicionados em /public/images/:
- bg-hero.jpg
- bg-dores.jpg
- bg-funcs.jpg
- bg-depo.jpg
- bg-cta.jpg

Decisões registradas:
- ManyChat descartado: WhatsApp exclusivo plano Pro
- Agente WhatsApp: Evolution API + Claude Haiku + webhook Next.js
- Número WhatsApp NexCoop: 73999693548
- Razão social: Nexcoop Tecnologia Ltda (SLU)

---

## [20/06/2026] — Cooperados: Fluxo 4 + Matrículas + Busca + Correções

- **Cooperados:** Fluxo 4 — botão "Tornar Cooperado" em Configurações → Usuários para vincular usuário existente como cooperado
- **Cooperados:** Geração automática de matrícula AANNNN por org; matrículas 26001–26014 atribuídas à COOPAIBI; migration 047 (índices de performance)
- **Cooperados:** Busca por nome/email separada de busca por CPF (numérico)
- **Cooperados:** Breadcrumb lista e detalhe no padrão do sistema
- **Usuários:** Layout linha em 2 linhas para evitar espremimento com muitos botões
- **Usuários:** Fix serialização `usuariosComCooperado` Set → array
- **Usuários:** Botão "Tornar Cooperado" visível para qualquer usuário sem cooperado vinculado
- **Build:** `sites/` excluído do `tsconfig.json`; `nodemailer` instalado como dependência

---

## [20/06/2026] — Sistema de Cotas e Pagamentos

### Migrations
- 045: tabelas grupos_colaboradores, cotas_cooperado (tipo_cota, grupo_id), grupo_representantes, triggers, RLS
- 046: tabela cota_pagamentos com formas de pagamento, parcelas, vencimentos, RLS

### Novos arquivos (todos em app/(sistema)/)
- cooperados/[id]/CotasSection.tsx — reformulado: cota plena + colaboradora, busca/criação inline de grupo
- cooperados/[id]/cotas-actions.ts — buscarCotas, buscarGrupos, criarGrupo, salvarCota, removerCota, indicarRepresentante, updateCooperadoStatus
- cooperados/[id]/PagamentosSection.tsx — histórico, formulário multi-parcela, quitação inline, modal integralização
- cooperados/[id]/pagamentos-actions.ts — registrarPagamentos, quitarParcela, buscarPagamentos, verificarInadimplencia, buscarResumoCotasDashboard
- cooperados/[id]/recibo-cota-actions.ts — PDF 80mm com parcelas, totais, CNPJ formatado
- configuracoes/grupos/page.tsx — tela de grupos com métricas
- configuracoes/grupos/actions.ts — listarGruposOrg, criarGrupoOrg, alterarStatusGrupo

### Arquivos modificados
- types/database.ts — TipoCota, CotaCooperado, GrupoColaborador, GrupoRepresentante, CotaPagamento, FormaPagamentoCota, StatusPagamentoCota
- app/(sistema)/cooperados/page.tsx — tipoOrg prop + nomenclatura dinâmica
- app/(sistema)/cooperados/CooperadosLista.tsx — getNomenclatura(), header padrão NexCoop
- app/(sistema)/cooperados/[id]/CooperadoPerfil.tsx — PagamentosSection integrado, usuarioId prop
- components/Sidebar.tsx — item Grupos em Configurações

### Fixes
- CNPJ formatado no recibo (54.305.114/0001-79)
- Cooperado ativo/proposta com cota parcial muda para probatório automaticamente
- Verificação de !quitou movida para após cálculo de quitação
- Limpeza de caixas de teste (Giorgio Correia, Atendente Cacau, Luan de Jesus)

---

## [20/06/2026] — Sessão: Loja Fase 6 + Comercialização + Correções

### Loja Agropecuária
- Migration 041: persiste tipo_cartao, NSU, autorização, identificador PIX nas vendas
- Migration 042: conferência de caixa — status_conferencia, valor_fisico_*, conferido_por, conferido_em em loja_caixas; pix_nome_pagador em loja_vendas
- Migration 043: loja_unidades dinâmicas — remove CHECK fixo, cria tabela com 12 unidades padrão
- ModalFechamentoCaixa: checklist operador com valores físicos por forma de pagamento + lista PIX
- Tela /loja/conferencia: gerente confere sessões, marca conferido/divergente
- Action conferirCaixa em lib/loja/actions.ts
- Badge de nota fiscal no Rel. Vendas
- Fix RLS: todos os relatórios da loja migrados para adminClient
- Fix join ambíguo: loja_caixas→usuarios usa usuarios!loja_caixas_usuario_id_fkey
- Fix filtro de data client-side no Rel. Caixa (comparação via getTime())
- Campo de pesquisa de fornecedor com cadastro rápido inline (Nova Compra)
- Campo de pesquisa de produto com autocomplete + link para cadastro (Nova Compra)
- PDV: painel de produtos em lista (colunas: produto, unidade, preço, estoque)
- Tela /loja/unidades: gestão de unidades de medida dinâmicas
- Select de unidade dinâmico em cadastro/edição de produto
- Cancelamento de compra com estorno de estoque e log de auditoria
- Botão Editar na listagem de produtos
- Edição inline de nome e sigla de unidades
- Sidebar: Estoque, Compras, Fornecedores, Unidades, Conferência adicionados
- Fix sidebar: Comercialização com submenu (Dashboard, Cotações, Produtores, etc.)
- Fix: botão "Cadastrar novo produto" usa router.push em vez de target blank

### Comercialização
- Dashboard: breadcrumb padrão substituindo título "Comercialização"
- Dashboard: cotações vigentes por produto (adminClient)
- Cotações: breadcrumb padrão + formulário oculto para caixa_loja
- Fix: adminClient em getDashboardComercializacao para cotações (RLS bloqueava)

### Bugs corrigidos
- Fix: produtor promovido a cooperado agora atualiza tipo='cooperado' no banco
- Fix: Rel. Vendas move auth para page.tsx, action usa apenas adminClient
- Fix: debug route /api/debug-vendas identificou join ambíguo como causa raiz

### Banco de dados (limpeza COOPAIBI)
- Removidas todas as vendas e itens de teste
- Removidas sangrias e movimentos de estoque de teste
- Removidos caixas fechados de teste
- Removida compra NF 1234567
- Removido produto "Sal Proteinado"
- Zerados saldos produto e financeiro de produtores
- Removidas sessões de caixa, movimentações e aportes/sangrias da Comercialização
- Zerado estoque físico

---

## [19/06/2026] — Loja PDV: pagamento completo persistido (Migration 041)

- Migration 041: colunas `tipo_cartao`, `cartao_nsu`, `cartao_autorizacao`, `pix_identificador`, `desconto_total`, `pago_saldo` adicionadas em `loja_vendas`
- `types/database.ts`: interface `LojaVenda` atualizada com os 6 novos campos
- `lib/loja/types.ts`: campo `pix_identificador: string` adicionado a `PagamentoVenda`
- `lib/loja/actions.ts`: `finalizarVenda` agora persiste tipo_cartao, NSU, autorização e identificador PIX no insert
- `ModalPagamento`: campo "Identificador / End-to-End" no bloco PIX; `pixIdentificador` propagado em todos os casos do `handleConfirmar`

---

## [19/06/2026] — Loja PDV: modal de nota fiscal pós-venda

- `ModalNotaFiscal`: novo componente com seleção NFC-e (CPF opcional) / NF-e (CNPJ + razão social obrigatórios), telas de "emitindo" e "configuração fiscal pendente"
- `ModalComprovante`: atualizado com prop `temFiscal` — exibe botão "Emitir nota fiscal" apenas se org tem `loja_nfe_saida_serie` ou `loja_nfce_csc_token` configurados
- PDV `page.tsx`: detecta fiscal configurado no `useEffect` de init e passa `temFiscal` + `orgId` para o `ModalComprovante`
- Emissão real (Focus NFe) pendente de retorno do contador com CSC, NCMs e CSTs

---

## [18/06/2026] — Loja Agropecuária Fase 6 — Preparação Fiscal

- Migration 040: colunas `ncm` e `cfop_saida` em `loja_produtos`, 5 colunas fiscais em `organizacoes` (CSC ID/Token, séries NFC-e/NF-e, regime tributário), tabela `loja_notas_fiscais` com RLS
- `types/database.ts`: `LojaProduto` + ncm/cfop_saida, `Organizacao` + 5 campos fiscais, nova interface `LojaNotaFiscal` + tipos `LojaNotaTipo`/`LojaNotaStatus`
- Listagem de produtos: coluna NCM com inline edit + badge "NCM ok" (verde) / "Sem NCM" (cinza) ao lado do nome
- Formulários criar/editar produto: campo NCM (8 dígitos, validação, dica informativa)
- `lib/loja/fiscal-actions.ts`: `salvarFiscalLoja()` com `createAdminClient()` + `registrarLog()`
- `/configuracoes/fiscal-loja`: tela Fiscal da Loja com seções NFC-e (CSC ID/Token/Série), NF-e saída (Série/Regime tributário) e card de Status (NFC-e configurado, NF-e saída, contagem de produtos sem NCM)
- `ConfiguracoesForm`: link "🧾 Fiscal da Loja" na barra de abas, visível apenas para admin

---

## [18/06/2026] — Loja Agropecuária Fase 5 Completa

### Loja — Dashboard e Relatórios (Fase 5)
- Hub `/loja` redesenhado: gráfico SVG de vendas dos últimos 7 dias + KPIs (vendas do dia, ticket médio, produtos vendidos) + alertas de estoque mínimo
- `/loja/produtos`: inline edit — edição de preço/estoque mínimo/desconto direto na tabela, sem abrir modal
- Relatório de Caixa `/loja/relatorio/caixa/[id]`: resumo do fechamento com totais por forma de pagamento; impressão térmica 80mm via route handler HTML puro em `/imprimir/caixa/[id]` (sem layout Next.js, imprime e fecha)
- Relatório de Vendas `/loja/relatorio/vendas`: filtros por período, cooperado e produto; exportação CSV
- Relatório de Estoque `/loja/relatorio/estoque`: posição atual por produto + histórico de movimentações filtráveis por período
- Sidebar global com submenus expansíveis para a Loja: Catálogo (Produtos, Categorias, Fornecedores), PDV, Relatórios (Caixas, Vendas, Estoque), Configurações
- FAB removido — navegação 100% via sidebar com submenus

---

## [16/06/2026] — Correções PDV Loja

- fix: busca cooperado por CPF usando adminClient e tabela cooperados diretamente
- fix: campos corretos em loja_vendas (pago_saldo, sem desconto_total)
- fix: loja_venda_itens sem campos inexistentes
- fix: comprovante PDF com queries separadas sem joins
- feat: pagamento cartão débito/crédito com NSU e código de autorização
- fix: modal comprovante fecha após imprimir
- fix: máscara CPF corrigida

---

## [15/06/2026] — Loja Agropecuária Fase 4 + Melhorias UI

### Loja — PDV (Fase 4)
- Migration 038: tabela `loja_sangrias`
- 6 actions PDV: `abrirCaixaLoja`, `buscarCooperadoPorCPF`, `validarSenhaAutorizador`, `finalizarVenda` (FIFO), `cancelarVenda`, `registrarSangriaLoja`
- 7 componentes PDV: `ModalAutorizacao`, `ModalQuantidade`, `BadgeCooperado`, `PainelProdutos`, `PainelCarrinho`, `ModalPagamento`, `ModalComprovante`
- `ModalFechamentoCaixa` com resumo financeiro e opção de imprimir relatório
- API routes: `/api/loja/comprovante/[id]` e `/api/loja/fechamento/[id]` (80mm térmico)
- Validação de estoque insuficiente no `PainelCarrinho`
- Máscara CPF no campo de busca de cooperado
- `buscarCooperadoPorCPF` corrigida: busca em `cooperados.cpf` diretamente
- Funções da loja inseridas em `funcoes_disponiveis`: `gerente_loja`, `caixa_loja`, `estoquista_loja`
- Módulo `'loja'` ativo no COOPAIBI

### UI Global
- Sidebar colapsável: 56px (ícones) / 240px (expandido), persiste em `localStorage`, toggle com ícone Tabler
- Toast system global (`ToastProvider` em `MainContent.tsx`): `success` (5s), `error` (manual), `warning` (5s), `info` (manual)
- Breadcrumb clicável NexCoop/Loja/SubPágina em todas as páginas da loja
- Hub `/loja` redesenhada: KPIs + acesso rápido + últimas compras + alerta estoque crítico
- Botões padronizados com `<Btn>` em todas as páginas da loja
- Títulos garrafais removidos, substituídos por breadcrumb estilo NexCoop

---

## [15/06/2026] — Loja Agropecuária: Fases 0–3 + Controle de Módulos

### Infraestrutura (Passo 0)
- `feat(org)`: `modulos_ativos` (text[]) em `organizacoes` — controle de acesso por módulo por org
- `lib/org.ts`: função `getModulosAtivos()` para leitura server-side dos módulos habilitados
- Sidebar condicional: itens de Loja e Comercialização ocultos se módulo inativo
- Middleware: bloqueio de rotas `/loja/*` e `/comercializacao/*` conforme `modulos_ativos`

### Fase 1 — Tipos e actions base
- `lib/loja/types.ts`: tipos TypeScript para todos os modelos da Loja (produto, categoria, compra, lote)
- `lib/loja/actions.ts`: server actions CRUD (produtos, categorias, compras, estoque)
- `lib/permissoes.ts`: permissões `loja_admin`, `loja_operador`, `loja_caixa`

### Fase 2 — Catálogo de produtos e categorias
- `/loja` — dashboard com resumo de estoque e compras recentes
- `/loja/produtos` — listagem com busca e filtros
- `/loja/produtos/novo` — cadastro (nome, categoria, preço, desconto cooperado)
- `/loja/produtos/[id]` — detalhes e edição
- `/loja/categorias` — gestão de categorias

### Fase 3 — Compras, rateio de custos e controle de estoque
- `/loja/estoque` — visão geral por lote (FIFO)
- `/loja/estoque/ajuste` — ajuste manual com motivo
- `/loja/compras` — listagem de compras/notas de entrada
- `/loja/compras/nova` — registro de compra com rateio proporcional de frete e outros custos
- `/loja/compras/[id]` — detalhes e itens da compra

### Migrations
- Migration 036: perfil de usuário (dados pessoais, atividades recentes)
- Migration 037: `loja_compras` expandida — `numero_nf`, `data_compra`, `valor_frete`, `outros_custos_valor`, `outros_custos_descricao`, `observacoes`

### Correções
- `app/(sistema)/aceitar-convite/page.tsx`: `export const dynamic = 'force-dynamic'` para evitar erro de prerender
- `types/database.ts`: `modulos_ativos` adicionado ao tipo `Organizacao`; tipo `LojaCompra` atualizado com novos campos

---

## [13/06/2026] — Sessão: Modelo Unificado + Ficha do Produtor + UI Usuários

### Modelo Membro/Produtor/Usuário
- Migration 033: adicionadas colunas `usuario_id`, `dados_fiscais`, `is_consumidor_final` em `produtores`
- Migration 034/035: criada e revertida tabela `membros` (conceito já existia como `cooperados`)
- `lib/cooperados/actions.ts`: 3 server actions implementadas:
  - `criarUsuarioComCooperadoOpcional` — usuário com checkbox "é cooperado?"
  - `criarCooperado` — cadeia completa usuario+cooperado+produtor
  - `promoverProdutorACooperado` — promoção de produtor externo
- `lib/permissoes.ts`: adicionada função `isCooperado()`
- Modelo final: `produtores` = identidade cadastral, `cooperados` = vínculo societário 1:1

### Ficha do Produtor (Comercialização)
- Tela unificada `/comercializacao/produtores/[id]`: botões → dados cadastrais → extrato → saldos
- "Voltar" à esquerda, demais botões à direita — todos padrão `Btn`
- Dados cadastrais: leitura por padrão (campos vazios ocultos), editar ao clicar (todos visíveis)
- Card "Saldos" no fim: kg × cotação atual (estimativa), saldo financeiro, total estimado
- Botão "Promover a cooperado" visível apenas se `cooperado_id === null`
- Modal `ModalPromoverCooperado`: promove produtor existente, cria login, exibe senha temporária
- "Ver perfil" removido da listagem — fica só "Ver ficha"
- Modal "Caixa fechado": intercepta ações com caixa fechado → 2 etapas (aviso → saldo inicial) → abre caixa → redireciona com `produtor_id+acao`

### Configurações → Usuários
- Botão "+ Cadastrar usuário" adicionado ao lado de "+ Convidar usuário"
- Modal `ModalCadastrarUsuario`: dados de acesso + checkbox "é cooperado?" + campos societários
- Exibe senha temporária ao final com botão "Copiar credenciais"
- Todos os botões da tela padronizados para componente `Btn`

### Banco de dados (aplicar manualmente via SQL Editor)
- Migration 033 (colunas produtores): `usuario_id`, `dados_fiscais`, `is_consumidor_final`
- Migration 035 (drop membros): `drop table if exists membros cascade`

### Correções
- Cast `as Json` em todos os campos jsonb das server actions (fix build TS)
- Dados cadastrais da ficha em grid 4 colunas (responsivo para 2 em mobile)

---

## [13/06/2026 — tarde] — E-mail boas-vindas + fixes UI

### E-mail de boas-vindas ao cooperado
- `lib/email.ts`: transporter nodemailer com Zoho SMTP (smtp.zoho.com:465)
- `lib/cooperados/actions.ts`: nova função `enviarEmailBoasVindas()`
  com template HTML idêntico aos 6 templates existentes
- Botão "Enviar por e-mail" na ficha do produtor (banner pós-promoção)
- Botão "Enviar por e-mail" no modal "Cadastrar usuário" (painel credenciais)
- Variáveis de ambiente: SMTP_USER + SMTP_PASS (Vercel + .env.local)
- Obs: Hotmail/Outlook bloqueia — pendente configuração DMARC no Zoho

### Fixes e melhorias
- `lib/cooperados/actions.ts`: tratamento de erro "e-mail já em uso"
  nas 3 actions (promoverProdutorACooperado, criarCooperado,
  criarUsuarioComCooperadoOpcional) — exibe mensagem amigável no modal
- Listagem de produtores: botão "Ver ficha" padronizado para Btn
- Cadastro de produtor: opção "Cooperado" removida do select de tipo
  (tipo cooperado é definido exclusivamente via "Promover a cooperado")
- tsconfig.json: target atualizado para ES2018 (fix regex flag /s)
- Migration 031 aplicada: tabela `enderecos` centralizada
- types/database.ts: tipo Enderecos adicionado

---

## [14/06/2026] — Fixes modal caixa + NF-e cooperado

### Modal Caixa Fechado
- `components/comercializacao/ModalCaixaFechado.tsx`: máscara de moeda
  pt-BR no campo "Saldo inicial" (formato ATM, inputMode="numeric")
- `lib/comercializacao/caixa.actions.ts`: `abrirCaixa()` convertida
  para padrão `return { success, error }` (fix "Failed to fetch")
- `app/(sistema)/comercializacao/caixa/page.tsx`: `handleAbrirCaixa`
  verifica `result.success` antes de chamar `init()`
- Pré-seleção automática do produtor ao chegar na tela do caixa com
  `?produtor_id=` na URL — incluindo produtor sem movimentação prévia

### NF-e Entrada — CFOP Cooperado
- `lib/focusnfe/emitir-nfe-entrada.ts`: adicionado `cooperado_id` ao
  select do produtor na query
- Lógica de CFOP atualizada: `!!produtor.cooperado_id || tipo === 'cooperado'`
  → garante CFOP 1159 para produtores promovidos via `cooperado_id`
- **Testado e aprovado pela SEFAZ em homologação:**
  - CFOP 1102 (externo) ✅ — NF-e nº 1, série 2
  - CFOP 1159 (cooperado) ✅ — NF-e nº 3, série 2

### Fix e-mail boas-vindas
- `lib/cooperados/actions.ts`: tratamento de erro "e-mail já em uso"
  nas 3 actions — retorna mensagem amigável em vez de quebrar
- Opção "Cooperado" removida do select de tipo no cadastro de produtor
  (tipo cooperado definido exclusivamente via "Promover a cooperado")

---

## [12/06/2026] — Sessão: NF-e Entrada + Dashboard Cotação Cacau

### NF-e de Entrada via Focus NFe
- Integração completa em homologação (série 2)
- `lib/focusnfe/client.ts`, `lib/focusnfe/emitir-nfe-entrada.ts`
- `lib/comercializacao/nfe.actions.ts`: `emitirNfeEntradaAction`, `getNfeStatus`
- `components/comercializacao/ModalNfeEntrada.tsx`: modal pós-entrega + botão dinâmico no diário
- Migration 029b: ajustes em `notas_entrega` (produtor_id→produtores, status expandido, colunas fiscais)
- Fix `data_emissao`: cálculo correto UTC-3 sem `.toISOString()` ingênuo
- Parâmetros: NCM 18010000, CFOP 1102/1159, ICMS CST 41, PIS/COFINS CST 72, frete '9'

### Dashboard Admin — Cotação Cacau
- Migration 032: `cotacoes_mercado_externo` + `config_precos_sugeridos`
- Cron `/api/cron/cotacoes-cacau` (1x/dia 08:00): precodocacau.com.br + Yahoo Finance
- Card "Cotação do Cacau": cotações, tendência 7d, sugestão de preços, botão "Aplicar cotação"
- Widgets TradingView ao vivo: COCOA + FX_IDC:USDBRL
- Card visível apenas para `organizacoes.tipo === 'cooperativa'`

### Infraestrutura
- Fix: schedule Vercel Hobby — apenas 1x/dia ("0 8 * * *")
- Fix: CRON_SECRET — Vercel usa secret interno próprio para autenticação de crons
- Fix: deploys travados via `vercel --prod --yes`

---

## [Em desenvolvimento]

### Pendente
- Migration 029 — `notas_entrega` + comprovantes térmicos 80mm + NF-e entrada
- Migration 030 — `solicitacoes_aporte` (SQL pronto, aguardando aplicação)
- Migration 031 — tabela `enderecos` centralizada (usuario, cooperado, produtor, org)
- Títulos "boiando" — remover `<h1>` solto em páginas do Comercialização e outros módulos
- Perfil — modo somente leitura por padrão, editar ao clicar
- Perfil — remover título "Meu perfil", reposicionar "Conta ativa"
- Changelog — tela `/admin/changelog` no superadmin
- Expandir componente `<Btn>` para outros módulos (financeiro, assembleias, etc.)

---

## [11/06/2026] — Dashboard Comercialização + UI + Perfil

### Dashboard de Comercialização
- Dashboard com 4 métricas do dia: entregas, saldo em caixa, produtores e lotes abertos
- Gráfico de barras com entregas dos últimos 7 dias (em kg)
- Card de sessão de caixa com aportes, sangrias e saldo atual
- Tabela de últimas entregas (disponível após migration 029)
- Modal de abertura de caixa direto no dashboard (sem navegar para /caixa)
- Modal de solicitação de aporte com valor + motivo
- Múltiplas sessões: admin vê todas as sessões abertas, atendente vê só a própria
- Alerta de solicitações de aporte pendentes visível apenas para admin
- Saldo do último fechamento exibido quando caixa está fechado
- Botões de navegação (Produtores / Caixa / Diário) no cabeçalho
- Botão Diário visível apenas para admin

### Redirecionamento por função
- Usuários com função `caixa_cacau` redirecionados para `/comercializacao` ao fazer login
- Admin e super_admin continuam indo para `/dashboard`

### Componente `<Btn>` centralizado
- Criado `components/ui/Btn.tsx` com `Btn` e `BtnLink`
- Padrão: outline cinza neutro + hover com fundo escurecido + scale
- Todas as variantes (marrom, verde, roxo, cinza) usam cinza neutro visualmente
- Tabler Icons adicionado via CDN no `app/layout.tsx`
- Aplicado em: dashboard comercialização, produtores, caixa, diário, perfil

### Formatação de valores
- Criado `lib/comercializacao/fmt.ts` com `fmtReal()` e `fmtNum()`
- Todos os valores monetários no módulo comercialização no formato `R$ 1.000,00`

### Padronização de botões (Comercialização)
- Hierarquia unificada com componente `<Btn>`
- Aplicado em: caixa, produtores, diário, dashboard, perfil

### Tela de perfil
- Layout duas colunas: dados pessoais + vínculo/módulos/notificações/atividade
- Função exibida com label amigável ("Operador de Caixa" em vez de `caixa_cacau`)
- Mapeamento `FUNCAO_LABEL` centralizando todos os labels de função
- Módulos com acesso calculados automaticamente pelas funções do usuário
- Vínculo com organização: nome, função, tipo de vínculo, data de entrada
- Atividade recente: último acesso + membro desde
- Notificações: estrutura visível, funcionalidade em breve
- CPF, endereço e município adicionados ao formulário

---

## [09/06/2026] — Tesouraria Fase 1

### Caixa
- CPF/nome com auto-detecção e mascaramento
- Formatação inteligente de kg via `KgDisplay`
- `PixInput` com detecção automática do tipo de chave
- Operações do dia via `getOperacoesHoje`
- Botões de ação contextuais no perfil do produtor
- Aporte/sangria com autenticação admin inline (`signInWithPassword`)
- Fechamento automático com contagem física opcional
- Diário de Caixa em `/comercializacao/diario` com drill-down por sessão
- Permissão `diario_caixa` criada
- PDF de fechamento A4 via pdf-lib (client-side)
- Comprovante de entrega funcionando

### Migration 028
- `snapshot_estoque` (jsonb) em `sessoes_caixa`
- `saldo_especie_calculado` em `sessoes_caixa`
- Tabela `aportes_sangrias` criada

---

## [05/06/2026] — Landing + Infraestrutura

- Landing page responsiva com NavbarMobile
- Logo NexCoop em toda a plataforma
- Upload de logo da org em Configurações → Perfil
- Sidebar com logos lado a lado (NexCoop + org)
- 6 templates de e-mail HTML
- Redefinição de senha validada
- Troca de senha no perfil do usuário

---

## [01/06/2026] — DNS + Domínio

- DNS propagado: `nexcoop.com.br` → A `216.198.79.1`
- CNAME www → `9c1a8a13a65ac993.vercel-dns-017.com`
- Supabase Auth URL atualizada para `nexcoop.com.br`
- `nexcoop.vercel.app` mantido como fallback

---

## Módulos implementados

| Módulo | Status | Migrations |
|---|---|---|
| Autenticação / Login | ✅ | — |
| Onboarding de org | ✅ | — |
| Cooperados / Filiados | ✅ | — |
| Financeiro | ✅ | — |
| Assembleias | ✅ | — |
| Documentos | ✅ | — |
| Mensalidades | ✅ | — |
| Stripe / Webhook | ✅ (teste) | — |
| Super Admin | ✅ parcial | — |
| Captação de Recursos | ✅ | 008 |
| Módulo Contábil | ✅ | 015–024 |
| Loja Agropecuária — Fases 0–3 | ✅ | 014, 037 |
| Loja Agropecuária — Fase 4 PDV | ✅ | 038 |
| Comercialização — Tesouraria | ✅ | 025–028 |
| Comercialização — Notas/NF-e | ✅ | 029–030 |

### Fix ciclo de vida lote — 25/06/2026 (commits 9eb3172, 9693d20+)
- `LoteDetalhe.tsx`: guard expandido para `em_venda || entregue || pago` — botões fiscais visíveis em todos os estados pós-fechamento
- `STATUS` map: adicionado `pago` com ícone `ti-cash` verde
- `fn_atualizar_status_lote`: adicionada transição `pago` (migration 054c)
- `lib/comercializacao/devolucao.ts`: `processarPagamentoVendaAction` atualiza `lotes.status = 'pago'` além de `vendas_externas`
- **Causa raiz:** trigger `fn_atualizar_status_lote` avançava `lote.status` para `entregue` mas guard do header só aceitava `em_venda`

### Fix FiscalEntradasClient — 25/06/2026
- `app/api/comercializacao/entradas-nfe/route.ts` — criada API route GET que busca `notas_entrega` autorizadas via `createAdminClient()` com validação de auth
- **Causa raiz:** client component não pode usar `createAdminClient()` diretamente — precisa de API route ou server action

