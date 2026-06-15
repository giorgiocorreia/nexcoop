import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { temModulo } from '@/lib/org'
import { podeVerEstoqueLoja, podeVenderLoja } from '@/lib/permissoes'

export const metadata = { title: 'Loja — NexCoop' }

export default async function LojaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('funcoes, role, organizacoes(modulos_ativos)')
    .eq('id', user.id)
    .single()

  const orgRaw = usuario?.organizacoes as any
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!temModulo(org?.modulos_ativos, 'loja')) redirect('/dashboard')

  const up = { role: usuario?.role ?? '', funcoes: (usuario?.funcoes ?? []) as string[] }
  if (!podeVerEstoqueLoja(up) && !podeVenderLoja(up)) redirect('/dashboard')

  const [
    { count: totalProdutos },
    { count: totalFornecedores },
    { count: totalCompras },
    { data: produtosBaixos },
    { data: ultimasCompras },
  ] = await Promise.all([
    supabase.from('loja_produtos').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('loja_fornecedores').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('loja_compras').select('*', { count: 'exact', head: true }),
    supabase.from('loja_produtos').select('estoque_atual, estoque_minimo, nome').eq('ativo', true).not('estoque_minimo', 'is', null),
    supabase.from('loja_compras').select('id, data_compra, total, loja_fornecedores(nome)').order('data_compra', { ascending: false }).limit(3),
  ])

  const criticos = (produtosBaixos ?? []).filter(
    p => p.estoque_minimo != null && p.estoque_atual < p.estoque_minimo
  )
  const qtdCriticos = criticos.length

  function fmtReal(v: number) {
    return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  function fmtData(iso: string) {
    return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
  }

  return (
    <div style={{ maxWidth: '1000px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
        <Link href="/dashboard" style={{ color: '#6b7280', textDecoration: 'none' }} onMouseEnter={e => (e.currentTarget.style.color = '#1a1a1a')} onMouseLeave={e => (e.currentTarget.style.color = '#6b7280')}>NexCoop</Link>
        <span style={{ color: '#d1d5db' }}>/</span>
        <span style={{ color: '#1a1a1a' }}>Loja Agropecuária</span>
      </div>

      {/* Alerta estoque crítico */}
      {qtdCriticos > 0 && (
        <div style={{
          background: '#fff8f2', border: '1px solid #E07B30', borderRadius: '12px',
          padding: '14px 20px', marginBottom: '24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: '22px', color: '#E07B30' }} />
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#c2611a' }}>
                {qtdCriticos} produto{qtdCriticos !== 1 ? 's' : ''} com estoque crítico
              </div>
              <div style={{ fontSize: '12px', color: '#92400e', marginTop: '2px' }}>
                {criticos.slice(0, 3).map(p => p.nome).join(', ')}{qtdCriticos > 3 ? ` e mais ${qtdCriticos - 3}` : ''}
              </div>
            </div>
          </div>
          <Link href="/loja/estoque" style={{ fontSize: '13px', fontWeight: '600', color: '#E07B30', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Ver estoque →
          </Link>
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Produtos ativos', valor: totalProdutos ?? 0, icone: 'ti-package', href: '/loja/produtos' },
          { label: 'Fornecedores', valor: totalFornecedores ?? 0, icone: 'ti-truck', href: '/loja/fornecedores' },
          { label: 'Compras realizadas', valor: totalCompras ?? 0, icone: 'ti-receipt', href: '/loja/compras' },
        ].map(kpi => (
          <Link key={kpi.href} href={kpi.href} style={{ textDecoration: 'none' }}>
            <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '10px', background: '#fff8f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={`ti ${kpi.icone}`} style={{ fontSize: '22px', color: '#E07B30' }} />
              </div>
              <div>
                <div style={{ fontSize: '22px', fontWeight: '700', color: '#1a1a1a', lineHeight: 1 }}>{kpi.valor}</div>
                <div style={{ fontSize: '12px', color: '#888', marginTop: '3px' }}>{kpi.label}</div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Acesso rápido + Últimas compras */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

        {/* Acesso rápido */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <i className="ti ti-layout-grid" style={{ fontSize: '16px', color: '#E07B30' }} />
            Acesso rápido
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {[
              { label: 'PDV — Ponto de Venda',  href: '/loja/pdv',          icone: 'ti-shopping-cart',      destaque: true  },
              { label: 'Produtos',               href: '/loja/produtos',     icone: 'ti-package'                              },
              { label: 'Estoque',                href: '/loja/estoque',      icone: 'ti-building-warehouse'                   },
              { label: 'Compras',                href: '/loja/compras',      icone: 'ti-receipt'                              },
              { label: 'Fornecedores',           href: '/loja/fornecedores', icone: 'ti-truck'                                },
              { label: 'Categorias',             href: '/loja/categorias',   icone: 'ti-tag'                                  },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 12px', borderRadius: '8px', textDecoration: 'none',
                  background: item.destaque ? '#fff8f2' : 'transparent',
                  border: item.destaque ? '1px solid #fde8d4' : '1px solid transparent',
                }}
              >
                <i className={`ti ${item.icone}`} style={{ fontSize: '16px', color: item.destaque ? '#E07B30' : '#9ca3af', flexShrink: 0 }} />
                <span style={{ fontSize: '13px', color: item.destaque ? '#92400e' : '#374151', fontWeight: item.destaque ? '600' : '400' }}>
                  {item.label}
                </span>
                {item.destaque && (
                  <i className="ti ti-chevron-right" style={{ fontSize: '14px', color: '#E07B30', marginLeft: 'auto' }} />
                )}
              </Link>
            ))}
          </div>
        </div>

        {/* Últimas compras */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '20px' }}>
          <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="ti ti-clock-hour-4" style={{ fontSize: '16px', color: '#E07B30' }} />
              Últimas compras
            </div>
            <Link href="/loja/compras" style={{ fontSize: '12px', color: '#E07B30', textDecoration: 'none', fontWeight: '500' }}>
              Ver todas →
            </Link>
          </div>

          {!ultimasCompras || ultimasCompras.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#aaa', fontSize: '13px' }}>
              <i className="ti ti-receipt-off" style={{ fontSize: '28px', display: 'block', marginBottom: '8px' }} />
              Nenhuma compra registrada
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {ultimasCompras.map((c: any) => (
                <Link
                  key={c.id}
                  href={`/loja/compras/${c.id}`}
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', border: '1px solid #f3f4f6' }}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '500', color: '#1a1a1a' }}>
                      {(c.loja_fornecedores as any)?.nome ?? 'Fornecedor'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                      {fmtData(c.data_compra)}
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                    {fmtReal(c.total)}
                  </div>
                </Link>
              ))}
            </div>
          )}

          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid #f3f4f6' }}>
            <Link
              href="/loja/compras/nova"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                padding: '9px', borderRadius: '8px', textDecoration: 'none',
                background: '#f8f7f4', border: '1px solid #e5e3dc',
                fontSize: '13px', fontWeight: '500', color: '#374151',
              }}
            >
              <i className="ti ti-plus" style={{ fontSize: '15px' }} />
              Nova compra
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
