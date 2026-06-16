# NexCoop — Changelog

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
