import type { LojaUnidade, LojaLote, LojaCompra, LojaCompraItem } from '@/types/database'

export type { LojaUnidade, LojaLote }

export interface ProdutoLoja {
  id:                    string
  org_id:                string
  nome:                  string
  categoria:             string | null
  unidade:               LojaUnidade
  preco_normal:          number
  desconto_cooperado:    boolean
  desconto_cooperado_pct: number | null
  estoque_atual:         number
  estoque_minimo:        number | null
  fornecedor_id:         string | null
  ativo:                 boolean
  criado_em:             string
  atualizado_em:         string
}

export interface ProdutoLojaComFornecedor extends ProdutoLoja {
  loja_fornecedores: { nome: string } | null
}

export interface FiltrosProdutosLoja {
  busca?:          string
  categoria?:      string
  fornecedor_id?:  string
  ativo?:          boolean
  estoqueCritico?: boolean
}

export interface PosicaoEstoque {
  estoque_atual:  number
  estoque_minimo: number | null
  lotes:          LojaLote[]
}

export interface CompraDetalhe {
  compra: LojaCompra & { fornecedor_nome: string }
  itens: (LojaCompraItem & {
    produto_nome: string
    produto_unidade: string
    frete_rateado: number
    outros_rateado: number
    custo_final_unitario: number
  })[]
}

export interface DashboardEstoque {
  total_skus: number
  valor_total_estoque: number
  qtd_criticos: number
  proximos_vencimentos: (LojaLote & { produto_nome: string; dias_restantes: number })[]
  sem_movimento: (ProdutoLoja & { dias_sem_movimento: number })[]
}

// ─── PDV ────────────────────────────────────────────────────────────────────

export type LojaTipoCliente = 'cooperado' | 'externo' | 'avulso'

export type LojaTipoPagamento = 'dinheiro' | 'pix' | 'conta_corrente'

export interface ItemCarrinho {
  produto:                 ProdutoLoja
  quantidade:              number
  preco_unitario:          number
  desconto_pct:            number
  subtotal:                number
  desconto_autorizado_por: string | null
}

export interface CooperadoIdentificado {
  cooperado_id:       string
  produtor_id:        string
  nome:               string
  saldo_financeiro:   number
  tem_conta_corrente: boolean
}

export interface PagamentoVenda {
  dinheiro:          number
  pix:               number
  conta_corrente:    number
  cartao:            number
  tipo_cartao:       'debito' | 'credito' | null
  nsu:               string
  autorizacao:       string
  pix_identificador: string
  pix_nome_pagador:  string
  valor_recebido:    number
}

export interface EstadoCaixa {
  id:             string
  usuario_id:     string
  valor_abertura: number
  aberto_em:      string
  status:         'aberto' | 'fechado'
}

export interface PendenciaAutorizacao {
  tipo:         'desconto_extra' | 'sangria'
  descricao:    string
  onAutorizado: (autorizadorId: string, nome: string) => void
}

export interface ResultadoFinalizarVenda {
  vendaId: string
}

export interface ResultadoValidarSenha {
  valido:          boolean
  autorizador_id?: string
  nome?:           string
}
