# NexCoop — Contexto Atual

> Detalhes permanentes em docs/ARQUITETURA.md | Schema em docs/SCHEMA.md | Módulos em docs/MODULOS.md

## Identificação rápida
- **Org teste:** COOPAIBI — org_id `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- **Super admin:** gio.pessoal@gmail.com
- **Org admin:** giorgio@coopaibi.com.br
- **IA:** claude-haiku-4-5-20251001 via ANTHROPIC_API_KEY
- **Claude Code:** `claude --dangerously-skip-permissions`

## Estado atual (20/06/2026)

### Em andamento
- Loja Fase 6: infraestrutura fiscal completa, emissão NF-e bloqueada aguardando contador
- Comercialização: dashboard com cotações funcionando

### Próxima sessão
- Verificar cotações no dashboard Comercialização (build ok, não confirmado visualmente)
- Fluxo de saque Comercialização (chat dedicado)
- Migração multi-org (chat dedicado — ANTES do segundo cliente)

### Caixa aberto COOPAIBI
- ID: `06ba0c91-47ac-4f10-bc7f-afe412b1b37d` — NÃO deletar

### Pendente do contador (Marcos/Contabahia — mrogerio@contabahia.com.br)
- CSC ID e Token NFC-e
- NCMs dos produtos da loja
- Regime tributário
- CSTs ICMS/PIS/COFINS

## Workflow desta sessão
1. Giorgio descreve → Claude planeja → Claude Code executa
2. Instrução ao Claude Code: sempre como bloco de código copiável
3. Commit por feature completa (máx 5–6 arquivos), nunca WIP
4. `npx tsc --noEmit` antes de todo commit
5. Deploy só após feature set coerente
6. Docs: atualizar só ao fim de sessão ou conclusão de fase
