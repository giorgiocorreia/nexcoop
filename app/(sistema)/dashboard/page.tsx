import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Lancamento, Assembleia, Documento } from '@/types/database'
import { CardCotacaoCacau } from '@/components/dashboard/CardCotacaoCacau'
import {
  getCotacaoMercadoAtual,
  getTendencia7dias,
  getConfigPrecosSugeridos,
} from '@/lib/dashboard/cotacoes-mercado-actions'
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

  // Verificar inadimplência e resumo de cotas — só para cooperativas
  let resumoCotas: Awaited<ReturnType<typeof buscarResumoCotasDashboard>> | null = null
  if (orgTipo === 'cooperativa') {
    const { data: usuarioOrg } = await supabase
      .from('usuarios')
      .select('organizacao_id')
      .eq('id', user.id)
      .single()
    if (usuarioOrg?.organizacao_id) {
      await verificarInadimplencia(usuarioOrg.organizacao_id)
      resumoCotas = await buscarResumoCotasDashboard(usuarioOrg.organizacao_id)
    }
  }

  // Dados de cotação de cacau — só para cooperativas
  const [cotacaoAtual, tendencia7d, configCotacao] =
    orgTipo === 'cooperativa'
      ? await Promise.all([
          getCotacaoMercadoAtual(),
          getTendencia7dias(),
          getConfigPrecosSugeridos(),
        ])
      : [null, null, null]

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

  const formatBRL = (v: number) =>
    v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

  const hoje = new Date()

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      <div style={{ textAlign: 'right', marginBottom: '1.25rem' }}>
        <span style={{ fontSize: '12px', color: '#bbb' }}>
          {hoje.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: resumoCotas ? '1rem' : '2rem' }}>
        <CardResumo label="Total de filiados" valor={String(totalCooperados || 0)} sub={`${cooperadosAtivos || 0} ativos`} cor="#635BFF" bg="#EEF0FF" />
        <CardResumo label="A receber" valor={formatBRL(totalReceber)} sub="Lançamentos pendentes" cor="#185FA5" bg="#E6F1FB" />
        <CardResumo label="A pagar" valor={formatBRL(totalPagar)} sub="Lançamentos pendentes" cor="#993C1D" bg="#FAECE7" />
        <CardResumo label="Docs vencendo" valor={String(documentosVencendo?.length || 0)} sub="Próximos 30 dias" cor="#854F0B" bg="#FAEEDA" />
      </div>

      {resumoCotas && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '2rem' }}>
          {/* Card 1 — Capital a Receber */}
          <div style={{ background: '#E6F1FB', border: '1px solid #B5D4F4', borderRadius: '12px', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              CAPITAL A RECEBER
            </div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: '#185FA5' }}>
              {formatBRL(resumoCotas.totalAReceber)}
            </div>
            {resumoCotas.totalVencido > 0 && (
              <div style={{ fontSize: '12px', color: '#dc2626', marginTop: '4px', fontWeight: '500' }}>
                Vencido: {formatBRL(resumoCotas.totalVencido)}
              </div>
            )}
            {resumoCotas.totalVencido === 0 && (
              <div style={{ fontSize: '11px', color: '#185FA599', marginTop: '2px' }}>
                Parcelas pendentes de cotas
              </div>
            )}
          </div>

          {/* Card 2 — Inadimplentes */}
          <div style={{
            background: resumoCotas.totalInadimplentes > 0 ? '#FEF3C7' : '#f8f7f4',
            border: `1px solid ${resumoCotas.totalInadimplentes > 0 ? '#fcd34d' : '#e5e3dc'}`,
            borderRadius: '12px', padding: '1rem 1.25rem',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: resumoCotas.totalInadimplentes > 0 ? '#854F0B' : '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              COOPERADOS INADIMPLENTES
            </div>
            <div style={{ fontSize: '22px', fontWeight: '700', color: resumoCotas.totalInadimplentes > 0 ? '#854F0B' : '#374151' }}>
              {resumoCotas.totalInadimplentes}
            </div>
            {resumoCotas.inadimplentes.length > 0 && (
              <div style={{ fontSize: '11px', color: '#633806', marginTop: '4px' }}>
                {resumoCotas.inadimplentes
                  .slice(0, 3)
                  .map(c => c.nome_completo.split(' ').slice(0, 2).join(' '))
                  .join(', ')}
                {resumoCotas.inadimplentes.length > 3 && ` e mais ${resumoCotas.inadimplentes.length - 3}…`}
              </div>
            )}
            {resumoCotas.totalInadimplentes === 0 && (
              <div style={{ fontSize: '11px', color: '#88888899', marginTop: '2px' }}>
                Nenhum cooperado inadimplente
              </div>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '15px', fontWeight: '600', margin: 0 }}>Últimos lançamentos</h2>
            <a href="/financeiro" style={{ fontSize: '12px', color: '#635BFF', textDecoration: 'none' }}>Ver todos →</a>
          </div>
          {ultimosLancamentos?.length ? (
            <div>
              {ultimosLancamentos.map((l, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderTop: i > 0 ? '1px solid #f0eeea' : 'none' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>{l.descricao}</div>
                    <div style={{ fontSize: '11px', color: '#888', marginTop: '1px' }}>
                      {new Date(l.data_competencia).toLocaleDateString('pt-BR')} ·{' '}
                      <span style={{ color: l.status === 'pago' ? '#4840CC' : '#854F0B' }}>
                        {l.status === 'pago' ? 'Pago' : 'Pendente'}
                      </span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: l.tipo === 'receita' ? '#4840CC' : '#993C1D' }}>
                    {l.tipo === 'receita' ? '+' : '-'}{formatBRL(Number(l.valor))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '1rem 0' }}>
              Nenhum lançamento registrado ainda.
            </p>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {proximaAssembleia?.[0] && (
            <div style={{ background: '#E6F1FB', border: '1px solid #B5D4F4', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                Próxima assembleia
              </div>
              <div style={{ fontSize: '15px', fontWeight: '600', color: '#0C447C' }}>{proximaAssembleia[0].titulo}</div>
              <div style={{ fontSize: '13px', color: '#185FA5', marginTop: '4px' }}>
                {new Date(proximaAssembleia[0].data_realizacao).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </div>
          )}

          {documentosVencendo && documentosVencendo.length > 0 && (
            <div style={{ background: '#FAEEDA', border: '1px solid #FAC775', borderRadius: '12px', padding: '1.25rem' }}>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#854F0B', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Documentos vencendo em 30 dias
              </div>
              {documentosVencendo.map((doc, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderTop: i > 0 ? '1px solid #EF9F27' : 'none' }}>
                  <span style={{ fontSize: '12px', color: '#633806' }}>{doc.nome}</span>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#993C1D' }}>
                    {new Date(doc.data_validade!).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '10px' }}>Ações rápidas</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {[
                { label: 'Novo filiado', href: '/cooperados/novo', icone: '👤' },
                { label: 'Novo lançamento', href: '/financeiro/novo', icone: '💸' },
                { label: 'Nova assembleia', href: '/assembleias/nova', icone: '🏛️' },
                { label: 'Novo documento', href: '/documentos/novo', icone: '📄' },
              ].map(a => (
                <a key={a.href} href={a.href} style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 10px',
                  background: '#f8f7f4', border: '1px solid #e5e3dc', borderRadius: '8px',
                  textDecoration: 'none', fontSize: '12px', color: '#444', fontWeight: '500',
                }}>
                  <span>{a.icone}</span>{a.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>

      {orgTipo === 'cooperativa' && (
        <CardCotacaoCacau
          cepea={cotacaoAtual?.cepea ?? null}
          iceNy={cotacaoAtual?.iceNy ?? null}
          tendencia={tendencia7d ?? []}
          config={configCotacao}
        />
      )}
    </div>
  )
}

function CardResumo({ label, valor, sub, cor, bg }: {
  label: string; valor: string; sub: string; cor: string; bg: string
}) {
  return (
    <div style={{ background: bg, border: `1px solid ${cor}33`, borderRadius: '12px', padding: '1rem 1.25rem' }}>
      <div style={{ fontSize: '12px', fontWeight: '500', color: cor, marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: '700', color: cor }}>{valor}</div>
      <div style={{ fontSize: '11px', color: `${cor}99`, marginTop: '2px' }}>{sub}</div>
    </div>
  )
}
