# NexCoop — Contexto do Projeto

## Identificação
- **Produto:** NexCoop — SaaS multi-tenant para cooperativas, associações, sindicatos e outras organizações
- **Stack:** Next.js + TypeScript + Supabase + Vercel
- **Repositório:** giorgiocorreia/nexcoop (branch: main)
- **Pasta local:** C:\Users\Lenovo\Documents\nexcoop
- **Supabase project ID:** cufovlntqfobutwvfcea
- **URL produção:** nexcoop.com.br
- **Super admin:** gio.pessoal@gmail.com (Giorgio Correia, sem org)
- **Org admin COOPAIBI:** giorgio@coopaibi.com.br
- **IA:** process.env.ANTHROPIC_API_KEY, modelo padrão claude-haiku-4-5-20251001
- **Claude Code:** `claude --dangerously-skip-permissions`
- **Pagamentos:** Stripe (modo teste)
- **E-mail:** Zoho Mail (suporte@nexcoop.com.br, smtp.zoho.com:465) — SPF/DKIM configurados

---

## Organização de teste — COOPAIBI
- **Nome:** Cooperativa Mista Agropecuária de Ibirataia
- **CNPJ:** 54.305.114/0001-79
- **Plano:** Essencial
- **Território:** Médio Rio de Contas, Bahia (16 municípios)
- **Áreas:** cacau, agrofloresta, pecuária, mel, plantas medicinais

---

## Padrão visual
- Fundo geral: `#f8f7f4`
- Cards: branco, `border: 1px solid #e5e3dc`, `border-radius: 12px`, `font-family: system-ui`
- Sem libs de UI externas — tudo inline styles
- Cores por módulo: sidebar `#635BFF` | captação `#1D9E75` | contábil `#0F766E` | loja `#E07B30` | comercialização `#92400e`
- Tipografia: Sora (headings), Inter (body) via next/font/google
- Ícones: Tabler Icons via CDN em `layout.tsx`
- Componente `Btn`/`BtnLink` centralizado em `components/ui/Btn.tsx`
  - Padrão: cinza/outline neutro, hover scale+escurecer
  - Variante "azul": `#378ADD` bg/borda, texto branco, hover `#185FA5`
  - Variante "marrom-outline": outline `#92400e`, hover sólido marrom, texto branco
  - Variantes marrom/verde/roxo: ainda cinza neutro (pendente cores reais)
- Card azul reutilizável: fundo `#E6F1FB`, label `#185FA5`, valor `#042C53`
- `lib/comercializacao/fmt.ts` → `fmtReal()` para formatação pt-BR
- **Sidebar colapsável** (15/06/2026): 56px (ícones) / 240px (expandido), toggle com ícone Tabler, estado persiste em `localStorage`
- **Toast system global** (15/06/2026): `ToastProvider` em `MainContent.tsx` — `success` (5s auto-fechar), `error` (manual), `warning` (5s), `info` (manual)
- **Breadcrumb** padrão loja: NexCoop/Loja/SubPágina — clicável, substitui títulos garrafais `<h1>`

---

## Migrations aplicadas
- 001–007: base (organizacoes, usuarios, cooperados, financeiro, assembleias, documentos, mensalidades)
- 008: captacao (oportunidades, oportunidade_logs, perfil_captacao)
- 009–013: captacao continuação
- 014: loja (schema inicial)
- 015–024: módulo contábil completo
- 025–029b: comercialização (produtores, contas, caixa, safras, lotes, vendas, NF-e entrada)
- 030: solicitacoes_aporte (pendente aplicar)
- 031: enderecos centralizada (pendente aplicar)
- 032: cotacoes_mercado_externo + config_precos_sugeridos
- 033: colunas em produtores (usuario_id, dados_fiscais, is_consumidor_final)
- 034/035: drop tabela membros (criada e revertida — conceito já existia como cooperados)
- 036: perfil de usuário (dados pessoais, atividades recentes)
- 037: loja_compras expandida (numero_nf, data_compra, valor_frete, outros_custos_valor, outros_custos_descricao, observacoes)
- 038: loja_sangrias (PDV — registra sangrias do caixa da loja)
- 039: (reservado)
- 040: NCM/CFOP em loja_produtos, 5 colunas fiscais em organizacoes, tabela loja_notas_fiscais
- 041: colunas cartao_nsu, cartao_autorizacao, pix_identificador, desconto_total, pago_saldo em loja_vendas

