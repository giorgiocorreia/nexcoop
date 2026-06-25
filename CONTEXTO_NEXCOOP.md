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

### Módulo Comercialização — estado atual (2026-06-25)

**Migration 052 aplicada (2026-06-24):**
- `cotacoes`: `vigente_a_partir_de (timestamptz)` — suporte intraday
- `movimentacoes_conta`: +`cotacao_id` FK
- `lotes`: multi-produto via `lote_itens`; `produto_id` removido
- Novas tabelas: `lote_itens`, `saldos_produtor_snapshot`, `resultado_safra_snapshot`
- Triggers e views: `vw_saldos_produtor`, `vw_resultado_safra`

**Correções e melhorias (2026-06-25):**
- `vendas_externas.status` avança para `confirmada` automaticamente na autorização da NF-e
- Lançamento contábil da NF-e saída criado com `status='pendente'` (não 'pago')
- `listarLotes`: join `produtos` removido, usa `lote_itens`
- `listarLotes` em `lib/comercializacao/lotes.actions.ts`: join corrigido
- Página "NF-e Saída" renomeada para "Notas Fiscais" (`/comercializacao/fiscal`)
- Modal "Docs" na página Notas Fiscais: lista XMLs de entrada e saída, baixar ZIP, enviar por email
- DANFE URL derivada de `xml_nfe` (replace XMLs→DANFEs, -nfe.xml→-nfe.pdf)
- Erro cancelamento NF-e agora exibido dentro do modal
- Email comprador pré-preenche campo de envio no modal Docs
- NF-es 1 e 4 do Lote 001 (José da Silva e João Matheus): `xml_url`/`danfe_url` corrigidas manualmente no banco

**Estado atual da venda COOPAIBI:**
- Lote 001 · 602kg · Barry Callebaut · NF-e 5/1 autorizada
- `vendas_externas` status: `confirmada` (aguardando entrega física)
- Lançamento contábil: `pendente` (aguardando pagamento)

**Próximos passos:**
- "Marcar entregue" → "Marcar paga": ao marcar paga, lançamento contábil deve virar `pago`
- Devolução parcial: comprador emite NF-e de devolução, cooperativa registra chave + kg devolvidos
- `iniciarLote`: criar `lote_itens` ao vincular entregas
- Tela `/comercializacao/resultado`: UI do resultado por safra (schema pronto na migration 052)

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
