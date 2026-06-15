import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { temModulo } from '@/lib/org'
import { podeVerEstoqueLoja, podeVenderLoja } from '@/lib/permissoes'

export const metadata = { title: 'Loja — NexCoop' }

const NAV_CARDS = [
  { label: 'Produtos',   desc: '',                  href: '/loja/produtos',   icon: 'ti-package'            },
  { label: 'Estoque',    desc: 'Posição e lotes',    href: '/loja/estoque',    icon: 'ti-building-warehouse' },
  { label: 'PDV',        desc: 'Ponto de venda',     href: '/loja/pdv',        icon: 'ti-shopping-cart'      },
  { label: 'Relatórios', desc: 'Vendas e análises',  href: '/loja/relatorios', icon: 'ti-chart-bar'          },
]

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
    { data: produtosBaixos },
  ] = await Promise.all([
    supabase.from('loja_produtos').select('*', { count: 'exact', head: true }).eq('ativo', true),
    supabase.from('loja_produtos').select('estoque_atual, estoque_minimo').eq('ativo', true).not('estoque_minimo', 'is', null),
  ])

  const criticos = (produtosBaixos ?? []).filter(
    p => p.estoque_minimo != null && p.estoque_atual < p.estoque_minimo
  ).length

  const cards = NAV_CARDS.map(c => {
    if (c.label === 'Produtos') {
      const n = totalProdutos ?? 0
      return { ...c, desc: `${n} produto${n !== 1 ? 's' : ''} ativo${n !== 1 ? 's' : ''}` }
    }
    if (c.label === 'Estoque' && criticos > 0) {
      return { ...c, desc: `${criticos} com estoque crítico` }
    }
    return c
  })

  return (
    <div style={{ maxWidth: '960px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
          <h1 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: '#1a1a1a' }}>
            Loja Agropecuária
          </h1>
          <span style={{
            background: '#E07B30', color: '#fff', fontSize: '11px', fontWeight: '700',
            padding: '3px 10px', borderRadius: '20px', letterSpacing: '0.5px',
          }}>
            LOJA
          </span>
        </div>
        <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>
          Gerencie produtos, estoque e vendas da cooperativa.
        </p>
      </div>

      {/* Alerta estoque crítico */}
      {criticos > 0 && (
        <div style={{
          background: '#fff8f2', border: '1px solid #E07B30', borderRadius: '12px',
          padding: '14px 20px', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: '22px', color: '#E07B30' }} />
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px', color: '#c2611a' }}>
                {criticos} produto{criticos !== 1 ? 's' : ''} com estoque crítico
              </div>
              <div style={{ fontSize: '12px', color: '#888', marginTop: '2px' }}>
                Reposição necessária para manter o nível mínimo.
              </div>
            </div>
          </div>
          <Link
            href="/loja/estoque?filtro=criticos"
            style={{ fontSize: '13px', fontWeight: '600', color: '#E07B30', textDecoration: 'none', whiteSpace: 'nowrap' }}
          >
            Ver produtos →
          </Link>
        </div>
      )}

      {/* Cards de navegação */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
        {cards.map(card => (
          <Link
            key={card.href}
            href={card.href}
            style={{
              textDecoration: 'none', display: 'block',
              background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
              padding: '24px 26px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <i className={`ti ${card.icon}`} style={{ fontSize: '24px', color: '#E07B30' }} />
              <span style={{ fontSize: '17px', fontWeight: '600', color: '#1a1a1a' }}>{card.label}</span>
            </div>
            <div style={{
              fontSize: '13px',
              color: card.label === 'Estoque' && criticos > 0 ? '#dc2626' : '#888',
            }}>
              {card.desc}
            </div>
          </Link>
        ))}
      </div>

    </div>
  )
}
