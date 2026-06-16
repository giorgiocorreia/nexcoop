# Plano — Módulo Loja Agropecuária NexCoop

## Status das Fases

| Fase | Escopo | Status |
|------|--------|--------|
| Passo 0 | modulos_ativos, sidebar, middleware | ✅ Concluído |
| Fase 1 | lib/loja/types.ts, actions.ts, permissões | ✅ Concluído |
| Fase 2 | /loja/produtos, /loja/categorias, /loja/fornecedores | ✅ Concluído |
| Fase 3 | /loja/estoque, /loja/compras | ✅ Concluído — migration 037 aplicada |
| Fase 4 | PDV — Ponto de Venda | ✅ Concluído — migration 038 aplicada |
| Fase 5 | Dashboard e Relatórios | ⬜ Próxima |

---

## Fase 4 — PDV (Concluído)

### Migration aplicada
- 038: loja_sangrias (tipo aporte|sangria, autorizado_por, executado_por)

### Actions implementadas (lib/loja/actions.ts)
- abrirCaixaLoja — verifica caixa duplicado + insere via adminClient + log
- buscarCooperadoPorCPF — busca direto em cooperados.cpf (não em produtores)
- validarSenhaAutorizador — percorre autorizadores da org + signInWithPassword
- finalizarVenda — insere venda + itens + baixa FIFO lote a lote + débito conta corrente + log
- cancelarVenda — estorna estoque, estorna conta corrente se havia débito, marca status cancelada + log
- registrarSangriaLoja — insere em loja_sangrias via adminClient + log
- fecharCaixaLoja — calcula totais (vendas/espécie/pix/sangrias/aportes), fecha caixa, retorna ResumoFechamento

### Componentes (app/(sistema)/loja/pdv/components/)
- ModalAutorizacao — senha do gerente/admin, reutilizável para desconto extra e sangria
- ModalQuantidade — input numérico com +/- , suporte a decimais (kg/l), subtotal em tempo real
- BadgeCooperado — exibe nome + saldo conta corrente se módulo comercializacao ativo
- PainelProdutos — grid com busca, badge desconto cooperado, badge esgotado
- PainelCarrinho — lista itens, desconto por item, validação de estoque antes de finalizar
- ModalPagamento — dinheiro (troco), pix (chave org), conta corrente (saldo/saldo após), misto
- ModalComprovante — sucesso com botão imprimir + nova venda
- ModalFechamentoCaixa — resumo financeiro (abertura/vendas/espécie/pix/sangrias/aportes/saldo final) + imprimir relatório + confirmar

### API Routes
- /api/loja/comprovante/[id] — comprovante de venda 80mm (pdf-lib)
- /api/loja/fechamento/[id] — relatório de fechamento de caixa 80mm (pdf-lib)

### Tela PDV (app/(sistema)/loja/pdv/page.tsx)
- Guards: orgTemModulo('loja') + podeVenderLoja(funcoes)
- Abertura de caixa: modal com fundo inicial
- Layout dois painéis: 60% produtos / 40% carrinho
- Identificação cooperado por CPF com máscara (busca em cooperados.cpf)
- Desconto cooperado automático + desconto extra com ModalAutorizacao
- Sangria/Aporte com ModalAutorizacao
- Botão Fechar Caixa no header → ModalFechamentoCaixa
- Toast system: success(5s), error(manual), warning(5s) para estoque insuficiente

### Regras críticas
- NUNCA usar auth_org_id() — sempre subquery (SELECT organizacao_id FROM usuarios WHERE id = auth.uid())
- orgTemModulo(org.modulos_ativos, 'loja') em toda tela e action
- createAdminClient() para escritas em loja_caixas, movimentacoes_conta, loja_sangrias
- registrarLog() em: abertura caixa, venda finalizada, venda cancelada, sangria, fechamento caixa
- buscarCooperadoPorCPF busca em cooperados.cpf, não em produtores
- Validação de estoque no PainelCarrinho antes de chamar onFinalizar

---

## Fase 5 — Dashboard e Relatórios (próxima)

### Escopo planejado
- Vendas do dia / período com filtros
- Produtos mais vendidos
- Faturamento por forma de pagamento (dinheiro/pix/conta corrente)
- Histórico de caixas com totais
- Extrato conta corrente cooperado
- Alertas de estoque mínimo
- Exportação CSV/PDF

---

## Padrão visual do módulo

- Accent: #E07B30
- Fundo: #f8f7f4
- Cards: brancos, border 1px solid #e5e3dc, border-radius 12px
- Sem bibliotecas UI externas — inline styles + system-ui
- Componente <Btn> em components/ui/Btn.tsx
- fmtReal() em lib/comercializacao/fmt.ts
- Ícones Tabler via CDN
- Breadcrumb clicável: NexCoop / Loja / SubPágina em todas as páginas
- Toast global via useToast() de components/ui/Toast.tsx

---

## Hub da Loja (/loja)

Redesenhada em 15/06/2026:
- Breadcrumb NexCoop / Loja Agropecuária
- Alerta estoque crítico (lista nomes dos produtos críticos)
- 3 KPIs clicáveis: Produtos ativos, Fornecedores, Compras realizadas
- Acesso rápido: PDV (destaque âmbar), Produtos, Estoque, Compras, Fornecedores, Categorias
- Últimas 3 compras com fornecedor, data, valor + botão Nova compra

---

## Funcoes disponíveis (funcoes_disponiveis)

Inseridas via SQL em 15/06/2026:
- gerente_loja: Gerência a loja, autoriza descontos e sangrias
- caixa_loja: Opera o PDV
- estoquista_loja: Gerencia estoque

Permissões em lib/permissoes.ts:
- podeGerenciarLoja: admin, gerente_loja
- podeVenderLoja: admin, gerente_loja, caixa_loja
- podeVerEstoqueLoja: admin, gerente_loja, estoquista_loja
- podeAutorizarDescontoExtra: admin, gerente_loja
</content>
</invoke>