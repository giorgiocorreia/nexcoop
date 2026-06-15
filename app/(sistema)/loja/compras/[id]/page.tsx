import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { temModulo } from '@/lib/org'
import { podeGerenciarLoja } from '@/lib/permissoes'
import { getCompra } from '@/lib/loja/actions'

export const metadata = { title: 'Detalhe da Compra — Loja | NexCoop' }

function fmtReal(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n)
}

function fmtData(s: string | null) {
  if (!s) return '—'
  const [y, m, d] = s.split('-')
  return `${d}/${m}/${y}`
}

const LARANJA = '#E07B30'

export default async function CompraDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('funcoes, role, organizacoes(modulos_ativos)')
    .eq('id', user.id)
    .single()

  const orgRaw = (usuario as any)?.organizacoes
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!temModulo(org?.modulos_ativos, 'loja')) redirect('/dashboard')

  const up = { role: usuario?.role ?? '', funcoes: ((usuario as any)?.funcoes ?? []) as string[] }
  if (!podeGerenciarLoja(up)) redirect('/loja')

  const { id } = await params
  const { data, error } = await getCompra(id)
  if (error || !data) notFound()

  const { compra, itens } = data
  const totalMercadorias = itens.reduce((sum, i) => sum + i.subtotal, 0)

  return (
    <div style={{ maxWidth: '960px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
          <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }}>NexCoop</Link>
          <span style={{ color: '#d1d5db' }}>/</span>
          <Link href="/loja" style={{ color: '#6b7280', textDecoration: 'none' }}>Loja</Link>
          <span style={{ color: '#d1d5db' }}>/</span>
          <span style={{ color: '#1a1a1a' }}>Detalhe da Compra</span>
        </div>
        <Link href="/loja/compras" style={{ color: '#888', fontSize: '13px', textDecoration: 'none' }}>
          ← Compras
        </Link>
      </div>

      {/* Cabeçalho da compra */}
      <div style={{
        background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
        padding: '20px 24px', marginBottom: '1.5rem',
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {[
            { label: 'Fornecedor', value: compra.fornecedor_nome },
            { label: 'Data da compra', value: fmtData(compra.data_compra) },
            { label: 'Número NF', value: compra.numero_nf ?? '—' },
            { label: 'Valor mercadorias', value: fmtReal(totalMercadorias) },
            { label: 'Frete', value: fmtReal(compra.valor_frete) },
            { label: 'Outros custos', value: compra.outros_custos_valor > 0 ? `${fmtReal(compra.outros_custos_valor)}${compra.outros_custos_descricao ? ` (${compra.outros_custos_descricao})` : ''}` : '—' },
          ].map(({ label, value }) => (
            <div key={label}>
              <div style={{ fontSize: '11px', fontWeight: '700', color: '#888', marginBottom: '3px' }}>{label}</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a' }}>{value}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0ede8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '13px', color: '#888' }}>
            {compra.observacoes ? `Obs: ${compra.observacoes}` : ''}
          </span>
          <span style={{ fontSize: '18px', fontWeight: '700', color: LARANJA }}>
            Total geral: {fmtReal(compra.total)}
          </span>
        </div>
      </div>

      {/* Itens */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px 24px' }}>
        <h2 style={{ margin: '0 0 16px 0', fontSize: '15px', fontWeight: '700' }}>Itens da compra</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e3dc' }}>
                {['Produto', 'Unidade', 'Qtd', 'Preço unit.', 'Frete rateado', 'Outros rateados', 'Custo final/unid', 'Subtotal'].map(h => (
                  <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: '11px', fontWeight: '700', color: '#888', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f0ede8' }}>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{item.produto_nome}</td>
                  <td style={{ padding: '10px', color: '#555' }}>{item.produto_unidade}</td>
                  <td style={{ padding: '10px' }}>{Number(item.quantidade).toLocaleString('pt-BR', { maximumFractionDigits: 3 })}</td>
                  <td style={{ padding: '10px' }}>{fmtReal(item.subtotal / item.quantidade)}</td>
                  <td style={{ padding: '10px', color: '#555' }}>{fmtReal(item.frete_rateado)}</td>
                  <td style={{ padding: '10px', color: '#555' }}>{fmtReal(item.outros_rateado)}</td>
                  <td style={{ padding: '10px', fontWeight: '700', color: LARANJA }}>{fmtReal(item.custo_final_unitario)}</td>
                  <td style={{ padding: '10px', fontWeight: '600' }}>{fmtReal(item.subtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
