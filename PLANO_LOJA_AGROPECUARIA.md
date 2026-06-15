# Plano — Módulo Loja Agropecuária NexCoop

## Status das Fases

| Fase | Escopo | Status |
|------|--------|--------|
| Passo 0 | modulos_ativos, sidebar, middleware | ✅ Concluído |
| Fase 1 | lib/loja/types.ts, actions.ts, permissões | ✅ Concluído |
| Fase 2 | /loja, /loja/produtos, /loja/categorias | ✅ Concluído |
| Fase 3 | /loja/estoque, /loja/compras | ✅ Concluído — migration 037 aplicada |
| Fase 4 | PDV — Ponto de Venda | ✅ Concluído |
| Fase 5 | Dashboard e Relatórios | ⬜ Planejada |

---

## Fase 4 — PDV (Ponto de Venda)

### Migration necessária

Migration 038 — loja_sangrias (aplicar no SQL Editor Supabase antes de codar):

CREATE TABLE IF NOT EXISTS loja_sangrias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizacoes(id),
  caixa_id uuid NOT NULL REFERENCES loja_caixas(id),
  tipo text NOT NULL CHECK (tipo IN ('aporte','sangria')),
  valor numeric(12,2) NOT NULL,
  autorizado_por uuid NOT NULL REFERENCES usuarios(id),
  executado_por uuid NOT NULL REFERENCES usuarios(id),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE loja_sangrias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "org members" ON loja_sangrias
  FOR ALL USING (
    org_id = (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
  );

### Arquivos a criar/modificar

lib/loja/
  types.ts          ← adicionar ItemCarrinho, CooperadoIdentificado, EstadoCaixa
  actions.ts        ← adicionar 6 actions

app/(sistema)/loja/
  pdv/
    page.tsx
    components/
      PainelProdutos.tsx
      PainelCarrinho.tsx
      ModalQuantidade.tsx
      ModalAutorizacao.tsx
      ModalPagamento.tsx
      ModalComprovante.tsx
      BadgeCooperado.tsx

app/api/loja/
  comprovante/[id]/route.ts

### Actions (lib/loja/actions.ts)

abrirCaixaLoja(orgId, usuarioId, valorAbertura)
- Verifica se já existe caixa aberto para a org (bloqueia se sim)
- Insere em loja_caixas status 'aberto' via createAdminClient()
- registrarLog('loja_caixa_aberto')

buscarCooperadoPorCPF(orgId, cpf)
- Join: cooperados → produtores → contas_produtor
- tem_conta_corrente: true só se org tem 'comercializacao' em modulos_ativos
- CPF normalizado (só dígitos)
- Retorna: cooperado_id, produtor_id, nome, saldo_financeiro, tem_conta_corrente

validarSenhaAutorizador(orgId, senha)
- Busca usuários da org com podeAutorizarDescontoExtra via createAdminClient()
- Valida via signInWithPassword
- Nunca loga o usuário atual
- Retorna: { valido, autorizador_id?, nome? }

finalizarVenda(orgId, operadorId, caixaId, venda, itens)
Sequência:
1. Insere loja_vendas
2. Insere loja_venda_itens por item
3. Baixa FIFO: lotes ordenados por data_validade ASC
   - Decrementa loja_lotes.quantidade_atual lote a lote
   - Insere loja_estoque_movimentos tipo 'saida_venda'
   - Decrementa loja_produtos.estoque_atual
4. Se pago_conta > 0: insere movimentacoes_conta tipo 'compra_loja' (débito) via createAdminClient()
5. registrarLog('loja_venda_finalizada')

cancelarVenda(orgId, vendaId)
- Atualiza loja_vendas.status = 'cancelada'
- Estorna movimentos de estoque (saida_venda → entrada_estorno)
- Se tinha pago_conta: insere movimentacoes_conta tipo 'estorno_compra_loja'
- registrarLog('loja_venda_cancelada')

registrarSangriaLoja(orgId, caixaId, tipo, valor, autorizado_por, executado_por, obs?)
- Insere em loja_sangrias via createAdminClient()

### Tela PDV (app/(sistema)/loja/pdv/page.tsx)

'use client' — guards: orgTemModulo('loja') + podeVenderLoja(funcoes)

Estado:
- caixaAtual: LojaCaixa | null
- cooperado: CooperadoIdentificado | null
- carrinho: ItemCarrinho[]
- modalAberto: 'quantidade'|'autorizacao'|'pagamento'|'comprovante'|'sangria'|null
- produtoSelecionado: ProdutoLoja | null
- pendenciaAutorizacao: PendenciaAuth | null

Layout dois painéis (inline styles):
- Esquerda 60%: busca por nome (foco automático) + grid produtos
  - Badge #E07B30 com % se desconto_cooperado=true
  - Badge cinza "Esgotado" se estoque_atual=0 (desabilita clique)
  - Clique → ModalQuantidade → adicionarAoCarrinho
- Direita 40%: carrinho + identificação cooperado + formas de pagamento

Identificação cooperado:
- Botão "Identificar cooperado" → input CPF → buscarCooperadoPorCPF
- Se identificado: BadgeCooperado (nome + "Cooperado") + saldo conta corrente
- desconto_cooperado_pct aplicado automaticamente nos itens elegíveis

Desconto adicional por item:
- Se > desconto_cooperado_pct → abre ModalAutorizacao
- Registra autorizador_id em loja_venda_itens

ModalAutorizacao (reutilizável):
- Props: titulo, descricao, onAutorizado(autorizadorId, nome), onCancelar
- Chama validarSenhaAutorizador no submit
- Spinner durante validação, erro em vermelho se inválida
- Usado para: desconto extra + sangria

ModalPagamento:
- Dinheiro: valor recebido + troco calculado em tempo real
- Pix: exibe chave Pix da org (campo em organizacoes)
- Conta corrente: só se cooperado identificado + tem_conta_corrente=true
  - Exibe: saldo disponível, valor a debitar, saldo após
  - Combinável com dinheiro ou Pix (soma deve = total)
  - Alerta vermelho se saldo insuficiente

ModalComprovante:
- Resumo da venda finalizada
- Botão "Imprimir" → /api/loja/comprovante/[id] (nova aba)
- Botão "Nova venda" → limpa carrinho e estado

Sangria:
- Botão no header do PDV
- Modal valor + tipo (aporte/sangria) + ModalAutorizacao
- registrarSangriaLoja

### API Route — Comprovante 80mm

app/api/loja/comprovante/[id]/route.ts
Padrão: igual a app/api/comercializacao/comprovante/[id]/route.ts

Layout:
================================
      LOJA AGROPECUÁRIA
   [NOME DA ORG]
   CNPJ: XX.XXX.XXX/XXXX-XX
================================
Venda #00042
15/06/2026  14:32
Operador: João Silva
--------------------------------
Cooperado: Maria Oliveira (se identificado)
Conta corrente aplicada (se pago_conta > 0)
--------------------------------
[itens com qtd, preço, desconto%, subtotal]
--------------------------------
Subtotal:     R$ XXX,XX
Desconto:     R$  XX,XX
TOTAL:        R$ XXX,XX
--------------------------------
Dinheiro:     R$ XXX,XX
Pix:          R$ XXX,XX
Conta:        R$ XXX,XX
Troco:        R$  XX,XX
================================
   OBRIGADO PELA PREFERÊNCIA
================================

### Checklist de implementação (ordem)

- [ ] Migration 038 — loja_sangrias (SQL Editor Supabase)
- [ ] lib/loja/types.ts — ItemCarrinho, CooperadoIdentificado, EstadoCaixa
- [ ] lib/loja/actions.ts — 6 novas actions
- [ ] app/api/loja/comprovante/[id]/route.ts
- [ ] ModalAutorizacao
- [ ] ModalQuantidade
- [ ] BadgeCooperado
- [ ] PainelProdutos
- [ ] PainelCarrinho
- [ ] ModalPagamento
- [ ] ModalComprovante
- [ ] app/(sistema)/loja/pdv/page.tsx
- [ ] Link /loja/pdv no sidebar da Loja
- [ ] Teste COOPAIBI: cooperado com saldo + produto com desconto

### Regras críticas

- NUNCA usar auth_org_id() — sempre subquery (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
- orgTemModulo(org.modulos_ativos, 'loja') em toda tela e action
- createAdminClient() para escritas em loja_caixas, movimentacoes_conta, loja_sangrias
- registrarLog() em: abertura caixa, venda finalizada, venda cancelada, sangria
- Validação de senha do autorizador: nunca loga o operador atual

---

## Fase 5 — Dashboard e Relatórios (planejada)

Escopo a definir. Candidatos:
- Vendas do dia / período
- Produtos mais vendidos
- Faturamento por forma de pagamento
- Histórico de caixas
- Extrato conta corrente cooperado
- Alertas de estoque mínimo

---

## Padrão visual do módulo

- Accent: #E07B30
- Fundo: #f8f7f4
- Cards: brancos, border 1px solid #e5e3dc, border-radius 12px
- Sem bibliotecas UI externas — inline styles + system-ui
- Componente <Btn> em components/ui/Btn.tsx
- fmtReal() em lib/comercializacao/fmt.ts
- Ícones Tabler via CDN
