'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export interface DadosComprovantePagamento {
  comprovante: {
    id: string
    numero_sequencial: number
    emitido_em: string
    status: string
  }
  organizacao: {
    nome: string
    cnpj: string
    cidade: string
  }
  operador: {
    nome: string
  }
  produtor: {
    nome: string
    cpf: string
    tipo: string
  }
  produto: {
    nome: string
    unidade: string
  }
  pagamento: {
    tipo: string
    quantidade_kg: number
    cotacao: number
    valor_pago: number
    forma: string
    observacoes: string | null
    created_at: string
  }
  posicao: {
    total_entregue_kg: number
    total_vendido_kg: number
    saldo_ordem_kg: number
  }
}

export async function emitirComprovantePagamento(
  movimentacao_id: string
): Promise<{ comprovante_id: string; numero: number }> {
  const admin = createAdminClient()
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Usuário não autenticado')

  // Idempotente: retorna existente se já emitido
  const { data: existente } = await admin
    .from('comprovantes_pagamento')
    .select('id, numero_sequencial')
    .eq('movimentacao_id', movimentacao_id)
    .neq('status', 'cancelado')
    .maybeSingle()

  if (existente) {
    return { comprovante_id: existente.id, numero: existente.numero_sequencial }
  }

  // Busca o saque com joins
  const { data: mov, error: movErr } = await admin
    .from('movimentacoes_conta')
    .select(`
      id,
      tipo,
      conta_id,
      valor_financeiro,
      forma_pagamento,
      observacoes,
      quantidade_produto,
      preco_unitario,
      produto_id,
      created_at,
      contas_produtor(
        produtor_id,
        produtores(nome, cpf, tipo)
      ),
      produtos(nome, unidade),
      sessao_caixa_id,
      sessoes_caixa!sessao_caixa_id(
        id,
        organizacao_id,
        usuario_id,
        usuarios!usuario_id(nome_completo)
      )
    `)
    .eq('id', movimentacao_id)
    .single()

  if (movErr || !mov) throw new Error('Movimentação não encontrada')

  const sessaoCaixa = (mov as any).sessoes_caixa
  const sess = Array.isArray(sessaoCaixa) ? sessaoCaixa[0] : sessaoCaixa
  const organizacao_id: string = sess?.organizacao_id
  if (!organizacao_id) throw new Error('Organização não encontrada na sessão')

  const contaProdutor = (mov as any).contas_produtor
  const cp = Array.isArray(contaProdutor) ? contaProdutor[0] : contaProdutor
  const produtorRaw = Array.isArray(cp?.produtores) ? cp.produtores[0] : cp?.produtores

  const sessaoUsuarios = Array.isArray(sess?.usuarios) ? sess.usuarios[0] : sess?.usuarios
  const operadorNome: string = sessaoUsuarios?.nome_completo ?? ''
  const sessaoId: string = sess?.id ?? (mov as any).sessao_caixa_id ?? ''

  // Produto direto no saque (só para conversao-based saques que usam base spread)
  let produtoId: string | null = (mov as any).produto_id ?? null
  let produtoNome = ''
  let produtoUnidade = ''
  let quantidadeKg = 0
  let cotacao = 0

  const produtoRaw = (mov as any).produtos
  const produtoDireto = produtoRaw ? (Array.isArray(produtoRaw) ? produtoRaw[0] : produtoRaw) : null
  if (produtoDireto) {
    produtoNome = produtoDireto.nome ?? ''
    produtoUnidade = produtoDireto.unidade ?? ''
  }
  if ((mov as any).quantidade_produto) quantidadeKg = (mov as any).quantidade_produto
  if ((mov as any).preco_unitario) cotacao = (mov as any).preco_unitario

  // Se não tem produto no saque, busca a conversao associada (mesma conta/sessao, criada ≤ 60s antes)
  if (!produtoId) {
    const { data: conv } = await admin
      .from('movimentacoes_conta')
      .select('produto_id, quantidade_produto, preco_unitario, produtos(nome, unidade)')
      .eq('conta_id', (mov as any).conta_id)
      .eq('sessao_caixa_id', sessaoId)
      .eq('tipo', 'conversao')
      .lte('created_at', (mov as any).created_at)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (conv) {
      produtoId = (conv as any).produto_id ?? null
      quantidadeKg = (conv as any).quantidade_produto ?? 0
      cotacao = (conv as any).preco_unitario ?? 0
      const cp2 = (conv as any).produtos
      const p2 = Array.isArray(cp2) ? cp2[0] : cp2
      if (p2) { produtoNome = p2.nome ?? ''; produtoUnidade = p2.unidade ?? '' }
    }
  }

  // Saldo a ordem (kg) e posição
  let saldo_ordem_kg = 0
  let total_entregue_kg = 0
  let total_vendido_kg = 0

  const contaId: string = (mov as any).conta_id ?? ''

  if (contaId) {
    const { data: todasMov } = await admin
      .from('movimentacoes_conta')
      .select('tipo, quantidade_produto, produto_id')
      .eq('conta_id', contaId)

    const movs = (todasMov ?? []) as any[]

    total_entregue_kg = movs
      .filter((m: any) => m.tipo === 'entrega' && (!produtoId || m.produto_id === produtoId))
      .reduce((acc: number, m: any) => acc + (m.quantidade_produto ?? 0), 0)

    total_vendido_kg = movs
      .filter((m: any) => m.tipo === 'conversao' && (!produtoId || m.produto_id === produtoId))
      .reduce((acc: number, m: any) => acc + (m.quantidade_produto ?? 0), 0)

    saldo_ordem_kg = Math.max(0, total_entregue_kg - total_vendido_kg)
  }

  // Número sequencial via RPC
  const { data: numeroData, error: numErr } = await (admin as any)
    .rpc('proximo_numero_comprovante_pagamento', { p_org_id: organizacao_id })
  if (numErr) throw new Error('Erro ao gerar número sequencial: ' + numErr.message)
  const numero_sequencial = numeroData as number

  const forma = (mov as any).forma_pagamento === 'pix' ? 'Pix' : 'Especie'

  const snapshot = {
    movimentacao_id,
    tipo: (mov as any).tipo,
    valor_pago: Math.abs((mov as any).valor_financeiro ?? 0),
    forma_pagamento: (mov as any).forma_pagamento,
    forma,
    observacoes: (mov as any).observacoes,
    quantidade_kg: quantidadeKg,
    cotacao,
    produto_nome: produtoNome,
    produto_unidade: produtoUnidade,
    produtor_nome: produtorRaw?.nome ?? '',
    produtor_cpf: produtorRaw?.cpf ?? '',
    produtor_tipo: produtorRaw?.tipo ?? '',
    operador_nome: operadorNome,
    created_at: (mov as any).created_at,
    saldo_ordem_kg,
    total_entregue_kg,
    total_vendido_kg,
  }

  const { data: comprovante, error: insertErr } = await admin
    .from('comprovantes_pagamento')
    .insert({
      organizacao_id,
      movimentacao_id,
      numero_sequencial,
      status: 'emitido',
      snapshot,
      emitido_por: user.id,
    })
    .select('id, numero_sequencial')
    .single()

  if (insertErr || !comprovante) throw new Error('Erro ao criar comprovante: ' + insertErr?.message)

  return { comprovante_id: comprovante.id, numero: comprovante.numero_sequencial }
}