**Próxima migration:** 042

---

## Tabelas principais
- `organizacoes`
- `usuarios` (funcoes text[], vinculo text — pendente: somente_leitura boolean)
- `cooperados` (vínculo societário: CAF, DAP, quota_parte, status, matrícula, usuario_id)
- `produtores` (identidade cadastral: CPF, nome, endereço, dados produção/fiscais, cooperado_id, usuario_id, dados_fiscais, is_consumidor_final)
- `lancamentos`, `assembleias`, `documentos`, `mensalidades`, `notificacoes`
- `oportunidades`, `oportunidade_logs`, `perfil_captacao`
- `sessoes_caixa`, `movimentos_caixa`, `saldos_produto`, `notas_entrega`
- `lotes`, `vendas_externas`, `cotacoes`, `cotacoes_mercado_externo`, `config_precos_sugeridos`
- `plano_contas`, `lancamentos_contabeis`, `audit_logs`
- `profissionais_parceiros`, `empresas_parceiras`

---

## Modelo Membro/Produtor/Usuário (13/06/2026)
- `produtores` = identidade cadastral única (base de tudo, CPF/nome/endereço/dados produção)
- `cooperados` = vínculo societário 1:1 (via produtores.cooperado_id) — CAF, DAP, quota_parte, status, matrícula
- `usuarios` = login; cooperados sempre têm usuario_id (acesso ao Portal do Filiado)
- **Assimetria:** Usuário/Cooperado → cria produtor espelho automático; Produtor → não cria cooperado (botão "Promover a cooperado")
- **3 server actions** em `lib/cooperados/actions.ts`:
  - `criarUsuarioComCooperadoOpcional` — usuário com checkbox "é cooperado?"
  - `criarCooperado` — cria cadeia completa usuario+cooperado+produtor
  - `promoverProdutorACooperado` — promove produtor externo existente
- **Backlog futuro:** renomear `cooperados` → `membros` (terminologia genérica via tipos_org)
- **flag `somente_leitura`** em usuarios (pendente migration) — para presidente COOPAIBI ver sem editar

---

## Status dos módulos
| Módulo | Status |
|---|---|
| Autenticação / Onboarding / Configurações org | ✅ |
| Cooperados / Filiados | ✅ |
| Financeiro / Assembleias / Documentos / Mensalidades | ✅ |
| Stripe (modo teste) | ✅ |
| Super Admin — painel, orgs, changelog | ✅ |
| Captação (CRM/Kanban + Radar CAR/Bahia) | ✅ |
| Contábil completo (migrations 015–024, 13 telas) | ✅ |
| Comercialização / Caixa Cacau | ✅ |
| NF-e entrada via Focus NFe | ✅ (homologação) |
| Dashboard Admin (cotação cacau + TradingView) | ✅ |
| Audit logs | ✅ |
| Gestão de usuários (Configurações → Usuários) | ✅ (convidar + cadastrar) |
| Portal do Filiado | ❌ (planejado, chat dedicado) |
| Loja Agropecuária — Fases 0–3 | ✅ (infra, catálogo, compras/estoque) |
| Loja Agropecuária — Fase 4 PDV | ✅ (migration 038, PDV completo) |
| Loja Agropecuária — Fase 5 Relatórios | ✅ (Hub, Produtos inline, Rel. Caixa/Vendas/Estoque, sidebar submenus, impressão 80mm) |
| Super Admin — Módulos/Usuários/Planos | ❌ |
| Captação — Alertas, MI, Perfil org | ❌ |

