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

## Padrão visual

- Fundo: `#f8f7f4`
- Cards: branco, `border: 1px solid #e5e3dc`, `border-radius: 12px`, `font-family: system-ui`
- Sem libs UI externas — tudo inline styles
- Cores por módulo: sidebar `#635BFF` | captação `#1D9E75` | contábil `#0F766E` | loja `#E07B30` | comercialização `#92400e`
- Ícones: Tabler Icons via CDN em `layout.tsx`
- Componente `Btn`/`BtnLink` em `components/ui/Btn.tsx`
- Breadcrumb padrão: NexCoop / Módulo / SubPágina (substitui `<h1>` solto)

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
