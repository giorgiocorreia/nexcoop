# NexCoop — Status dos Módulos

## Status geral

| Módulo | Status | Última atualização |
|---|---|---|
| Autenticação / Onboarding | ✅ Completo | — |
| Cooperados / Filiados | ✅ Completo | 20/06/2026 |
| Financeiro / Assembleias / Documentos / Mensalidades | ✅ Completo | — |
| Stripe (modo teste) | ✅ Completo | — |
| Super Admin | ✅ Completo | — |
| Captação (CRM/Kanban + Radar CAR/Bahia) | ✅ Completo | — |
| Contábil (migrations 015–024, 13 telas) | ✅ Completo | — |
| Comercialização / Caixa Cacau | ✅ Completo | — |
| NF-e entrada via Focus NFe | ✅ Homologação | 14/06/2026 |
| Dashboard Admin (cotação cacau + TradingView) | ✅ Completo | — |
| Audit logs | ✅ Completo | — |
| Gestão de usuários | ✅ Completo | 20/06/2026 |
| Loja Agropecuária Fases 0–5 | ✅ Completo | 18/06/2026 |
| Loja Agropecuária Fase 6 (fiscal) | 🔄 Parcial | 20/06/2026 |
| Portal do Filiado | ❌ Planejado | — |
| Fluxo de Saque / Vendas Comercialização | ❌ Planejado | — |

## Loja Agropecuária — Fase 6 (em andamento)

### Concluído
- Migration 040: NCM/CFOP em loja_produtos, colunas fiscais em organizacoes, loja_notas_fiscais
- Migration 041: campos de pagamento completo em loja_vendas
- Migration 042: conferência de caixa (status_conferencia, valor_fisico_*, conferido_por)
- Migration 043: loja_unidades (unidades dinâmicas, remove CHECK fixo)
- ModalNotaFiscal: UI completa no PDV pós-venda
- Badge de nota no Rel. Vendas
- ModalFechamentoCaixa: checklist com valores físicos (espécie, débito, crédito) + lista PIX
- Tela /loja/conferencia: gerente confere sessões
- Action conferirCaixa
- Relatórios loja: todos usando adminClient (RLS corrigido)
- Joins loja_caixas→usuarios desambiguados
- Campo de pesquisa de fornecedor com cadastro rápido inline (Nova Compra)
- Campo de pesquisa de produto com link para cadastro (Nova Compra)
- PDV: lista de produtos em linhas (em vez de grid de cards)
- Unidades dinâmicas: tela /loja/unidades, select dinâmico em produtos
- Cancelamento de compra com estorno de estoque
- Edição inline de unidades
- Botão Editar na listagem de produtos

### Bloqueado — aguardando contador (Marcos/Contabahia)
- CSC ID e CSC Token NFC-e
- NCMs dos produtos
- Regime tributário confirmado
- CSTs ICMS/PIS/COFINS
- Emissão real NF-e/NFC-e via Focus NFe

## Comercialização

### Concluído
- Dashboard com breadcrumb padrão + cotações vigentes
- Cotações: breadcrumb + formulário oculto para caixa_loja
- Sidebar com submenu: Dashboard, Cotações, Produtores, Vendas, etc.
- adminClient em getDashboardComercializacao para cotações

### Planejado (chat dedicado)
- Fluxo de saque: solicitação → execução → comprovante 80mm
- Tela /comercializacao/vendas

## Cooperados — Fluxos implementados

| Fluxo | Descrição | Status |
|---|---|---|
| 1 | Cadastro direto de cooperado (com criação de usuário) | ✅ |
| 2 | Criação de usuário com checkbox "é cooperado?" | ✅ |
| 3 | Promoção de produtor externo a cooperado (`promoverProdutorACooperado`) | ✅ |
| 4 | Vincular usuário existente como cooperado — botão "Tornar Cooperado" em Configurações → Usuários | ✅ 20/06/2026 |

**Matrículas:** formato AANNNN, sequencial por org. COOPAIBI: 26001–26014 manuais, próxima automática 26015.

## Agente WhatsApp (planejado)

- **Status:** não iniciado
- **Descrição:** bot de primeiro atendimento via WhatsApp com IA (Claude Haiku), qualificação de leads e transferência para humano
- **Stack:** Evolution API (Railway) + /api/whatsapp/webhook (Next.js) + Claude Haiku
- **Número:** 73999693548
- **Script definido:** 3 opções de menu (conhecer sistema / ver planos / falar com equipe)
- **Próxima ação:** chat dedicado "NexCoop — Agente WhatsApp Evolution API"

## API Routes planejadas

- POST /api/whatsapp/webhook — recebe eventos da Evolution API, processa com Claude Haiku, retorna resposta ao prospect. Lógica de transferência para humano via notificação quando prospect solicitar.

## Variáveis de ambiente

- EVOLUTION_API_URL — URL da instância Evolution API no Railway
- EVOLUTION_API_KEY — Chave de autenticação Evolution API
- WHATSAPP_NUMBER=5573999693548

## Roadmap crítico

1. **Migração multi-org** (ANTES do segundo cliente): `usuarios.organizacao_id` (1:1) → `usuario_organizacoes` (many-to-many). ~70 arquivos, RLS completa. Abrir chat dedicado.
2. **Portal do Filiado**: /filiado mobile-first, login CPF+senha. Abrir chat dedicado.
3. **Fluxo de saque** Comercialização: chat dedicado.
4. **NF-e/NFC-e emissão**: desbloquear quando contador responder.
5. Hotmail/Outlook DMARC
6. Sidebar: remover Mensalidades para cooperativas
7. Renomear cooperados → membros (futuro)
