'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export interface MovimentacaoExtrato {
  id: string
  tipo: string
  quantidade_produto: number | null
  valor_financeiro: number | null
  forma_pagamento: string | null
  created_at: string
  observacoes: string | null
  produto_nome: string | null
  produto_unidade: string | null
  quantidade_vendida: number | null
}

export interface DadosCooperado {
  numero_matricula: string | null
  status: string
  quota_parte: number | null
  area_total_ha: number | null
  caf_numero: string | null
  dap_numero: string | null
  data_admissao: string | null
  tipo: string | null
}

export interface DadosExtratoProdutor {
  produtor: {
    nome: string
    cpf: string | null
    tipo: string
    municipio: string | null
    ie_produtor_rural: string | null
    cooperado_id: string | null
    area_total_ha: number | null
    area_cacau_ha: number | null
    nome_propriedade: string | null
    tipo_posse: string | null
    tem_certificacao: boolean
    tipo_certificacao: string | null
    banco: string | null
    agencia: string | null
    conta_bancaria: string | null
    tipo_conta: string | null
    chave_pix: string | null
  }
  cooperado: DadosCooperado | null
  organizacao: {
    nome: string
    cnpj: string
    logo_url: string | null
    municipio: string | null
  }
  periodo: {
    inicio: string | null
    fim: string | null
    tipo: 'total' | 'periodo'
  }
  movimentacoes: MovimentacaoExtrato[]
  saldo_atual_produto: number
  saldo_atual_financeiro: number
  produto_nome: string | null
  produto_unidade: string | null
}

export async function buscarDadosExtratoProdutor(
  produtor_id: string,
  tipo: 'total' | 'periodo',
  data_inicio?: string,
  data_fim?: string
): Promise<DadosExtratoProdutor> {
  const admin = createAdminClient()

  const { data: produtor, error: prodErr } = await admin
    .from('produtores')
    .select(`
      id, nome, cpf, tipo, municipio, ie_produtor_rural, cooperado_id,
      area_total_ha, area_cacau_ha, nome_propriedade, tipo_posse,
      tem_certificacao, tipo_certificacao, banco, agencia,
      conta_bancaria, tipo_conta, chave_pix, organizacao_id
    `)
    .eq('id', produtor_id)
    .single()

  if (prodErr || !produtor) throw new Error('Produtor não encontrado')

  const { data: org } = await admin
    .from('organizacoes')
    .select('nome, cnpj, logo_url, municipio')
    .eq('id', (produtor as any).organizacao_id)
    .single()

  let cooperado: DadosCooperado | null = null
  if ((produtor as any).cooperado_id) {
    const { data: coop } = await admin
      .from('cooperados')
      .select(`
        numero_matricula, status, quota_parte, area_total_ha,
        caf_numero, dap_numero, data_admissao, tipo
      `)
      .eq('id', (produtor as any).cooperado_id)
      .maybeSingle()

    if (coop) {
      cooperado = {
        numero_matricula: (coop as any).numero_matricula ?? null,
        status: (coop as any).status ?? '',
        quota_parte: (coop as any).quota_parte ?? null,
        area_total_ha: (coop as any).area_total_ha ?? null,
        caf_numero: (coop as any).caf_numero ?? null,
        dap_numero: (coop as any).dap_numero ?? null,
        data_admissao: (coop as any).data_admissao ?? null,
        tipo: (coop as any).tipo ?? null,
      }
    }
  }

  const { data: conta } = await admin
    .from('contas_produtor')
    .select('id, saldo_financeiro, saldos_produto(quantidade, produtos(nome, unidade))')
    .eq('produtor_id', produtor_id)
    .maybeSingle()

  const contaId = (conta as any)?.id ?? ''

  let queryMovs = admin
    .from('movimentacoes_conta')
    .select(`
      id, tipo, quantidade_produto, valor_financeiro,
      forma_pagamento, created_at, observacoes,
      produtos(nome, unidade)
    `)
    .eq('conta_id', contaId)
    .order('created_at', { ascending: true })

  if (tipo === 'periodo' && data_inicio) {
    queryMovs = queryMovs.gte('created_at', `${data_inicio}T00:00:00-03:00`)
  }
  if (tipo === 'periodo' && data_fim) {
    queryMovs = queryMovs.lte('created_at', `${data_fim}T23:59:59-03:00`)
  }

  const { data: todasMovs } = await queryMovs
  const movs = (todasMovs ?? []) as any[]

  const conversoes = movs.filter((m: any) => m.tipo === 'conversao')

  const movimentacoes: MovimentacaoExtrato[] = movs
    .filter((m: any) => m.tipo !== 'conversao')
    .map((m: any) => {
      let quantidade_vendida: number | null = null

      if (m.tipo === 'saque_especie' || m.tipo === 'saque_pix') {
        const tSaque = new Date(m.created_at).getTime()
        const conv = conversoes.find((c: any) => {
          const tConv = new Date(c.created_at).getTime()
          return tConv <= tSaque && tSaque - tConv <= 5000
        })
        if (conv) quantidade_vendida = conv.quantidade_produto ?? null
      }

      return {
        id: m.id,
        tipo: m.tipo,
        quantidade_produto: m.quantidade_produto,
        valor_financeiro: m.valor_financeiro,
        forma_pagamento: m.forma_pagamento,
        created_at: m.created_at,
        observacoes: m.observacoes,
        produto_nome: m.produtos?.nome ?? null,
        produto_unidade: m.produtos?.unidade ?? null,
        quantidade_vendida,
      }
    })

  const saldos = (conta as any)?.saldos_produto ?? []
  const mainSaldo = saldos.length > 0
    ? saldos.reduce((max: any, s: any) => s.quantidade > max.quantidade ? s : max, saldos[0])
    : null

  return {
    produtor: {
      nome: (produtor as any).nome,
      cpf: (produtor as any).cpf,
      tipo: (produtor as any).tipo,
      municipio: (produtor as any).municipio,
      ie_produtor_rural: (produtor as any).ie_produtor_rural,
      cooperado_id: (produtor as any).cooperado_id,
      area_total_ha: (produtor as any).area_total_ha,
      area_cacau_ha: (produtor as any).area_cacau_ha,
      nome_propriedade: (produtor as any).nome_propriedade,
      tipo_posse: (produtor as any).tipo_posse,
      tem_certificacao: (produtor as any).tem_certificacao ?? false,
      tipo_certificacao: (produtor as any).tipo_certificacao,
      banco: (produtor as any).banco,
      agencia: (produtor as any).agencia,
      conta_bancaria: (produtor as any).conta_bancaria,
      tipo_conta: (produtor as any).tipo_conta,
      chave_pix: (produtor as any).chave_pix,
    },
    cooperado,
    organizacao: {
      nome: (org as any)?.nome ?? '',
      cnpj: (org as any)?.cnpj ?? '',
      logo_url: (org as any)?.logo_url ?? null,
      municipio: (org as any)?.municipio ?? null,
    },
    periodo: { inicio: data_inicio ?? null, fim: data_fim ?? null, tipo },
    movimentacoes,
    saldo_atual_produto: mainSaldo?.quantidade ?? 0,
    saldo_atual_financeiro: (conta as any)?.saldo_financeiro ?? 0,
    produto_nome: mainSaldo?.produtos?.nome ?? null,
    produto_unidade: mainSaldo?.produtos?.unidade ?? null,
  }
}
