# Contexto NexCoop — 16/07/2026

> Detalhes permanentes em docs/ARQUITETURA.md | Schema em docs/SCHEMA.md | Módulos em docs/MODULOS.md

## Identificação rápida
- **Org teste:** COOPAIBI — org_id `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- **Super admin:** gio.pessoal@gmail.com
- **Org admin:** giorgio@coopaibi.com.br
- **IA:** claude-haiku-4-5-20251001 via ANTHROPIC_API_KEY
- **Produção:** nexcoop.com.br

## O que foi feito (jul/2026)

### UI — redesign completo (commit `0556854`)
Kit `components/nexcoop/ui/` aplicado em todos os módulos que ainda usavam headers locais:
- Captação (`KanbanBoard`)
- Loja (hub `LojaHubClient` + 16 subpáginas)
- Contábil (13 telas)
- Configurações, Escritório, Perfil, Organização, Parceiros, Admin

### Fiscal — cônjuge produtor/cooperado (commit `90338fc`)
- Colunas `conjuge_nome`, `conjuge_cpf` em cooperados/produtores
- NF-e de entrada pode ser emitida em nome do titular ou do cônjuge
- Migration 060 aplicada

### Contábil — classificação automática (commit `912b331`)
- `lib/contabil/classificacao-automatica.ts` — regras por palavra-chave + plano de contas
- Hook em `criarLancamento` (financeiro)
- Toggle em Contábil → Sobras → Configurações
- Migration 061 aplicada

### Parceiro contábil — acesso fiscal (migration 062)
- Coluna `acesso_fiscal` em `empresas_parceiras`
- Toggle em Configurações → Parceiros
- Parceiro com flag ativa vê `/comercializacao/fiscal` na org cliente
- Migration 062 aplicada em produção

### Integração Financeiro → Contábil
- Mensalidades, cotas, comercialização, loja (compras + cancelamento venda)
- Modelo em 2 camadas: `lancamentos` (operacional) + `partidas` (escrituração)

### Landing page (commit `16282a7`)
- Mockups alinhados ao dashboard hub
- CTA "Começar grátis" → `/cadastro`
- WhatsApp unificado

### 14–16/07/2026 — Comercialização, propriedades rurais e segurança
- Venda antecipada — saldo negativo em produto, nunca em R$ (migration 065)
- Propriedades rurais: lista completa no perfil do cooperado + botão Salvar em toda aba (migrations 066)
- Transferência interna sem NF-e — comprador é empresa do próprio cooperado (migrations 067/068)
- Quebra de peso em vendas — comprador paga peso recebido (migration 069)
- Auditoria de segurança: itens 1/3/4 corrigidos (IDOR em vendas/lotes, `/api/nfe/sincronizar` sem auth, rota de debug pública removida)

## UI kit — uso obrigatório em telas novas

```ts
import {
  PageLayout, HubStyles, KpiCard, LinkCard, ContentCard,
  COM_C, MODULO_NEXCOOP, MODULO_LOJA, MODULO_CONTABIL,
} from '@/components/nexcoop/ui'
```

## Pendências imediatas
- [ ] Segurança — auditoria: item #2 (escopo de módulo do parceiro contábil por request) e #5 (assinatura do webhook WhatsApp)
- [ ] Smoke test dos fluxos novos (venda antecipada, transferência interna, quebra de peso)
- [ ] Marcos (Contabahia): dados fiscais da loja (NCMs, CSTs, CSC NFC-e)


## IDs críticos
- COOPAIBI organizacao_id: `3ad97dc2-f87f-4e67-950e-387854d5bccc`

## Workflow desta sessão
1. Giorgio descreve → Claude planeja → Claude Code executa
2. `npx tsc --noEmit` antes de todo commit
3. Commit por feature completa
4. Docs: atualizar ao fim de sessão ou conclusão de fase