---

## Ficha do Produtor (13/06/2026)
- Tela unificada `/comercializacao/produtores/[id]`
- Layout: botões → dados cadastrais → extrato → card saldos
- "Voltar" à esquerda, demais botões à direita (todos padrão Btn)
- Dados cadastrais: leitura (campos vazios ocultos) / editar ao clicar (todos visíveis)
- Card Saldos no fim: kg × cotação atual (estimativa), saldo financeiro, total estimado
- Modal "Caixa fechado": intercepta ações → 2 etapas → abre caixa → redireciona com produtor_id+acao
- "Ver perfil" removido da listagem — fica só "Ver ficha"
- Botão "Promover a cooperado" visível apenas se cooperado_id === null

---

## Configurações → Usuários (13/06/2026)
- Botão "+ Convidar usuário" (já existia) — envia e-mail de convite
- Botão "+ Cadastrar usuário" (novo) — admin preenche tudo + senha temporária gerada
  - Modal com checkbox "é cooperado?" → chama `criarUsuarioComCooperadoOpcional()`
  - Exibe senha temporária ao final (destacada, botão "Copiar credenciais")
- Botão "Enviar e-mail de boas-vindas" disponível após promoção
  (ficha do produtor) e após cadastro (modal cadastrar usuário)
- Tratamento de erro "e-mail já em uso" com mensagem amigável no modal
- SMTP: Zoho Mail via nodemailer (SMTP_USER + SMTP_PASS no env)
- Hotmail/Outlook bloqueando — pendente DMARC (próximo chat)

---

## NF-e de Entrada — Focus NFe (FUNCIONANDO, 12/06/2026)

### Arquivos
```
lib/focusnfe/client.ts
lib/focusnfe/emitir-nfe-entrada.ts
lib/comercializacao/nfe.actions.ts
components/comercializacao/ModalNfeEntrada.tsx
```

### Configuração
- Série 2 (homologação), tokens: FOCUSNFE_TOKEN_HOMOLOGACAO, FOCUSNFE_TOKEN_PRODUCAO
- FOCUSNFE_AMBIENTE=homologacao
- NCM: 18010000, CFOP: 1159 (cooperado) / 1102 (externo)
- ICMS CST 41, PIS/COFINS CST 72
- modalidade_frete: '9', FUNRURAL 1,63%

### Armadilha de fuso resolvida
```ts
const agoraBrasilia = new Date(Date.now() - 3*60*60*1000)
const dataEmissao = agoraBrasilia.toISOString().replace('Z','-03:00')
```

### isCooperado
```ts
const isCooperado = !!produtor.cooperado_id || produtor.tipo === 'cooperado'
```
Garante CFOP 1159 para produtores promovidos via `cooperado_id` (campo `tipo` não é atualizado na promoção).

### Testado em homologação
- CFOP 1102 (externo) ✅ — NF-e nº 1, série 2
- CFOP 1159 (cooperado) ✅ — NF-e nº 3, série 2

### Pendente
- NF-e de saída (venda moageira)
- Aguardando dados do contador Marcos (Contabahia, mrogerio@contabahia.com.br): regime tributário, certificado A1, série/número inicial, CFOP produtor rural sem IE, CST/CSOSN, FUNRURAL, NCMs com ST

---

## Dashboard Admin — Cotação Cacau (13/06/2026)
- Card visível apenas para organizacoes.tipo === 'cooperativa'
- Fontes: precodocacau.com.br (fonte='cepea') + Yahoo Finance (CC=F + USDBRL=X)
- Cron: /api/cron/cotacoes-cacau, 1x/dia "0 8 * * *" (limite Hobby Vercel)
- Botão "Aplicar cotação" → registrarCotacao() upsert em cotacoes
- Widgets TradingView: símbolo COCOA e FX_IDC:USDBRL

---

