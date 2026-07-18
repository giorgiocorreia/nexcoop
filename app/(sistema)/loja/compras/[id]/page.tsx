import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { temModulo } from '@/lib/org'
import { podeGerenciarLoja } from '@/lib/permissoes'
import { getCompra } from '@/lib/loja/actions'
import BotaoCancelarCompra from './BotaoCancelarCompra'
import PainelParcelas from './PainelParcelas'

export const metadata = { title: 'Detalhe da Compra — Loja | NexCoop' }

const C = {
  laranja: '#E07B30', laranjaLt: '#FFF7ED',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', txtSub: '#78716C',
}

function fmtReal(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtData(s: string | null) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

export default async function CompraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id, funcoes, role, organizacoes(modulos_ativos)')
    .eq('id', user.id)
    .single()

  const orgRaw = (usuario as any)?.organizacoes
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!temModulo(org?.modulos_ativos, 'loja')) redirect('/dashboard')

  const orgId = (usuario as any)?.organizacao_id as string
  const up = { role: usuario?.role ?? '', funcoes: ((usuario as any)?.funcoes ?? []) as string[] }
  if (!podeGerenciarLoja(up)) redirect('/loja')

  const { id } = await params
  const { data, error } = await getCompra(id)
  if (error || !data) notFound()

  const { compra, itens } = data
  const totalMercadorias = itens.reduce((sum, i) => sum + i.subtotal, 0)
  const cancelada = (compra.observacoes ?? '').startsWith('[CANCELADA')
  const tituloNF = compra.numero_nf ? `NF ${compra.numero_nf}` : `Compra #${id.slice(0, 8)}`

  return (
    <>
      <style>{`
        .cd-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .cd-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .cd-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .cd-content { padding: 16px; }
        }
      `}</style>

      <header className="cd-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <div style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 10, background: C.laranjaLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="ti ti-receipt" style={{ fontSize: 20, color: C.laranja }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>{tituloNF}</h1>
              {cancelada && (
                <span style={{ fontSize: 11, fontWeight: 700, background: '#fef2f2', color: '#dc2626', padding: '2px 8px', borderRadius: 6 }}>
                  Cancelada
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/loja" style={{ color: C.txtSub, textDecoration: 'none' }}>Loja Agropecuária</Link>
              {' / '}
              <Link href="/loja/compras" style={{ color: C.txtSub, textDecoration: 'none' }}>Compras</Link>
              {' / '}Detalhe
            </div>
          </div>
        </div>
        <span style={{ fontSize: 18, fontWeight: 700, color: C.laranja, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {fmtReal(compra.total)}
        </span>
      </header>

      <div className="cd-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <div style={{ maxWidth: '960px' }}>

          {/* Resumo da compra */}
          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: '12px', padding: '20px 24px', marginBottom: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
              {[
                { label: 'Fornecedor',        value: compra.fornecedor_nome },
                { label: 'Data da compra',    value: fmtData(compra.data_compra) },
                { label: 'Número NF',         value: compra.numero_nf ?? '—' },
                { label: 'Valor mercadorias', value: fmtReal(totalMercadorias) },
                { label: 'Frete',             value: fmtReal(compra.valor_frete) },
                {
                  label: 'Outros custos',
                  value: compra.outros_custos_valor > 0
                    ? `${fmtReal(compra.outros_custos_valor)}${compra.outros_custos_descricao ? ` (${compra.outros_custos_descricao})` : ''}`
                    : '—',
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: C.txtSub, marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: C.txt }}>{value}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: `1px solid #f0ede8`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {compra.observacoes && (
                  <span style={{ fontSize: '13px', color: cancelada ? '#dc2626' : C.txtSub }}>
                    {compra.observacoes}
                  </span>
                )}
                <BotaoCancelarCompra
                  compraId={compra.id}
                  orgId={orgId}
                  usuarioId={user.id}
                  cancelada={cancelada}
                />
              </div>
              <span style={{ fontSize: '16px', fontWeight: '700', color: C.laranja }}>
                Total geral: {fmtReal(compra.total)}
              </span>
            </div>
          </div>

          {/* Parcelas */}
          <PainelParcelas compraId={compra.id} orgId={orgId} usuarioId={user.id} />

          {/* Itens */}
          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: '12px', padding: '20px 24px' }}>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700', color: C.txt }}>Itens da compra</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', minWidth: 700 }}>
                <thead>
                  <tr style={{ borderBottom: `2px solid ${C.borda}`, background: '#fafaf9' }}>
                    {['Produto', 'Un.', 'Qtd', 'Preço unit.', 'Frete rateado', 'Outros rateados', 'Custo final/unid', 'Subtotal'].map(h => (
                      <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: C.txtSub, whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((item, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                      <td style={{ padding: '11px 12px', fontWeight: '600', color: C.txt }}>{item.produto_nome}</td>
                      <td style={{ padding: '11px 12px', color: C.txtSub }}>{item.produto_unidade}</td>
                      <td style={{ padding: '11px 12px' }}>{Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
                      <td style={{ padding: '11px 12px' }}>{fmtReal(item.subtotal / item.quantidade)}</td>
                      <td style={{ padding: '11px 12px', color: C.txtSub }}>{fmtReal(item.frete_rateado)}</td>
                      <td style={{ padding: '11px 12px', color: C.txtSub }}>{fmtReal(item.outros_rateado)}</td>
                      <td style={{ padding: '11px 12px', fontWeight: '700', color: C.laranja }}>{fmtReal(item.custo_final_unitario)}</td>
                      <td style={{ padding: '11px 12px', fontWeight: '600' }}>{fmtReal(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
