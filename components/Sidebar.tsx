'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import type { Usuario, Organizacao } from '@/types/database'

interface NavItem {
  label: string
  href: string
  icone: string
  em_breve?: boolean
  exact?: boolean
}

interface NavGrupo {
  grupo: string
  itens: NavItem[]
}

const NAV_ADMIN: NavGrupo[] = [
  {
    grupo: 'Sistema',
    itens: [
      { label: 'Dashboard', href: '/admin', icone: '📊', exact: true },
    ],
  },
  {
    grupo: 'Plataforma',
    itens: [
      { label: 'Organizações', href: '/admin',          icone: '🏢', exact: true },
      { label: 'Usuários',     href: '/admin/usuarios', icone: '👥', em_breve: true },
      { label: 'Módulos',      href: '/admin/modulos',  icone: '🧩', em_breve: true },
      { label: 'Planos',       href: '/admin/planos',   icone: '💳', em_breve: true },
      { label: 'Manuais',      href: '/admin/manuais',  icone: '📚' },
      { label: 'Logs',         href: '/admin/logs',     icone: '📋' },
    ],
  },
]

const CONTABIL_ITENS: NavItem[] = [
  { label: 'Plano de Contas',     href: '/contabil/plano-de-contas', icone: '📋' },
  { label: 'Escrituração',        href: '/contabil/escrituracao',    icone: '✏️' },
  { label: 'Balancete',           href: '/contabil/balancete',       icone: '⚖️' },
  { label: 'DRE',                 href: '/contabil/dre',             icone: '📈' },
  { label: 'Balanço Patrimonial', href: '/contabil/balanco',         icone: '🏦' },
  { label: 'Livro Razão',         href: '/contabil/razao',           icone: '📖' },
  { label: 'Livro Diário',        href: '/contabil/diario',          icone: '📒' },
  { label: 'Resultado & Destinações', href: '/contabil/sobras',       icone: '💰' },
  { label: 'Conciliação Bancária', href: '/contabil/conciliacao',    icone: '🏦' },
  { label: 'Calendário',           href: '/contabil/calendario',     icone: '📅' },
  { label: 'NF-e',                href: '/contabil/nfe',             icone: '🧾' },
  { label: 'Exportações',         href: '/contabil/exportacoes',     icone: '📤' },
]

function buildNav(usuario: (Usuario & { organizacao: Organizacao | null }) | null, isParceiro?: boolean): NavGrupo[] {
  const funcoes = (usuario?.funcoes ?? []) as string[]
  const isAdmin         = funcoes.includes('admin')
  const isContador      = funcoes.includes('contador') || funcoes.includes('contador_aux')
  const isFinanceiro    = funcoes.includes('financeiro')
  const isTecnico       = funcoes.includes('tecnico')
  const isCaptador      = funcoes.includes('captador')
  const isConselhoFiscal = funcoes.includes('conselho_fiscal')
  const isCaixaCacau    = funcoes.includes('caixa_cacau')

  const grupos: NavGrupo[] = []

  // ── PRINCIPAL ─────────────────────────────────────────────────────────────
  const principalItens: NavItem[] = []
  if (isAdmin || isFinanceiro || isTecnico || isConselhoFiscal)
    principalItens.push({ label: 'Dashboard',    href: '/dashboard',    icone: '📊' })
  if (isAdmin || isTecnico)
    principalItens.push({ label: 'Cooperados',   href: '/cooperados',   icone: '👥' })
  if (isAdmin || isFinanceiro)
    principalItens.push({ label: 'Mensalidades', href: '/mensalidades', icone: '💳' })
  if (isAdmin || isFinanceiro || isConselhoFiscal)
    principalItens.push({ label: 'Financeiro',   href: '/financeiro',   icone: '💰' })
  if (isAdmin || isConselhoFiscal)
    principalItens.push({ label: 'Assembleias',  href: '/assembleias',  icone: '🏛️' })
  if (isAdmin || isTecnico)
    principalItens.push({ label: 'Documentos',   href: '/documentos',   icone: '📁' })
  if (principalItens.length > 0)
    grupos.push({ grupo: 'Principal', itens: principalItens })

  // ── AGRO ──────────────────────────────────────────────────────────────────
  const agroItens: NavItem[] = []
  if (isAdmin || isTecnico)
    agroItens.push({ label: 'Produção', href: '/producao', icone: '🌱', em_breve: true })
  if (isAdmin || isFinanceiro || isTecnico || isCaixaCacau)
    agroItens.push({ label: 'Comercialização', href: '/comercializacao', icone: '🤝' })
  if (isAdmin)
    agroItens.push({ label: 'Loja', href: '/loja', icone: '🏪', em_breve: true })
  if (agroItens.length > 0)
    grupos.push({ grupo: 'Agro', itens: agroItens })

  // ── PROJETOS ──────────────────────────────────────────────────────────────
  const projetosItens: NavItem[] = []
  if (isAdmin || isCaptador)
    projetosItens.push({ label: 'Captação', href: '/captacao', icone: '🎯' })
  if (isAdmin) {
    projetosItens.push(
      { label: 'Projetos',      href: '/projetos', icone: '🎯', em_breve: true },
      { label: 'Impacto & ESG', href: '/impacto',  icone: '🌿', em_breve: true },
    )
  }
  if (projetosItens.length > 0)
    grupos.push({ grupo: 'Projetos', itens: projetosItens })

  // ── CONTÁBIL ──────────────────────────────────────────────────────────────
  if (isAdmin || isContador)
    grupos.push({ grupo: 'Contábil', itens: CONTABIL_ITENS })

  // ── ESCRITÓRIO (parceiros e contadores) ──────────────────────────────────
  if (isParceiro || isContador)
    grupos.push({
      grupo: 'Escritório',
      itens: [
        { label: 'Painel',          href: '/escritorio',                     icone: '🏦' },
        { label: 'Equipe',          href: '/escritorio/equipe',               icone: '👥' },
        { label: 'Plano de Contas', href: '/escritorio/plano-de-contas',      icone: '📋' },
      ],
    })

  // ── CONTA (Configurações somente admin — Sair fica no footer) ─────────────
  if (isAdmin)
    grupos.push({
      grupo: 'Conta',
      itens: [
        { label: 'Configurações', href: '/configuracoes',      icone: '⚙️' },
        { label: 'Logs',          href: '/configuracoes/logs', icone: '📋' },
      ],
    })

  return grupos
}

