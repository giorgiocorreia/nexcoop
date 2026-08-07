# Contexto NexCoop — 07/08/2026

> Detalhes permanentes em docs/ARQUITETURA.md | Schema em docs/SCHEMA.md | Módulos em docs/MODULOS.md  
> Roadmap contábil: **docs/PLANO_CONTABIL.md**

## Identificação rápida
- **Org teste:** COOPAIBI — org_id `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- **Super admin:** gio.pessoal@gmail.com
- **Org admin:** giorgio@coopaibi.com.br
- **Parceiro contábil (produção):** Érica Almeida — `fiscal@contabahia.com.br` (Contabahia; nível responsável)
- **IA / agentes:** Claude (sessões anteriores); **Grok (xAI / Grok Build)** — 27–28/07 fiscal/caixa; **07/08 contábil + parceiro + NF-e**
- **Produção:** nexcoop.com.br

## 07/08/2026 — Contábil, parceiro e NF-e (Grok)

### Parceiro Contabahia
- Conta atualizada: **Érica Almeida** / `fiscal@contabahia.com.br` (substitui Evely / ealmeida@…)
- Login em `/login` (mesmo que a coop); pós-login parceiro → `/escritorio` (não dashboard da org)
- Entrada no cliente: cookie `parceiro_org_id`; saída limpa cookie («Meu escritório» / form `sairDaOrgParceiro`)
- UX: logo NexCoop + logo da org cliente; chip com nome da org; menu «Cliente · Contábil»; «Meu escritório contábil» no painel
- Botão flutuante «← Meu escritório» (não empurra o header verde)

### NF-e — duas superfícies independentes
| Rota | Papel |
|------|--------|
| `/contabil/nfe` | Consulta contábil (código só em `contabil/nfe/*`) — KPIs, export XML entradas, sem Cancelar/CC-e |
| `/comercializacao/fiscal` | Operação (cancelar, CC-e, Docs/ZIP lote, e-mail) |

### Bug crítico: entradas «autorizadas na UI» e `processando` no banco
- Causa 1: modal tratava `sucesso: true` sem chave como «NF-e autorizada»
- Causa 2: UPDATE usava coluna **`emitido_em`** (inexistente); correta é **`emitida_em`** → PGRST204
- Fix: modal + polling; gravação em `emitida_em`; sync Focus no load de entradas contábeis
- **Dados históricos** (lotes 002–006 etc.): ainda podem estar `processando` até re-sync em produção após deploy

### Export XML entradas (contábil)
- 1º clique em Exportar → mostra checkboxes + aviso
- 2º clique → ZIP das marcadas
- Botão com altura alinhada ao filtro de status

### Docs atualizados nesta sessão
- `docs/PLANO_CONTABIL.md` (novo)
- `docs/MODULOS.md`, `docs/SCHEMA.md`, `docs/ARQUITETURA.md`
- `PENDENCIAS.md`, `CHANGELOG.md`, `README.md`, este arquivo

## 06/08/2026 — Recibos + caixa Loja

- Recibos em `/comercializacao/impressos` (migrations 092/093 em produção)
- Caixa Loja: migration 094 (único aberto por usuário + forma_pagamento sangrias); aporte simples sem senha
- Detalhes: `CHANGELOG.md` § 2026-08-06, `docs/comercializacao.md`

## 27–28/07/2026 — Grok (fiscal / caixa)

- Migration 090: 1 sessão aberta por operador em `sessoes_caixa` (não afeta loja)
- Reconsulta NF-e saída; ZIP/e-mail lote; SMTP Zoho

## UI kit — uso obrigatório em telas novas

```ts
import {
  PageLayout, HubStyles, KpiCard, LinkCard, ContentCard,
  COM_C, MODULO_NEXCOOP, MODULO_LOJA, MODULO_CONTABIL,
} from '@/components/nexcoop/ui'
```

## Pendências imediatas
- [ ] Re-sync entradas `processando` sem chave (Focus) após deploy `emitida_em`
- [ ] Confirmar coluna `empresas_parceiras.acesso_fiscal` (migration 062) em produção
- [ ] NCMs/CSTs loja + NFC-e PDV (Contabahia / dados fiscais)
- [ ] Segurança: escopo de módulo do parceiro por request (revalidar)
- [ ] Roadmap contábil médio prazo: `docs/PLANO_CONTABIL.md`

## IDs críticos
- COOPAIBI organizacao_id: `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- Contabahia empresa parceira (contabilidade): ver `empresas_parceiras` tipo `contabilidade` + org COOPAIBI

## Workflow
1. Giorgio descreve → plano → execução
2. `npx tsc --noEmit` antes de commit quando houver TypeScript crítico
3. Commit por feature; docs ao fim da sessão