## Serviços ativos
- **Focus NFe** — R$89,90/mês, homologação
- **Jina.ai** (`https://r.jina.ai/` + url) — Radar, só CAR/Bahia funciona
- **Zoho Mail** — suporte@nexcoop.com.br
- **Supabase Storage** — documentos, logos, manuais
- **Vercel** — deploy, env vars, cron (Hobby: máx 1x/dia — SEMPRE "0 H * * *")
- **TradingView widgets** — symbol-overview

---

## Loja Agropecuária (15/06/2026)

### Controle de módulos por org (Passo 0)
- `organizacoes.modulos_ativos` (text[]): lista de módulos habilitados por org (`'loja'`, `'comercializacao'`, etc.)
- `lib/org.ts` → `getModulosAtivos()`: lê os módulos ativos da org do usuário logado
- Sidebar condicional: itens de Loja e Comercialização ocultos se módulo inativo
- Middleware: bloqueia rotas `/loja/*` e `/comercializacao/*` conforme `modulos_ativos`

### Fase 1 ✅ — Tipos e actions base
- `lib/loja/types.ts`: tipos TypeScript para todos os modelos (produto, categoria, compra, lote de estoque)
- `lib/loja/actions.ts`: server actions CRUD para produtos, categorias, compras, ajuste de estoque
- `lib/permissoes.ts`: permissões `loja_admin`, `loja_operador`, `loja_caixa`

### Fase 2 ✅ — Catálogo de produtos e categorias
- `/loja` — dashboard da Loja (resumo estoque, compras recentes)
- `/loja/produtos` — listagem de produtos com busca e filtros
- `/loja/produtos/novo` — cadastro de produto (nome, categoria, preço, desconto cooperado)
- `/loja/produtos/[id]` — detalhes e edição do produto
- `/loja/categorias` — gestão de categorias

### Fase 3 ✅ — Compras e controle de estoque
- `/loja/estoque` — visão geral do estoque (por lote, FIFO)
- `/loja/estoque/ajuste` — ajuste manual de estoque com motivo
- `/loja/compras` — listagem de compras/notas de entrada
- `/loja/compras/nova` — registro de compra com rateio proporcional de frete e outros custos ao valor de cada item
- `/loja/compras/[id]` — detalhes da compra e itens

### Fase 4 ✅ — PDV (15/06/2026)
- Migration 038: tabela `loja_sangrias`
- 6 actions PDV em `lib/loja/pdv.actions.ts`: `abrirCaixaLoja`, `buscarCooperadoPorCPF`, `validarSenhaAutorizador`, `finalizarVenda` (FIFO), `cancelarVenda`, `registrarSangriaLoja`
- 7 componentes em `app/(sistema)/loja/pdv/components/`: `ModalAutorizacao`, `ModalQuantidade`, `BadgeCooperado`, `PainelProdutos`, `PainelCarrinho`, `ModalPagamento`, `ModalComprovante`
- `ModalFechamentoCaixa` com resumo financeiro e impressão de relatório 80mm
- API routes: `/api/loja/comprovante/[id]` e `/api/loja/fechamento/[id]` (térmico 80mm)
- Validação de estoque insuficiente no `PainelCarrinho` com toast
- Máscara CPF no campo de busca de cooperado
- `buscarCooperadoPorCPF` corrigida: busca em `cooperados.cpf` diretamente
- Funções `gerente_loja`, `caixa_loja`, `estoquista_loja` inseridas em `funcoes_disponiveis`
- Módulo `'loja'` ativo no COOPAIBI

### Correções aplicadas (16/06/2026)
- `buscarCooperadoPorCPF`: usa `adminClient`, busca direto em `cooperados.cpf`, saldo via `produtores` FK
- `loja_vendas`: campos corretos (`pago_saldo` em vez de `pago_conta`, sem `desconto_total`)
- `loja_venda_itens`: sem `desconto_pct` nem `desconto_autorizado_por` (campos não existem no schema)
- Comprovante PDF: queries separadas sem joins para evitar falhas silenciosas
- Cartão débito/crédito: campos NSU e autorização, `pago_cartao` em `loja_vendas`
- Modal comprovante: fecha automaticamente após imprimir
- Máscara CPF: usa `slice` em vez de regex encadeada