const FUNCAO_LABEL: Record<string, string> = {
  admin:           'Administrador',
  financeiro:      'Financeiro',
  tecnico:         'Técnico',
  conselho_fiscal: 'Conselho Fiscal',
  captador:        'Captador',
  contador:        'Contador',
  contador_aux:    'Contador Auxiliar',
}

interface Props {
  usuario: (Usuario & { organizacao: Organizacao | null }) | null
  isParceiro?: boolean
  orgNome?: string
  isParceiroAcessandoOrg?: boolean
  modulosAcesso?: string[]
}

function labelUsuario(usuario: { role: string; funcoes: string[] } | null | undefined): string {
  if (!usuario) return ''
  if (usuario.role === 'super_admin') return 'Administrador da Plataforma'
  if (!usuario.funcoes?.length) return 'Membro'
  return FUNCAO_LABEL[usuario.funcoes[0]] || usuario.funcoes[0]
}

export default function Sidebar({ usuario, isParceiro, orgNome: orgNomeProp, isParceiroAcessandoOrg, modulosAcesso }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  const [nomeDisplay, setNomeDisplay] = useState(usuario?.nome_completo || '')

  useEffect(() => {
    if (isParceiro && !nomeDisplay) {
      supabase.auth.getUser().then(({ data: { user } }) => {
        if (user) {
          supabase.from('usuarios').select('nome_completo').eq('id', user.id).maybeSingle()
            .then(({ data }) => { if (data?.nome_completo) setNomeDisplay(data.nome_completo) })
        }
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isParceiro])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const isSuperAdmin = usuario?.role === 'super_admin'
  const org = usuario?.organizacao

  function renderItem(item: NavItem) {
    const ativo = item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <button key={item.href}
        onClick={() => !item.em_breve && router.push(item.href)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 1rem', background: ativo ? '#EEEDFE' : 'transparent',
          border: 'none', cursor: item.em_breve ? 'default' : 'pointer',
          textAlign: 'left', opacity: item.em_breve ? 0.5 : 1,
        }}
        onMouseEnter={e => { if (!ativo && !item.em_breve) (e.currentTarget as HTMLButtonElement).style.background = '#f5f5f2' }}
        onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        <span style={{ fontSize: '16px', flexShrink: 0 }}>{item.icone}</span>
        <span style={{ fontSize: item.em_breve ? '11px' : '13px', fontWeight: ativo ? '600' : '400', color: ativo ? '#4840CC' : '#444', flex: 1 }}>
          {item.label}
        </span>
        {item.em_breve && (
          <span style={{ fontSize: '9px', background: '#f0f0ec', color: '#888', padding: '2px 5px', borderRadius: '4px', fontWeight: '500' }}>
            em breve
          </span>
        )}
      </button>
    )
  }

  function renderGrupo(label: string, itens: NavItem[]) {
    const sorted = [...itens.filter(i => !i.em_breve), ...itens.filter(i => i.em_breve)]
    return (
      <div key={label} style={{ marginBottom: '0.5rem' }}>
        <div style={{
          fontSize: '10px', fontWeight: '600', color: '#aaa',
          textTransform: 'uppercase', letterSpacing: '0.8px',
          padding: '0.5rem 1rem 0.25rem',
        }}>
          {label}
        </div>
        {sorted.map(renderItem)}
      </div>
    )
  }

  function renderNav() {
    if (isSuperAdmin)
      return NAV_ADMIN.map(g => renderGrupo(g.grupo, g.itens))
    if (isParceiroAcessandoOrg) {
      const grupos = []
      if (modulosAcesso?.includes('financeiro_leitura'))
        grupos.push(renderGrupo('Financeiro', [{ label: 'Financeiro', href: '/financeiro', icone: '💰' }]))
      grupos.push(renderGrupo('Contábil', [
        ...CONTABIL_ITENS,
        { label: 'De/Para Contas', href: '/contabil/depara', icone: '🔀' },
      ]))
      return grupos
    }
    return buildNav(usuario, isParceiro).map(g => renderGrupo(g.grupo, g.itens))
  }

  // Para parceiros: topo sempre "NexCoop"; empresa fica no link abaixo
  const orgNome = isParceiro
    ? 'NexCoop'
    : isSuperAdmin
    ? 'NexCoop'
    : (org?.nome_curto || org?.nome || 'NexCoop')

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
      {/* Cabeçalho */}
      <div style={{ padding: '1.25rem 1rem', borderBottom: '1px solid #e5e3dc' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '36px', height: '36px', borderRadius: '10px',
            background: isSuperAdmin ? '#1a1a1a' : '#635BFF',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', flexShrink: 0,
          }}>
            {isSuperAdmin ? '⚡' : <svg width="20" height="20" viewBox="0 0 32 32" fill="none"><rect x="3" y="3" width="7" height="26" rx="3" fill="white"/><rect x="22" y="3" width="7" height="26" rx="3" fill="white"/><path d="M10 3L22 29" stroke="white" strokeWidth="4.5" strokeLinecap="round"/></svg>}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {!isParceiro && !isSuperAdmin ? (
                <a href="/organizacao" style={{ textDecoration: 'none', color: 'inherit' }}>{orgNome}</a>
              ) : orgNome}
            </div>
            {!isParceiro && (
              <div style={{ fontSize: '11px', color: isSuperAdmin ? '#635BFF' : '#888', marginTop: '1px', fontWeight: isSuperAdmin ? '600' : '400' }}>
                {orgTipo}
              </div>
            )}
          </div>
        </div>

        {/* Empresa parceira — link para /escritorio/perfil */}
        {isParceiro && orgNomeProp && (
          <Link href="/escritorio/empresa" style={{ display: 'block', marginTop: '10px', textDecoration: 'none' }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {orgNomeProp}
            </div>
            <div style={{ fontSize: '11px', color: '#0F766E', marginTop: '1px' }}>
              Escritório Parceiro
            </div>
          </Link>
        )}
      </div>

      {/* Navegação */}
      <nav style={{ flex: 1, padding: '0.75rem 0', overflowY: 'auto' }}>
        {renderNav()}
      </nav>

      {/* Rodapé usuário */}
      <div style={{ borderTop: '1px solid #e5e3dc', padding: '0.75rem 1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: isSuperAdmin ? '#1a1a1a' : '#EEEDFE',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '13px', fontWeight: '600',
            color: isSuperAdmin ? '#fff' : '#4840CC',
            flexShrink: 0,
          }}>
            {(isParceiro ? nomeDisplay : usuario?.nome_completo)?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            {isParceiro ? (
              <Link href="/escritorio/usuario" style={{ textDecoration: 'none' }}>
                <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {nomeDisplay || 'Usuário'}
                </div>
                <div style={{ fontSize: '11px', color: '#0F766E' }}>
                  Parceiro
                </div>
              </Link>
            ) : (
              <>
                <a href="/perfil" style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ fontSize: '12px', fontWeight: '500', color: '#1a1a1a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {usuario?.nome_completo || 'Usuário'}
                  </div>
                </a>
                <div style={{ fontSize: '11px', color: isSuperAdmin ? '#635BFF' : '#888', fontWeight: isSuperAdmin ? '500' : '400' }}>
                  {labelUsuario(usuario)}
                </div>
              </>
            )}
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
