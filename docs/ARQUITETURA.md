# NexCoop — Arquitetura e Regras Permanentes

## Stack
- Next.js + TypeScript + Supabase + Vercel
- Repositório: giorgiocorreia/nexcoop (branch: main)
- Pasta local: C:\Users\Lenovo\Documents\nexcoop
- Supabase project ID: cufovlntqfobutwvfcea
- URL produção: nexcoop.com.br

## Regras críticas — NUNCA violar

- NUNCA usar `auth_org_id()` — sempre subquery: `(select organizacao_id from usuarios where id = auth.uid())`
- Writes de nível org via `createAdminClient()` (bypassa RLS)
- Relatórios e queries de dados: sempre `createAdminClient()` — RLS bloqueia joins cross-table
- Joins PostgREST com FK ambígua: especificar explicitamente (ex: `usuarios!loja_caixas_usuario_id_fkey`)
- Migrations via Supabase Dashboard SQL Editor — nunca `npx supabase db push`
- `npx tsc --noEmit` antes de todo commit
- Permissões apenas via `lib/permissoes.ts` — nunca inline
- Types em `types/database.ts` — atualizar a cada nova tabela
- Estoque físico e virtual (`saldos_produto`) são independentes
- pdf-lib para PDFs (pdfkit incompatível com Vercel serverless)
- Regex com flag /s requer `target: ES2018+` no tsconfig

## Padrões de código

- `createAdminClient()` para: writes org-level, relatórios, queries cross-table
- `createClient()` apenas para: auth.getUser(), verificar permissões do usuário logado
- Server actions: sempre `"use server"` + try/catch + `traduzirErro()`
- Migrations: sequenciais, nunca pular número, aplicar manualmente no Dashboard

### Separação server actions vs utilitários puros
- Arquivos com `"use server"` só podem exportar funções `async`
- Funções puras (parse, formatação, cálculo — sem I/O) NUNCA entram em arquivo `"use server"`
- Padrão: `lib/modulo/feature.ts` (server actions) + `lib/modulo/feature-utils.ts` (utilitários puros importáveis no client)
- Exemplo: `devolucao.ts` (actions) + `devolucao-xml.ts` (parse XML puro)

## Padrão visual — Design System (atualizado jul/2026)

Todas as páginas usam o **UI kit compartilhado** em `components/nexcoop/ui/` (reexporta de `components/comercializacao/ui/`).

### Import padrão
```ts
import {
  PageLayout, HubStyles, KpiCard, LinkCard, ContentCard, Badge,
  EmptyState, Input, Select, COM_C,
  MODULO_NEXCOOP, MODULO_LOJA, MODULO_CONTABIL,
  MODULO_CAPTACAO, MODULO_CONFIG, MODULO_ESCRITORIO,
} from '@/components/nexcoop/ui'
```

### Tokens `COM_C`
```ts
// components/comercializacao/ui/tokens.ts
COM_C = {
  marrom: '#92400e', marromLt: '#FEF3C7',   // Comercialização
  verde:  '#16A34A', verdeLt:  '#F0FDF4',   // Ações primárias / Contábil
  azul:   '#2563EB', azulLt:   '#EFF6FF',
  roxo:   '#635BFF', roxoLt:   '#EEF0FF',   // Dashboard / Cooperados / Financeiro
  laranja:'#E07B30', laranjaLt:'#FFF7ED',   // Loja
  vermelho, vermelhoLt, borda: '#E5E3DC', bg: '#FBF8F4',
  txt: '#1C1917', txtSub: '#78716C',
}
```

Cor de destaque por módulo (ícone do header + KPIs):
- Dashboard / Cooperados / Financeiro / Mensalidades: `COM_C.roxo`
- Assembleias / Documentos: `COM_C.azul`
- Captação / Contábil: `COM_C.verde`
- Loja: `COM_C.laranja`
- Comercialização: `COM_C.marrom`

### Estrutura de página — `PageLayout`

**Hubs** (dashboard, loja, comercialização): `HubStyles` + header sticky manual ou `PageLayout` com `semBreadcrumb`.

**Subpáginas e listas**:
```tsx
<PageLayout
  titulo="Financeiro"
  subtitulo="Lançamentos do período"
  icone="ti-receipt-2"
  modulo={MODULO_NEXCOOP}          // ou MODULO_LOJA, MODULO_CONTABIL, etc.
  breadcrumb={[{ label: 'Financeiro' }]}
  acoes={<Btn>Nova ação</Btn>}
>
  {/* conteúdo */}
</PageLayout>
```