### Fase 5 ✅ — Dashboard e Relatórios (18/06/2026)
- Hub `/loja` com gráfico SVG de vendas dos últimos 7 dias + KPIs (vendas do dia, ticket médio, produtos vendidos) + alertas de estoque
- Tela `/loja/produtos` com inline edit (edição direto na tabela, sem modal)
- Relatório de Caixa `/loja/relatorio/caixa/[id]`: fechamento por caixa com totais por forma de pagamento + impressão térmica 80mm via route handler HTML puro (`/imprimir/caixa/[id]`)
- Relatório de Vendas `/loja/relatorio/vendas`: filtros por período/cooperado/produto, exportação CSV
- Relatório de Estoque `/loja/relatorio/estoque`: posição atual + movimentações por produto/período
- Sidebar global com submenus expansíveis da Loja (Catálogo, PDV, Relatórios, Configurações)
- FAB removido — navegação 100% via sidebar

### Schema real da Loja (confirmado em produção)
- `loja_vendas` — cabeçalho da venda (caixa_id, cooperado_id, total, formas de pagamento)
- `loja_produtos` — catálogo com preço, desconto cooperado, estoque mínimo
- `loja_venda_itens` — itens da venda (produto_id, quantidade, preco_unitario, desconto_pct)
- `loja_caixas` — sessões de caixa (abertura, fechamento, totais)
- `loja_lotes` — lotes de estoque com custo, data de entrada, FIFO
- `loja_sangrias` — sangrias e aportes do caixa
- `loja_estoque_movimentos` — movimentações de estoque (entradas, saídas, ajustes)

### Impressora térmica
- Modelo: Epson TM-T88VI
- Driver/método: POS-80 via Chrome `window.print()` (CSS `@page { width: 80mm }`)
- Corte: manual (sem ESC/POS direto)
- Route handler para impressão: `/imprimir/caixa/[id]` → HTML puro sem layout Next.js, imprime e fecha janela

### Funções de usuário da Loja (Fase 6 — filtros por função pendente)
- `operador_caixa` / `caixa_loja` — opera o PDV
- `estoquista_loja` — gerencia estoque
- `gerente_loja` — autoriza descontos e sangrias, acessa relatórios
- Filtros de acesso por função nas telas de relatório: **pendente**

### Fase 6 — Preparação Fiscal (18/06/2026 — em andamento)
- Migration 040 aplicada: `ncm` + `cfop_saida` em `loja_produtos`; 5 colunas fiscais em `organizacoes`; tabela `loja_notas_fiscais` criada com RLS
- Campo NCM em `loja_produtos`: inline edit na listagem + badge "NCM ok"/"Sem NCM" + campo nos formulários criar/editar
- Tela `/configuracoes/fiscal-loja`: configuração de CSC NFC-e, série NFC-e/NF-e, regime tributário + card de status com contagem de produtos sem NCM
- `lib/loja/fiscal-actions.ts`: `salvarFiscalLoja()` com adminClient + registrarLog
- **Modal de nota fiscal no PDV** (19/06/2026): `ModalNotaFiscal` com seleção NFC-e/NF-e, campos CPF/CNPJ, detecção de fiscal configurado via `loja_nfe_saida_serie`/`loja_nfce_csc_token`; `ModalComprovante` atualizado com botão condicional "Emitir nota fiscal"
- **Emissão de NF-e/NFC-e**: pendente de dados do escritório contábil (CSC, NCMs dos produtos, CSTs, regime tributário confirmado)

### Decisões consolidadas

