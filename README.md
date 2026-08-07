# NexCoop

SaaS multi-tenant para cooperativas e associações brasileiras.

**Stack:** Next.js 16 + TypeScript + Supabase + Vercel  
**Produção:** [nexcoop.com.br](https://nexcoop.com.br)  
**Repositório:** [giorgiocorreia/nexcoop](https://github.com/giorgiocorreia/nexcoop)

## Documentação

| Arquivo | Conteúdo |
|---------|----------|
| [docs/ARQUITETURA.md](docs/ARQUITETURA.md) | Regras permanentes, design system, padrões de código |
| [docs/SCHEMA.md](docs/SCHEMA.md) | Migrations e schema do banco |
| [docs/MODULOS.md](docs/MODULOS.md) | Status de cada módulo |
| [docs/PLANO_CONTABIL.md](docs/PLANO_CONTABIL.md) | Roadmap de melhoria do módulo contábil (código, banco, UX) |
| [CHANGELOG.md](CHANGELOG.md) | Histórico de alterações |
| [CONTEXTO_NEXCOOP.md](CONTEXTO_NEXCOOP.md) | Contexto rápido da sessão atual |
| [PENDENCIAS.md](PENDENCIAS.md) | Checklist de pendências |

## Desenvolvimento local

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000).

Antes de commitar:

```bash
npx tsc --noEmit
```

## UI kit compartilhado

Todas as telas do sistema usam o kit em `components/nexcoop/ui/`:

- `PageLayout`, `HubStyles`, `KpiCard`, `LinkCard`, `ContentCard`
- Tokens `COM_C` (cores unificadas)
- Constantes de módulo: `MODULO_NEXCOOP`, `MODULO_LOJA`, `MODULO_CONTABIL`, etc.

Referência: `app/(sistema)/dashboard/DashboardClient.tsx`

## Módulos principais

- Cooperados, Financeiro, Mensalidades, Assembleias, Documentos
- Comercialização (cacau, lotes, NF-e)
- Loja Agropecuária (PDV, estoque, compras)
- Contábil (escrituração, DRE, balanço, SPED auxiliar; NF-e consulta em `/contabil/nfe`)
- Captação de recursos (CRM + Radar)
- Configurações, Escritório (portal do contador parceiro — «Meu escritório»)

## Regras críticas

- Nunca usar `auth_org_id()` — ver [docs/ARQUITETURA.md](docs/ARQUITETURA.md)
- Migrations via Supabase Dashboard SQL Editor
- `createAdminClient()` para writes org-level e relatórios