`PageLayout` inclui: header sticky (88px), breadcrumb, ícone Tabler, área `com-hub-content`.

### Componentes do kit
- `KpiCard` — métricas agregadas (hubs e listas)
- `LinkCard` — navegação entre seções
- `ContentCard` — blocos de conteúdo/tabelas
- `Badge`, `EmptyState`, `Field`/`Input`/`Select`, `Modal`, `Tabs`, `ListRow`

### Regras gerais
- Sem libs UI externas — inline styles + kit compartilhado
- Ícones: Tabler Icons (`ti ti-*`)
- Font: system-ui
- **Não** criar headers locais com `padding: 32` — usar `PageLayout`
- PDV (`/loja/pdv`) mantém layout full-screen próprio (exceção)

## Responsividade Mobile (a partir de 24/06/2026)

> **Sugestões e roadmap visual:** ver `docs/SUGESTOES_MOBILE_VIEW.md` (P0 aplicado em 2026-07-21).

### Breakpoints padrão
- `1024px` — tablet: KPI grid 3 colunas, chart-row em coluna única
- `768px` — sidebar vira drawer
- `640px` — header compacto, KPI 2 colunas, modal bottom sheet, padding reduzido
- `360px` — KPI 1 coluna (telas muito estreitas)

### Sidebar mobile
- Abaixo de `768px` o sidebar vira drawer (slide-in da esquerda, largura 280px)
- Implementado em `components/Sidebar.tsx` + `app/(sistema)/MainContent.tsx`
- Hamburger **integrado à marca**: chip translúcido, ícone branco, 44×44, `top:8 left:8 zIndex:201` (classe `.nxc-menu-btn`)
- Ícone alterna menu ↔ X via evento `sidebar-mobile-state` `{ open: boolean }`
- Overlay `rgba(0,0,0,0.45) zIndex:199` fecha o drawer ao clicar fora
- Drawer aberto: `box-shadow: 8px 0 28px rgba(0,0,0,0.22)`
- Botão de retração (collapse/expand) oculto no mobile (`ToggleBtn` retorna `null` quando `isMobile`)
- Eventos: `sidebar-mobile-toggle` (abre/fecha), `sidebar-mobile-state` (sincroniza ícone)

### Header de página — regras obrigatórias
- O header sticky DEVE ter `margin: 0 -2rem 0 -2rem` para cancelar o padding do `<main>` e ocupar largura total
- O header DEVE ter `min-height: 88px` para alinhar com o cabeçalho do sidebar (16+56+16)
- No mobile (≤640px): `min-height: 56px; padding: 0 12px 0 56px`; breadcrumb e subtítulo ocultos; título 16px com ellipsis
- **Caso especial — layout full-screen (ex: PDV):** quando o root div tem `overflow: hidden` (necessário para conter scroll interno), o `margin: 0 -2rem 0 -2rem` no header filho é cortado pelo clipping. Solução: colocar `margin: 0 -2rem -2rem -2rem` no **root div** e usar apenas `padding: 0 32px` no header via CSS class. Isso distribui a expansão para toda a área raiz, não para o header isolado.
- Preferir `PageLayout` + `HubStyles` (classes `.com-page-header`, `.com-page-title`, etc.)
- Classe CSS padrão do header (legado):
```css
.page-header { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
@media (max-width: 640px) {
  .page-header { padding: 0 12px 0 56px; min-height: 56px; }
}
```
- `min-height: 88px` = 16px (padding sidebar) + 56px (logo sidebar) + 16px (padding sidebar)
- Mobile: `56px` para não ocupar espaço excessivo em telas pequenas
- `display: flex; align-items: center` DEVE estar na CSS class, não só no inline style

### Mobile UX (P0)
- Inputs/select/textarea: `font-size: 16px` no mobile (evita zoom iOS) — CSS em `MainContent`
- Modal: bottom sheet ≤640px (`Modal.tsx`)
- Banners de sistema: classe `.nxc-sys-banner` (empilha no mobile, padding-left 56px)

### KPI cards — quando usar
- **Usar:** páginas com dados agregáveis úteis — produtos, compras, estoque, caixas, conferência
- **Não usar:** páginas de cadastro simples — fornecedores, categorias, unidades, etc.

