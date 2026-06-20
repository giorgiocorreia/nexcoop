# NexCoop — Contexto Atual

> Detalhes permanentes em docs/ARQUITETURA.md | Schema em docs/SCHEMA.md | Módulos em docs/MODULOS.md

## Identificação rápida
- **Org teste:** COOPAIBI — org_id `3ad97dc2-f87f-4e67-950e-387854d5bccc`
- **Super admin:** gio.pessoal@gmail.com
- **Org admin:** giorgio@coopaibi.com.br
- **IA:** claude-haiku-4-5-20251001 via ANTHROPIC_API_KEY
- **Claude Code:** `claude --dangerously-skip-permissions`

## Estado atual (20/06/2026)

### Cooperados / Cotas (migrations 045 + 046 aplicadas)
- Dois tipos de cota: Plena (voto individual, 100% sobras) e Colaboradora (voto via grupo, 10% sobras)
- Cooperado pode ter ambas (110% sobras)
- Grupos de colaboradores por org (grupos_colaboradores): com ou sem CNPJ, criação inline no cadastro de cota
- Representantes de grupo: 1 a cada 10 membros, alerta automático, notificação persistida
- Cota plena: quantidade variável; colaboradora: sempre quantidade 1
- quota_parte em cooperados sincronizado via trigger
- Pagamentos: tabela cota_pagamentos com formas dinheiro/pix/cartao/promessa
- Parcelas com data de vencimento para promessas
- Status automático: proposta/ativo → probatório (1º pagamento parcial), probatório → ativo (quitação total via confirmação)
- Inadimplência: parcelas vencidas → cooperado.status = 'inadimplente' (verificado via verificarInadimplencia() no acesso ao dashboard)
- Recibo térmico PDF 80mm gerado automaticamente após registro de pagamento; botão reimprimir no histórico
- Nomenclatura dinâmica: cooperados (cooperativa) / filiados (associação) via tipoOrg prop
- Tela /configuracoes/grupos para gerenciar grupos de colaboradores
- Cards de inadimplência e capital a receber no dashboard admin

### Modelo Membro/Produtor/Usuário

**Fluxo 4 implementado (20/06/2026):** Vincular usuário existente como cooperado via botão "Tornar Cooperado" em Configurações → Usuários. Aparece para qualquer usuário sem cooperado vinculado. Modal com campos: matrícula (gerada automaticamente AANNNN por org), data admissão, quota parte, status, CAF, DAP. Server action `vincularUsuarioComoCooperado()` em `lib/cooperados/actions.ts`. Badge "✓ Cooperado" para usuários já vinculados. Fix serialização: `usuariosComCooperado` passado como `string[]` (não Set) do Server Component para Client Component.

**Matrículas COOPAIBI:** 26001–26014 atribuídas manualmente. Próxima automática: 26015. Formato AANNNN, sequencial por org, índices em `cooperados(organizacao_id)` e `cooperados(organizacao_id, numero_matricula)` — migration 047.

**Busca cooperados:** filtro de texto busca nome/email; filtro numérico busca CPF (separação por tipo de caractere).

**Bugs corrigidos:** breadcrumb `/cooperados` no padrão NexCoop / Cooperados; breadcrumb detalhe "← Cooperados" dinâmico por tipo org; layout linha usuário em 2 linhas para evitar espremimento; `sites/` excluído do `tsconfig.json`; `nodemailer` instalado; `force-dynamic` em cooperados/page.tsx.

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
