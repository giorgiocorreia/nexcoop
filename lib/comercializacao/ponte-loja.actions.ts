'use server'

// Ponte Comercialização → Loja Agropecuária: transforma uma entrega já paga
// (produtor recebeu na hora, ver lib/comercializacao/caixa.actions.ts) em
// estoque vendável na Loja. Caso de uso original: produtor de luvas de couro
// (manufatura artesanal) entrega o material pela Comercialização, é pago no
// caixa, e o material precisa virar item de prateleira na Loja.
//
// Decisões (confirmadas com o Giorgio, 17/07/2026):
// - Pagamento já aconteceu no caixa da Comercialização — a ponte NÃO cria
//   lançamento de despesa no Financeiro (evita contar o custo duas vezes).
// - Se o produto da Comercialização ainda não tem um produto correspondente
//   na Loja (produtos.loja_produto_id), a ponte cria um automaticamente com
//   preco_normal = 0 — fica pendente de ajuste manual em Loja → Produtos.

import { createAdminClient } from '@/lib/supabase/admin'
import { getUsuarioLogado } from '@/lib/auth'
import { revalidatePath } from 'next/cache'

const NOME_FORNECEDOR_INTERNO = 'Produção interna — Cooperados'

async function obterFornecedorInterno(
  supabase: ReturnType<typeof createAdminClient>,
  orgId: string
): Promise<string> {
  const { data: existente } = await supabase
    .from('loja_fornecedores')
    .select('id')
    .eq('org_id', orgId)
    .eq('nome', NOME_FORNECEDOR_INTERNO)
    .maybeSingle()
  if (existente) return (existente as any).id as string

  const { data: novo, error } = await supabase
    .from('loja_fornecedores')
    .insert({ org_id: orgId, nome: NOME_FORNECEDOR_INTERNO, ativo: true } as any)
    .select('id')
    .single()
  if (error) throw new Error('Erro ao criar fornecedor interno na Loja: ' + error.message)
  return (novo as any).id as string
}

export async function enviarEntregaParaLoja(movimentacaoId: string) {
  const usuario = await getUsuarioLogado()
  const orgId = usuario.organizacao_id as string
  const supabase = createAdminClient()

  const { data: mov, error: errMov } = await supabase
    .from('movimentacoes_conta')
    .select(`
      id, tipo, produto_id, quantidade_produto, preco_unitario,
      referencia_id, referencia_tipo,
      produtos(id, nome, categoria, unidade, loja_produto_id)
    `)
    .eq('id', movimentacaoId)
    .eq('organizacao_id', orgId)
    .single()
  if (errMov || !mov) throw new Error('Movimentação não encontrada.')
  if (mov.tipo !== 'entrega') throw new Error('Só é possível enviar entregas para a Loja.')
  if (mov.referencia_tipo === 'loja_compra') throw new Error('Essa entrega já foi enviada para a Loja.')
  if (!mov.preco_unitario || Number(mov.preco_unitario) <= 0) {
    throw new Error('Informe o preço de custo dessa entrega (na tela de registrar entrega) antes de enviar para a Loja.')
  }

  const produto = Array.isArray((mov as any).produtos) ? (mov as any).produtos[0] : (mov as any).produtos
  if (!produto) throw new Error('Produto não encontrado.')

  const fornecedorId = await obterFornecedorInterno(supabase, orgId)
  let lojaProdutoId: string | null = produto.loja_produto_id

  if (!lojaProdutoId) {
    const { data: novoLojaProduto, error: errLojaProduto } = await supabase
      .from('loja_produtos')
      .insert({
        org_id: orgId,
        nome: produto.nome,
        categoria: produto.categoria ?? null,
        unidade: produto.unidade,
        preco_normal: 0,
        desconto_cooperado: false,
        desconto_cooperado_pct: null,
        estoque_atual: 0,
        fornecedor_id: fornecedorId,
        ativo: true,
      } as any)
      .select('id')
      .single()
    if (errLojaProduto) throw new Error('Erro ao criar produto na Loja: ' + errLojaProduto.message)
    lojaProdutoId = (novoLojaProduto as any).id as string

    await supabase
      .from('produtos')
      .update({ loja_produto_id: lojaProdutoId } as any)
      .eq('id', produto.id)
  }

  const quantidade = Number(mov.quantidade_produto)
  const precoCusto = Number(mov.preco_unitario)
  const subtotal = Number((quantidade * precoCusto).toFixed(2))

  const { data: compra, error: errCompra } = await supabase
    .from('loja_compras')
    .insert({
      org_id: orgId,
      fornecedor_id: fornecedorId,
      usuario_id: usuario.id,
      data_compra: new Date().toISOString().split('T')[0],
      valor_frete: 0,
      outros_custos_valor: 0,
      observacoes: `Transferência da Comercialização — entrega ${movimentacaoId.slice(0, 8)}`,
      status_nfe: 'sem_nota',
      total: subtotal,
    } as any)
    .select('id')
    .single()
  if (errCompra) throw new Error('Erro ao registrar compra na Loja: ' + errCompra.message)
  const compraId = (compra as any).id as string

  const { error: errItem } = await supabase
    .from('loja_compra_itens')
    .insert({
      compra_id: compraId,
      produto_id: lojaProdutoId,
      quantidade,
      preco_custo: precoCusto,
      subtotal,
    } as any)
  if (errItem) throw new Error('Erro ao registrar item da compra na Loja: ' + errItem.message)

  const { error: errLote } = await supabase
    .from('loja_lotes')
    .insert({
      org_id: orgId,
      produto_id: lojaProdutoId,
      quantidade_entrada: quantidade,
      quantidade_atual: quantidade,
      preco_custo: precoCusto,
    } as any)
  if (errLote) throw new Error('Erro ao criar lote de estoque na Loja: ' + errLote.message)

  const { error: errMovLoja } = await supabase
    .from('loja_estoque_movimentos')
    .insert({
      org_id: orgId,
      produto_id: lojaProdutoId,
      tipo: 'entrada',
      quantidade,
      motivo: 'Transferência da Comercialização',
      referencia_id: compraId,
    } as any)
  if (errMovLoja) throw new Error('Erro ao registrar movimento de estoque na Loja: ' + errMovLoja.message)

  const { data: prodAtual } = await supabase
    .from('loja_produtos')
    .select('estoque_atual')
    .eq('id', lojaProdutoId)
    .single()
  const { error: errEstoque } = await supabase
    .from('loja_produtos')
    .update({ estoque_atual: Number((prodAtual as any)?.estoque_atual ?? 0) + quantidade } as any)
    .eq('id', lojaProdutoId)
  if (errEstoque) throw new Error('Erro ao atualizar estoque do produto na Loja: ' + errEstoque.message)

  const { error: errMarcar } = await supabase
    .from('movimentacoes_conta')
    .update({ referencia_id: compraId, referencia_tipo: 'loja_compra' } as any)
    .eq('id', movimentacaoId)
  if (errMarcar) throw new Error(errMarcar.message)

  revalidatePath('/comercializacao/caixa')
  revalidatePath('/loja/estoque')
  revalidatePath('/loja/produtos')

  return { lojaProdutoId, compraId }
}