### CSS padrão completo de responsividade (copiar para cada página)
```css
.hub-header  { padding: 18px 32px; }
.hub-content { padding: 28px 32px; margin: 0 -2rem -2rem -2rem; background: #F8F7F4; }

@media (max-width: 1024px) {
  .hub-kpi-grid  { grid-template-columns: repeat(3, 1fr) !important; }
  .hub-chart-row { grid-template-columns: 1fr !important; }
  .hub-two-col   { grid-template-columns: 1fr !important; }
}
@media (max-width: 640px) {
  .hub-header    { padding: 12px 16px 12px 56px; }
  .hub-content   { padding: 16px; }
  .hub-date      { display: none; }
  .kpi-value     { font-size: 20px !important; }
  .hub-kpi-grid  { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
  .hub-two-col   { grid-template-columns: 1fr !important; }
}
```

## Infraestrutura Vercel

- Hobby: cron máx 1x/dia — schedule `0 H * * *` obrigatório
- CRON_SECRET: Vercel usa secret interno próprio — não configurar manualmente
- Deploy travado: `vercel --prod --yes` via CLI
- Variáveis sensíveis: `vercel env pull` mostra como `""`

## Serviços externos

- Focus NFe: R$89,90/mês, homologação ativa, certificado COOPAIBI válido ~07/2026
- Jina.ai: `https://r.jina.ai/` + url — só CAR/Bahia funciona (HTML estático)
- Zoho Mail: suporte@nexcoop.com.br, smtp.zoho.com:465 — Hotmail/Outlook bloqueando (DMARC pendente)
- Supabase Storage: documentos, logos, manuais
- TradingView widgets: symbol-overview (não mini-symbol-overview)
- Stripe: modo teste ativo
- Evolution API: provedor WhatsApp Business via QR Code, self-host no Railway. Webhook aponta para /api/whatsapp/webhook. Variáveis: EVOLUTION_API_URL, EVOLUTION_API_KEY. (planejado — implementação na próxima sessão)
- WhatsApp NexCoop: número 73999693548, conectado via Evolution API
- Meta Business Manager: conta criada, Instagram conectado, WhatsApp pendente de CNPJ

## Histórico de decisões arquiteturais

| Data | Decisão | Motivo |
|---|---|---|
| 2026-07-18 | Helpers de RLS (`get_org_id`/`get_user_role`) mantêm GRANT EXECUTE pra `authenticated` (migration 081), aceitando o warning do Security Advisor | Função chamada dentro de policy executa com o role do usuário da query — o REVOKE das 076/077 quebrou toda RLS de usuário comum (42501). Correção definitiva: policies com subquery inline (regra 1), migration futura |
| 2026-07-17 | Continuidade de caixa travada: abertura nunca é digitada, sempre o saldo sob responsabilidade recalculado das tabelas brutas (`lib/tesouraria/saldo-responsabilidade.ts`) | Elimina digitação errada/fraude na abertura; `valor_contado_especie` vira só auditoria (migration 074) |
| 2026-07-17 | Transferência entre caixas com dupla ponta linkada por `referencia_transferencia_id` (uuid gerado em código, não-FK) | As duas pontas vivem em tabelas diferentes (`aportes_sangrias` × `loja_sangrias`); rollback da segunda ponta deleta a primeira pelo mesmo id (migration 073) |
| 2026-07-04 | Redesign UI completo: Captação, Loja, Contábil, Configurações, Escritório, Perfil, Admin | Kit `components/nexcoop/ui` com `PageLayout` + `COM_C` em 52 arquivos |
| 2026-07-04 | Classificação automática escrituração + integração financeiro (mensalidades, cotas, loja) | Financeiro → Contábil em 2 camadas; migration 061 |
| 2026-07-04 | Cônjuge em produtor/cooperado + NF-e entrada em nome do cônjuge | Migration 060 |
| 2026-06-24 | Padrão visual sticky-header aplicado a todos os módulos (Loja, Dashboard, Cooperados, Financeiro, Mensalidades, Assembleias, Documentos) | Consistência de UX; PDV usa variante full-screen com margin no root div por causa de overflow:hidden |
| 2026-06-24 | `cotacoes.data` → `vigente_a_partir_de (timestamptz)` | Suporte a cotação intraday; rastreabilidade fiscal imutável por `cotacao_id` |
| 2026-06-24 | Lotes multi-produto via `lote_itens` | Cooperativas operam lotes com múltiplos produtos (ex: merenda escolar) |
| 2026-06-24 | Snapshots de agregação com triggers Postgres | Escalabilidade: evita SUM full-scan em volumes crescentes; consistência transacional garantida pelo banco |

## Modelo Produtor/Cooperado/Usuário

