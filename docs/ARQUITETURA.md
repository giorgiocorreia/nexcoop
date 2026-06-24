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

## Padrão visual — Design System (a partir de 24/06/2026)

Todas as páginas novas devem seguir o padrão da página `/loja` (LojaHubPage).

### Tokens de cor
```ts
const C = {
  laranja:    '#E07B30',  // Loja
  laranjaLt:  '#FFF7ED',
  verde:      '#16A34A',
  verdeLt:    '#F0FDF4',
  azul:       '#2563EB',
  azulLt:     '#EFF6FF',
  roxo:       '#7C3AED',
  roxoLt:     '#F5F3FF',
  vermelho:   '#DC2626',
  vermelhoLt: '#FEF2F2',
  cinza:      '#78716C',
  cinzaLt:    '#F5F5F4',
  borda:      '#E5E3DC',
  bg:         '#F8F7F4',
  txt:        '#1C1917',
  txtSub:     '#78716C',
}
```
Cada módulo usa sua cor primária no lugar de `laranja`. Cores por módulo:
- Sidebar: `#635BFF`
- Captação: `#1D9E75`
- Contábil: `#0F766E`
- Loja: `#E07B30`
- Comercialização: `#92400e`

### Estrutura de página padrão
1. **Header sticky** — fundo branco, `border-bottom: 1px solid ${C.borda}`, `padding: 18px 32px`, `position: sticky; top: 0; zIndex: 10`. Contém: ícone + título (h1 fontSize 19 fontWeight 800) + data/subtítulo + badges de status + CTA principal.
2. **Conteúdo** — `background: C.bg`, `padding: 28px 32px`, `margin: 0 -2rem -2rem -2rem`.
3. **KPI cards** — grid 6 colunas, `borderRadius: 14`, borda superior colorida (3px), ícone em quadrado com cor light, valor em fontSize 26 fontWeight 800, label fontSize 12, sub fontSize 10. Hover: `translateY(-2px)`.
4. **Cards de conteúdo** — `background: #fff`, `borderRadius: 14`, `border: 1px solid ${C.borda}`, `boxShadow: 0 1px 4px rgba(0,0,0,0.04)`, `padding: 20px 22px`.
5. **Cards de navegação (link-card)** — `borderRadius: 12`, ícone 38×38 com cor light, label fontSize 13 fontWeight 700, desc fontSize 11. Hover: `border-color` da cor do módulo.
6. **Section labels** — `fontSize: 11`, `fontWeight: 700`, `textTransform: uppercase`, `letterSpacing: 0.08em`, `color: C.txtSub`.
7. **Badges de status** — `fontSize: 11`, `fontWeight: 600`, `padding: 3px 9px`, `borderRadius: 6`, cor bg + txt do status.

### CSS classes reutilizáveis (via `<style>` inline na página)
```css
.kpi-card:hover  { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.07) }
.link-card:hover { border-color: <cor-modulo>; box-shadow: 0 4px 12px rgba(<cor>,0.12) }
.btn-pdv:hover   { opacity: 0.92; transform: translateY(-1px) }
```

### Regras gerais
- Sem libs UI externas — tudo inline styles
- Ícones: Tabler Icons via CDN (`ti ti-*`)
- Font: system-ui (não especificar)
- Animações via `@keyframes` inline na própria página
- Breadcrumb substituído pelo header sticky nas páginas hub
- Subpáginas mantêm breadcrumb padrão: `Módulo / SubPágina`

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

## Modelo Produtor/Cooperado/Usuário

- `produtores` = identidade cadastral (base de tudo)
- `cooperados` = vínculo societário 1:1 via `produtores.cooperado_id`
- `usuarios` = login e acesso
- 4 fluxos em `lib/cooperados/actions.ts`:
  1. `criarCooperado` — cadastro direto com usuário
  2. `criarUsuarioComCooperadoOpcional` — usuário com checkbox "é cooperado?"
  3. `promoverProdutorACooperado` — promoção de produtor externo
  4. `vincularUsuarioComoCooperado` — usuário existente → cooperado (Configurações → Usuários)

## NF-e entrada (Focus NFe)

- Série 2 homologação, tokens: FOCUSNFE_TOKEN_HOMOLOGACAO / PRODUCAO
- NCM: 18010000, CFOP: 1159 (cooperado) / 1102 (externo)
- ICMS CST 41, PIS/COFINS CST 72, FUNRURAL 1,63%
- Fix fuso: `new Date(Date.now() - 3*60*60*1000).toISOString().replace('Z','-03:00')`
- isCooperado: `!!produtor.cooperado_id || produtor.tipo === 'cooperado'`
