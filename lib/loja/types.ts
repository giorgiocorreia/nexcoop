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