- `produtores` = identidade cadastral (base de tudo)
- `cooperados` = vínculo societário 1:1 via `produtores.cooperado_id`
- `usuarios` = login e acesso
- 4 fluxos em `lib/cooperados/actions.ts`:
  1. `criarCooperado` — cadastro direto com usuário
  2. `criarUsuarioComCooperadoOpcional` — usuário com checkbox "é cooperado?"
  3. `promoverProdutorACooperado` — promoção de produtor externo
  4. `vincularUsuarioComoCooperado` — usuário existente → cooperado (Configurações → Usuários)

## Modelo de dados — Comercialização

### Cotações (`cotacoes`)

**REGRA PERMANENTE:** cotações usam `vigente_a_partir_de (timestamptz)`, NÃO um campo `data (date)`.

- Uma cotação pode mudar múltiplas vezes no mesmo dia (intraday)
- A cotação ativa para um produto é sempre:
  ```sql
  SELECT * FROM cotacoes
  WHERE organizacao_id = $org AND produto_id = $produto
    AND vigente_a_partir_de <= now()
  ORDER BY vigente_a_partir_de DESC
  LIMIT 1
  ```
- Toda conversão de kg→R$ em `movimentacoes_conta` DEVE gravar `cotacao_id` (FK para a cotação ativa no momento exato)
- Registros históricos anteriores à migration 052 têm `cotacao_id = NULL` — aceitável, sem possibilidade de recuperação

### Lotes (`lotes` + `lote_itens`)

**REGRA PERMANENTE:** lotes são multi-produto. `produto_id` NÃO existe em `lotes`.

- Produtos de um lote vivem em `lote_itens (lote_id, produto_id, peso_kg)`
- `lotes.peso_total_kg` é mantido automaticamente por trigger (`trg_sincronizar_peso_lote`)
- `lotes.produto_descricao` existe apenas para compatibilidade com NF-es emitidas antes da migration 052 — NÃO usar para novos lotes
- Para buscar os produtos de um lote: `SELECT produto_id, peso_kg FROM lote_itens WHERE lote_id = $id`

### Snapshots de agregação

**REGRA PERMANENTE:** nunca calcular saldos/resultados em tempo real via SUM sobre `movimentacoes_conta`. Usar snapshots.

- `saldos_produtor_snapshot` — kg_entregue, kg_convertido, saldo_kg (gerado), valor_convertido_rs por (org, produtor, produto, safra)
- `resultado_safra_snapshot` — receita, custo, taxa, FUNRURAL, resultado_liquido (gerado), preco_medio (gerado) por (org, safra, produto)
- Ambos atualizados por triggers Postgres (`trg_atualizar_saldos_produtor_snapshot`, `trg_atualizar_resultado_safra_snapshot`)
- Server actions NUNCA atualizam snapshots diretamente — apenas inserem nas tabelas fonte

### Views leves

- `vw_saldos_produtor` — snapshot + JOIN produtores, produtos, safras
- `vw_resultado_safra` — snapshot + JOIN produtos, safras
- Views fazem apenas enriquecimento com nomes — zero agregação

### FUNRURAL

- Taxa fixa: **1,63%** sobre receita bruta
- Obrigação da cooperativa como substituta tributária — NÃO deduzida do produtor
- Calculada e gravada em `resultado_safra_snapshot.funrural_rs` no momento da venda

## Storage (Supabase)

Regra: separar buckets por tipo de conteúdo. Nunca acumular tudo em `'documentos'`.

| Bucket        | Conteúdo                              | Público |
|---------------|---------------------------------------|---------|
| `documentos`  | Docs gerais, manuais                  | Não     |
| `avatares`    | Fotos de perfil                       | Não     |
| `logos-orgs`  | Logos das organizações                | Sim     |
| `comprovantes`| Comprovantes financeiros (26/06/2026) | Não     |

RLS: path começa com `{org_id}/`, policies validam `foldername(name)[1] = organizacao_id`.
Ao criar feature com upload: avaliar bucket existente ou criar novo por tipo.

## NF-e entrada (Focus NFe)

- Série 2 homologação, tokens: FOCUSNFE_TOKEN_HOMOLOGACAO / PRODUCAO
- NCM: 18010000, CFOP: 1159 (cooperado) / 1102 (externo)
- ICMS CST 41, PIS/COFINS CST 72, FUNRURAL 1,63%
- Fix fuso: `new Date(Date.now() - 3*60*60*1000).toISOString().replace('Z','-03:00')`
- isCooperado: `!!produtor.cooperado_id || produtor.tipo === 'cooperado'`
