'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Usuario, Organizacao } from '@/types/database'

interface NavItem {
  label: string
  href: string
  icone: string
  em_breve?: boolean
}

const NAV: { grupo: string; itens: NavItem[] }[] = [
  {
    grupo: 'Principal',
    itens: [
      { label: 'Dashboard',     href: '/dashboard',     icone: '📊' },
      { label: 'Cooperados',    href: '/cooperados',    icone: '👥' },
      { label: 'Mensalidades',  href: '/mensalidades',  icone: '💳' },
      { label: 'Financeiro',    href: '/financeiro',    icone: '💰' },
      { label: 'Assembleias',   href: '/assembleias',   icone: '🏛️' },
      { label: 'Documentos',    href: '/documentos',    icone: '📁' },
    ],
  },
  {
    grupo: 'Agro',
    itens: [
      { label: 'Produção',        href: '/producao',        icone: '🌱', em_breve: true },
      { label: 'Comercialização', href: '/comercializacao', icone: '🤝', em_breve: true },
      { label: 'Loja',            href: '/loja',            icone: '🏪', em_breve: true },
    ],
  },
  {
    grupo: 'Projetos',
    itens: [
      { label: 'Projetos',      href: '/projetos', icone: '🎯', em_breve: true },
      { label: 'Impacto & ESG', href: '/impacto',  icone: '🌿', em_breve: true },
    ],
  },
]

interface Props {
  usuario: (Usuario & { organizacao: Organizacao | null }) | null
}

function labelRole(role: string | undefined) {
  switch (role) {
    case 'super_admin':  return 'Administrador da Plataforma'
    case 'org_admin':    return 'Administrador'
    case 'financeiro':   return 'Financeiro'
    case 'tecnico':      return 'Técnico'
    case 'cooperado':    return 'Cooperado'
    case 'parceiro':     return 'Parceiro'
    default:             return role || ''
  }
}

export default function Sidebar({ usuario }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isSuperAdmin = usuario?.role === 'super_admin'
  const org = usuario?.organizacao

  // Cabeçalho: super_admin vê "NextCoop" com badge "Plataforma"
  // org_admin e demais veem o nome da organização
  const orgNome = isSuperAdmin
    ? 'NextCoop'
    : (org?.nome_curto || org?.nome || 'NextCoop')

  const orgTipo = isSuperAdmin
    ? 'Plataforma'
    : org?.tipo === 'cooperativa' ? 'Cooperativa'
    : org?.tipo === 'associacao'  ? 'Associação'
    : org?.tipo === 'central'     ? 'Central'
    : ''

  return (
    <aside style={{
      width: '240px', height: '100vh', background: '#ffffff',
      borderRight: '1px solid #e5e3dc', position: 'fixed', top: 0, left: 0,
      display: 'flex', flexDirection: 'column',
      fontFamily: 'system-ui, -apple-system, sans-serif', zIndex: 100,
    }}>
      {/* Cabeçalho org */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #e5e3dc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: isSuperAdmin ? '#1a1a1a' : '#1D9E75',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0,
          }}>
            {isSuperAdmin ? '⚡' : '🌱'}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {orgNome}
            </div>
            <div style={{ fontSize: '11px', color: isSuperAdmin ? '#1D9E75' : '#888', marginTop: '1px', fontWeight: isSuperAdmin ? '600' : '400' }}>
              {orgTipo}
            </div>
          </div>
        </div>
      </div>

      {/* Navegação */}
      <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
        {isSuperAdmin && (
          <div style={{ marginBottom: '0.5rem' }}>
            <div style={{
              fontSize: '10px', fontWeight: '600', color: '#aaa',
              textTransform: 'uppercase', letterSpacing: '0.8px',
              padding: '0.5rem 1rem 0.25rem',
            }}>
              Sistema
            </div>
            {[{ label: 'Admin', href: '/admin', icone: '⚙️' }].map(item => {
              const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <button key={item.href}
                  onClick={() => router.push(item.href)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 1rem', background: ativo ? '#e8f7f2' : 'transparent',
                    border: 'none', cursor: 'pointer', textAlign: 'left',
                  }}
                  onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f2' }}
                  onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icone}</span>
                  <span style={{ fontSize: '13px', fontWeight: ativo ? '600' : '400', color: ativo ? '#0F6E56' : '#444' }}>
                    {item.label}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {NAV.map(grupo => (
          <div key={grupo.grupo} style={{ marginBottom: '0.5rem' }}>
            <div style={{
              fontSize: '10px', fontWeight: '600', color: '#aaa',
              textTransform: 'uppercase', letterSpacing: '0.8px',
              padding: '0.5rem 1rem 0.25rem',
            }}>
              {grupo.grupo}
            </div>
            {grupo.itens.map(item => {
              const ativo = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <button key={item.href}
                  onClick={() => !item.em_breve && router.push(item.href)}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
                    padding: '8px 1rem', background: ativo ? '#e8f7f2' : 'transparent',
                    border: 'none', cursor: item.em_breve ? 'default' : 'pointer',
                    textAlign: 'left', opacity: item.em_breve ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { if (!ativo && !item.em_breve) (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f2' }}
                  onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                >
                  <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icone}</span>
                  <span style={{ fontSize: '13px', fontWeight: ativo ? '600' : '400', color: ativo ? '#0F6E56' : '#444', flex: 1 }}>
                    {item.label}
                  </span>
                  {item.em_breve && (
                    <span style={{ fontSize: '9px', background: '#f0f0ec', color: '#888', padding: '2px 5px', borderRadius: '4px', fontWeight: '500' }}>
                      em breve
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        ))}
      </nav>

      {/* Rodapé usuário */}
      <div style={{ borderTop: '1px solid #e5e3dc', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: isSuperAdmin ? '#1a1a1a' : '#e8f7f2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '600',
            color: isSuperAdmin ? '#fff' : '#0F6E56',
            flexShrink: 0,
          }}>
            {usuario?.nome_completo?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {usuario?.nome_completo || 'Usuário'}
            </div>
            <div style={{ fontSize: '11px', color: isSuperAdmin ? '#1D9E75' : '#888', fontWeight: isSuperAdmin ? '500' : '400' }}>
              {labelRole(usuario?.role)}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} style={{
          width: '100%', padding: '7px', background: 'transparent',
          border: '1px solid #e5e3dc', borderRadius: '8px',
          fontSize: '12px', color: '#666', cursor: 'pointer',
        }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#dc2626'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
            ;(e.currentTarget as HTMLButtonElement).style.color = '#666'
          }}
        >
          Sair da conta
        </button>
      </div>
    </aside>
  )
}