export async function buscarDadosComprovantePagamento(
  comprovante_id: string
): Promise<DadosComprovantePagamento> {
  const admin = createAdminClient()

  const { data: comp, error } = await admin
    .from('comprovantes_pagamento')
    .select('id, numero_sequencial, emitido_em, status, snapshot, organizacao_id, emitido_por')
    .eq('id', comprovante_id)
    .single()

  if (error || !comp) throw new Error('Comprovante não encontrado')

  const snap = (comp.snapshot as any) ?? {}

  const { data: org } = await admin
    .from('organizacoes')
    .select('nome, cnpj, cidade')
    .eq('id', comp.organizacao_id)
    .single()

  if (!org) throw new Error('Organização não encontrada')

  const { data: operadorData } = comp.emitido_por
    ? await admin.from('usuarios').select('nome_completo').eq('id', comp.emitido_por).maybeSingle()
    : { data: null }

  const emitido_em: string = comp.emitido_em ?? snap.created_at ?? new Date().toISOString()

  return {
    comprovante: {
      id: comp.id,
      numero_sequencial: comp.numero_sequencial,
      emitido_em,
      status: comp.status,
    },
    organizacao: {
      nome: (org as any).nome ?? '',
      cnpj: (org as any).cnpj ?? '',
      cidade: (org as any).cidade ?? '',
    },
    operador: {
      nome: snap.operador_nome || (operadorData as any)?.nome_completo || '',
    },
    produtor: {
      nome: snap.produtor_nome ?? '',
      cpf: snap.produtor_cpf ?? '',
      tipo: snap.produtor_tipo ?? '',
    },
    produto: {
      nome: snap.produto_nome ?? '',
      unidade: snap.produto_unidade ?? '',
    },
    pagamento: {
      tipo: snap.tipo ?? '',
      quantidade_kg: snap.quantidade_kg ?? 0,
      cotacao: snap.cotacao ?? 0,
      valor_pago: snap.valor_pago ?? 0,
      forma: snap.forma ?? (snap.forma_pagamento === 'pix' ? 'Pix' : 'Especie'),
      observacoes: snap.observacoes ?? null,
      created_at: snap.created_at ?? emitido_em,
    },
    posicao: {
      total_entregue_kg: snap.total_entregue_kg ?? 0,
      total_vendido_kg: snap.total_vendido_kg ?? 0,
      saldo_ordem_kg: snap.saldo_ordem_kg ?? 0,
    },
  }
}
