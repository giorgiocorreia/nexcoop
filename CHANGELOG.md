# NexCoop — Changelog

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
| Loja Agropecuária | ⏸ pausada | 014 |
| Comercialização — Tesouraria | ✅ | 025–028 |
| Comercialização — Notas/NF-e | 🔜 próximo | 029–030 |
