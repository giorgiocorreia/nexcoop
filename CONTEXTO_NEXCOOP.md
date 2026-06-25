# NexCoop — Contexto Atual

> Detalhes permanentes em docs/ARQUITETURA.md | Schema em docs/SCHEMA.md | Módulos em docs/MODULOS.md

## Identificação rápida
- **Org teste:** COOPAIBI — org_id `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- **Super admin:** gio.pessoal@gmail.com
- **Org admin:** giorgio@coopaibi.com.br
- **IA:** claude-haiku-4-5-20251001 via ANTHROPIC_API_KEY
- **Claude Code:** `claude --dangerously-skip-permissions`

## Estado atual (24/06/2026)

### Bugs corrigidos nesta sessão

1. `/loja/conferencia` mostrava "Nenhum caixa fechado" — join PostgREST `usuarios!loja_caixas_usuario_id_fkey` quebrava silenciosamente com duas FKs para `usuarios` (`usuario_id` + `conferido_por`). Fix: query separada para nomes dos operadores.

2. Botão "Emitir NF-e de saída" no lote não alternava para "Reimprimir" após autorização — `buscarLote` não trazia `vendas_externas`. Fix: join adicionado + lógica `nfeAutorizada` no `LoteDetalhe`. Runtime error adicional: campo `danfe_url` inexistente removido, URL gerada via `chave_nfe`. Registro fantasma `vendas_externas` com status null deletado do banco.

### Features entregues nesta sessão

- Badge "NF-e nº X" no card de lote na listagem (`listarLotes` agora traz `vendas_externas`)
- `iniciarLote`: descrição sem valor padrão hardcoded, placeholder genérico
- Hub Loja: seção "Relatórios & Gestão" já estava implementada (confirmado)

### Pendências abertas

### Módulo Comercialização — estado atual (2026-06-24)

**Migration 052 aplicada:**
- `cotacoes`: campo `data` removido, substituído por `vigente_a_partir_de (timestamptz)`. Suporte a múltiplas cotações no mesmo dia.
- `movimentacoes_conta`: +`cotacao_id` FK — rastreabilidade da cotação no momento da conversão.
- `lotes`: removido `produto_id`. Lotes agora são multi-produto via `lote_itens`.
- Novas tabelas: `lote_itens`, `saldos_produtor_snapshot`, `resultado_safra_snapshot`.
- Triggers: `trg_sincronizar_peso_lote`, `trg_atualizar_saldos_produtor_snapshot`, `trg_atualizar_resultado_safra_snapshot`.
- Views: `vw_saldos_produtor`, `vw_resultado_safra`.

**10 arquivos TypeScript adaptados:**
- `lib/comercializacao/cotacoes.actions.ts` — reescrito com `getCotacaoAtiva` + alias `getCotacaoHoje`
- `types/database.ts` — `Cotacao`, `Lote`, novo `LoteItem`, novas tabelas no schema
- `CotacoesClient.tsx` — datetime-local, `vigente_a_partir_de`
- `emitir-nfe-entrada.ts`, `nfe.actions.ts`, `notas.ts`, `cotacoes-mercado-actions.ts` — queries atualizadas
- `lotes/actions.ts`, `LotesLista.tsx`, `LoteDetalhe.tsx`, `nfe/actions.ts`, `NfeSaidaClient.tsx`, `FiscalNfeClient.tsx`, `zip-lote.ts`, `caixa.actions.ts` — adaptados para multi-produto

**Próximos passos:**
- Adaptar tela `/comercializacao/cotacoes` para input datetime-local e exibir hora
- Adaptar `iniciarLote` para criar `lote_itens` ao vincular entregas
- Construir tela `/comercializacao/resultado`

### Correções aplicadas (2026-06-25)
- `vendas_externas.status` avança automaticamente para `confirmada` quando NF-e é autorizada pela SEFAZ
- Lançamento contábil criado na autorização da NF-e agora usa `status='pendente'` (não 'pago')
- `listarLotes` corrigida: join `produtos(...)` removido, usa `lote_itens(...)`
- Venda da COOPAIBI (id: 9f3c0b0e) corrigida manualmente para `confirmada`
- Lançamento correspondente corrigido manualmente para `pendente`

#### Pendências gerais
- Campo CPF editável na ficha do produtor quando nulo
- Matrículas 266015/266016 → corrigir para 26015/26016 no banco
- FOCUSNFE_AMBIENTE=producao confirmar no Vercel
- Separação FOCUSNFE_AMBIENTE por módulo (loja vs comercialização)
- iniciarLote: safra obrigatória já validada no frontend e action
- KPI Custo total lote: corrigir cálculo (quantidade × cotação, não soma valor_pago)

### Caixa aberto COOPAIBI
- ID: `06ba0c91-47ac-4f10-bc7f-afe412b1b37d` — NÃO deletar

### Pendências externas
- Marcos/Contabahia: CSC ID/Token NFC-e, NCMs, regime tributário, CSTs
- Abertura Nexcoop Tecnologia Ltda
- CNPJ para verificação Meta Business Manager

## Workflow desta sessão
1. Giorgio descreve → Claude planeja → Claude Code executa
2. Instrução ao Claude Code: sempre como bloco de código copiável
3. Commit por feature completa (máx 5–6 arquivos), nunca WIP
4. `npx tsc --noEmit` antes de todo commit
5. Deploy só após feature set coerente
6. Docs: atualizar só ao fim de sessão
