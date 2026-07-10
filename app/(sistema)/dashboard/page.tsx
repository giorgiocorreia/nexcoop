import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Lancamento, Assembleia, Documento } from '@/types/database'
import { IndiceNex } from '@/components/dashboard/IndiceNex'
import DashboardClient from './DashboardClient'
import {
  getUltimoIndiceNex,
  getSinaisAtivos,
  getCotacoesMoageiras,
  getPrecoBahia,
  getUsdBrl,
  getIceNy,
  getUltimasCotacoesOrg,
} from '@/lib/dashboard/indice-nex.actions'
import {
  verificarInadimplencia,
  buscarResumoCotasDashboard,
} from '@/app/(sistema)/cooperados/[id]/pagamentos-actions'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Redireciona super_admin para /admin; busca tipo da org em um único select
  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('role, funcoes, organizacoes(tipo)')
    .eq('id', user.id)
    .single()
  if (usuarioData?.role === 'super_admin') redirect('/admin')

  // Redireciona para /loja se usuário tem exclusivamente funções da loja
  const FUNCOES_LOJA = ['caixa_loja', 'gerente_loja', 'estoquista_loja']
  const funcoes: string[] = (usuarioData?.funcoes as string[] | null) ?? []
  const apenasLoja =
    funcoes.length > 0 &&
    funcoes.every(f => FUNCOES_LOJA.includes(f)) &&
    !funcoes.includes('admin')

  if (apenasLoja) redirect('/loja')
  const orgTipo = (usuarioData?.organizacoes as unknown as { tipo?: string } | null)?.tipo

  // Buscar organizacao_id e dados específicos de cooperativas
  let usuarioOrg: { organizacao_id: string | null } | null = null
  let resumoCotas: Awaited<ReturnType<typeof buscarResumoCotasDashboard>> | null = null
  if (orgTipo === 'cooperativa') {
    const { data } = await supabase
      .from('usuarios')
      .select('organizacao_id')
      .eq('id', user.id)
      .single()
    usuarioOrg = data
    if (usuarioOrg?.organizacao_id) {
      await verificarInadimplencia(usuarioOrg.organizacao_id)
      resumoCotas = await buscarResumoCotasDashboard(usuarioOrg.organizacao_id)
    }
  }

  // Índice Nex — só para cooperativas
  const [snapshot, sinaisNex, cotacoesMoageiras, precoBahia, usdBrl, iceNy, ultimasCotacoesOrg] =
    orgTipo === 'cooperativa' && usuarioOrg?.organizacao_id
      ? await Promise.all([
          getUltimoIndiceNex(usuarioOrg.organizacao_id),
          getSinaisAtivos(usuarioOrg.organizacao_id),
          getCotacoesMoageiras(usuarioOrg.organizacao_id),
          getPrecoBahia(),
          getUsdBrl(),
          getIceNy(),
          getUltimasCotacoesOrg(usuarioOrg.organizacao_id),
        ])
      : [null, [], [], null, null, null, []]

  const [
    { count: totalCooperados },
    { count: cooperadosAtivos },
    { data: lancamentosPendentes },
    { data: proximaAssembleia },
    { data: documentosVencendo },
    { data: ultimosLancamentos },
  ] = await Promise.all([
    supabase.from('cooperados').select('*', { count: 'exact', head: true }),
    supabase.from('cooperados').select('*', { count: 'exact', head: true }).eq('status', 'ativo'),
    supabase.from('lancamentos')
      .select('valor, tipo')
      .eq('status', 'pendente')
      .returns<Pick<Lancamento, 'valor' | 'tipo'>[]>(),
    supabase.from('assembleias')
      .select('titulo, data_realizacao, tipo')
      .eq('status', 'agendada')
      .order('data_realizacao')
      .limit(1)
      .returns<Pick<Assembleia, 'titulo' | 'data_realizacao' | 'tipo'>[]>(),
    supabase.from('documentos')
      .select('nome, data_validade, categoria')
      .not('data_validade', 'is', null)
      .lte('data_validade', new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('data_validade')
      .limit(5)
      .returns<Pick<Documento, 'nome' | 'data_validade' | 'categoria'>[]>(),
    supabase.from('lancamentos')
      .select('descricao, valor, tipo, data_competencia, status')
      .order('criado_em', { ascending: false })
      .limit(5)
      .returns<Pick<Lancamento, 'descricao' | 'valor' | 'tipo' | 'data_competencia' | 'status'>[]>(),
  ])

  const totalReceber = lancamentosPendentes
    ?.filter(l => l.tipo === 'receita')
    .reduce((s, l) => s + Number(l.valor), 0) || 0

  const totalPagar = lancamentosPendentes
    ?.filter(l => l.tipo === 'despesa')
    .reduce((s, l) => s + Number(l.valor), 0) || 0

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  return (
    <DashboardClient
      hoje={hoje}
      totalCooperados={totalCooperados || 0}
      cooperadosAtivos={cooperadosAtivos || 0}
      totalReceber={totalReceber}
      totalPagar={totalPagar}
      documentosVencendo={documentosVencendo ?? []}
      ultimosLancamentos={ultimosLancamentos ?? []}
      proximaAssembleia={proximaAssembleia?.[0] ?? null}
      resumoCotas={resumoCotas}
      orgTipo={orgTipo}
      indiceNex={orgTipo === 'cooperativa' ? (
        <IndiceNex
          snapshot={snapshot}
          sinais={sinaisNex as Parameters<typeof IndiceNex>[0]['sinais']}
          cotacoes={cotacoesMoageiras as Parameters<typeof IndiceNex>[0]['cotacoes']}
          ultimasCotacoesOrg={ultimasCotacoesOrg as Parameters<typeof IndiceNex>[0]['ultimasCotacoesOrg']}
          precoBahia={precoBahia}
          usdBrl={usdBrl}
          iceNy={iceNy as Parameters<typeof IndiceNex>[0]['iceNy']}
        />
      ) : undefined}
    />
  )
}
