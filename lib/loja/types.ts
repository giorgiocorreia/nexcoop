import type { LojaUnidade, LojaLote } from '@/types/database'

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
  busca?:        string
  categoria?:    string
  fornecedor_id?: string
  ativo?:        boolean
  estoqueCritico?: boolean
}

export interface PosicaoEstoque {
  estoque_atual:  number
  estoque_minimo: number | null
  lotes:          LojaLote[]
}
