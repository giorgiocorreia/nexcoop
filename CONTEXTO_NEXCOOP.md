# Contexto NexCoop — 26/06/2026

> Detalhes permanentes em docs/ARQUITETURA.md | Schema em docs/SCHEMA.md | Módulos em docs/MODULOS.md

## Identificação rápida
- **Org teste:** COOPAIBI — org_id `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- **Super admin:** gio.pessoal@gmail.com
- **Org admin:** giorgio@coopaibi.com.br
- **IA:** claude-haiku-4-5-20251001 via ANTHROPIC_API_KEY
- **Claude Code:** `claude --dangerously-skip-permissions`

## O que foi feito hoje (26/06/2026)
- Caixa da comercialização multi-operador (filtro `usuario_id` em `getSessaoAberta`)
- Painel admin `/comercializacao/caixas` (sessões abertas + histórico + forçar fechamento)
- Saída avulsa de caixa (despesa operacional → lançamento financeiro + upload comprovante)
- Bucket `'comprovantes'` criado com RLS própria (path `{org_id}/comercializacao/`)
- Dashboard comercialização corrigido (fonte `movimentacoes_conta`, saldo correto, lotes)
- Saldo atual no header do caixa corrigido (`saldo_especie_calculado - total_saidas_especie`)
- Filtros de "hoje" no dashboard corrigidos para fuso Brasília (UTC-3)

## Pendências imediatas
- [ ] Verificar KPIs "Entregas hoje" e "Produtores hoje" com dados reais após fix UTC-3
      Verificar com: `SELECT created_at FROM movimentacoes_conta WHERE tipo='entrega' LIMIT 5`
- [ ] Próximo chat dedicado: Gestão de caixa físico com origem/destino
      (cofre, banco, transferências entre caixas — ver análise arquitetural já feita)

## IDs críticos
- COOPAIBI organizacao_id: `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- Sessão aberta Giorgio: `663fa34e-a8a5-461d-a25c-8eb93f77ad36`

## Pendências externas
- Marcos (Contabahia): fornecer CSC NFC-e, NCM codes, regime tributário e CSTs para NF-e loja
- CFOP 1159 (cooperado): testar NF-e entrada (1102 externo já validado)
- Acesso Contabahia ao `/comercializacao/fiscal`: implementar coluna `acesso_fiscal` em `empresas_parceiras`

## Workflow desta sessão
1. Giorgio descreve → Claude planeja → Claude Code executa
2. Instrução ao Claude Code: sempre como bloco de código copiável
3. Commit por feature completa (máx 5–6 arquivos), nunca WIP
4. `npx tsc --noEmit` antes de todo commit
5. Deploy só após feature set coerente
6. Docs: atualizar só ao fim de sessão ou conclusão de fase