| Decisão | Detalhe |
|---|---|
| Desconto por produto | `desconto_cooperado` boolean + `desconto_cooperado_pct` decimal |
| Desconto acima do padrão | exige senha de gerente/admin (mesmo fluxo do aporte/sangria) |
| Formas de pagamento PDV | dinheiro, Pix, conta corrente |
| Conta corrente | só cooperado identificado + saldo suficiente + módulo comercializacao ativo |
| Conta corrente — tabelas | `contas_produtor` / `movimentacoes_conta` tipo `'compra_loja'` |
| Nomenclatura UI | "Conta corrente" e "Saldo em conta corrente" — nunca "fiado" ou "crédito cooperado" |
| Baixa de estoque | FIFO (lote mais antigo primeiro) |
| Entrada de mercadoria | por compra completa (`loja_compras` + `loja_compra_itens`) com rateio proporcional |
| Sangria | exige senha de gerente/admin (mesmo fluxo do desconto extra) |
| Controle de acesso | `modulos_ativos text[]` em `organizacoes` controla acesso à Loja por org |

---

## Regras críticas de arquitetura
- **NUNCA usar `auth_org_id()`** — sempre subquery: `(select organizacao_id from usuarios where id = auth.uid())`
- **Writes de nível org via `createAdminClient()`** (bypassa RLS)
- **Permissões apenas via `lib/permissoes.ts`** — nunca inline
- **Types em `types/database.ts`** — atualizar manualmente a cada nova tabela
- **Migrations via Supabase Dashboard SQL Editor** — `supabase link`/`db push` não funcionam
- Joins PostgREST: FK ambígua deve ser referenciada explicitamente (ex: `sessoes_caixa!sessao_caixa_id`)
- Estoque físico e virtual (`saldos_produto`) são independentes — não criar constraint bloqueando
- pdf-lib para PDFs (pdfkit incompatível com Vercel serverless)
- Regex com flag /s requer `target: es2018+` no tsconfig

---

## Lições críticas de infra
1. Vercel Hobby: cron máx 1x/dia — schedule errado falha build silenciosamente
2. CRON_SECRET manual pode ficar com `\r` ou vazio — Vercel usa seu próprio secret interno
3. Para destravar deploys: `vercel login → vercel link → vercel --prod --yes`
4. Regex `/s` exige `target: es2018+` — erro TS1501 falha build silenciosamente

---

## Fluxo de trabalho Giorgio → Claude Code
1. Giorgio descreve o que quer
2. Claude Code implementa diretamente (sem pedir confirmação a cada passo)
3. Testar em localhost → aprovar → commit por feature (máx 5-6 arquivos por commit)
4. Deploy quando estável (não a cada commit)
5. Sempre terminar com `git add + commit + push`

---

## Backlog priorizado
1. Flag `somente_leitura` em usuarios (presidente COOPAIBI)
2. Hotmail/Outlook DMARC — configurar no Zoho para e-mails não caírem em spam
3. Fluxo fiscal completo: NF-e saída + ZIP XMLs + comprovante térmico 80mm
4. Portal do Filiado (chat dedicado): /filiado mobile-first, login CPF+senha, /login?org=slug
5. tipos_org configurável (super_admin sem deploy)
6. Renomear cooperados → membros (terminologia genérica)
7. Níveis de acesso parceiro contábil (responsavel/operador/consultor)
8. Remover "Mensalidades" sidebar para cooperativas
9. BotaoPdfSessao no Diário de Caixa + renomear "Imprimir Relatório"
10. Btn.tsx variantes marrom/verde/roxo com cores reais
11. Loja Agropecuária — Fase 6: controle de acesso por função (operador_caixa/estoquista_loja/gerente_loja), NF-e saída, relatórios A4, Entradas NF-e tela dedicada
12. Captação — Radar avançado, alertas, geração de MI
13. Stripe live, 2FA, Sobras/REFAC
14. Fluxo convite contador (embolado — chat separado)

---

*Última atualização: 18/06/2026 — Loja Fase 6 iniciada ✅ (migration 040, NCM, config fiscal)*
