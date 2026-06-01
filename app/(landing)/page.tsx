// app/(landing)/page.tsx
// Substitui o arquivo atual integralmente.
// Busca de clientes via Supabase Server Component (sem useEffect, sem JS no cliente).
// Requer campo `exibir_na_landing boolean default false` na tabela `organizacoes`.
// Migration: ALTER TABLE organizacoes ADD COLUMN IF NOT EXISTS exibir_na_landing boolean NOT NULL DEFAULT false;

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InviteDetector from './InviteDetector'

// ─── Tipagem ───────────────────────────────────────────────────────────────
interface OrgCliente {
  nome_curto: string | null
  nome: string
  logo_url: string | null
}

// ─── Dados estáticos ────────────────────────────────────────────────────────
const FUNCIONALIDADES = [
  {
    icon: '👥',
    title: 'Gestão de Filiados',
    desc: 'Cadastro completo com histórico, CAF/DAP, controle de admissão e desligamento.',
    live: true,
  },
  {
    icon: '💰',
    title: 'Gestão Financeira',
    desc: 'Lançamentos de receitas e despesas, contas a pagar/receber e relatórios completos.',
    live: true,
  },
  {
    icon: '🏛️',
    title: 'Assembleias',
    desc: 'Convocação digital, controle de quórum e geração automática de atas estatutárias.',
    live: true,
  },
  {
    icon: '📁',
    title: 'Documentos',
    desc: 'Repositório seguro com alertas de vencimento e acesso hierarquizado por perfil.',
    live: true,
  },
  {
    icon: '🔒',
    title: 'Segurança & LGPD',
    desc: 'Dados criptografados, controle de acesso por perfil e conformidade com a LGPD.',
    live: true,
  },
  {
    icon: '🌱',
    title: 'Produção Agro',
    desc: 'Registro de safras, visitas técnicas e relatórios de produtividade por filiado.',
    live: false,
  },
  {
    icon: '🤝',
    title: 'Comercialização',
    desc: 'Contratos coletivos, notas de entrega e integração com compradores e mercados.',
    live: false,
  },
  {
    icon: '🎯',
    title: 'Projetos',
    desc: 'Gestão de projetos financiados, metas, cronogramas e prestação de contas.',
    live: false,
  },
  {
    icon: '🌿',
    title: 'Impacto & ESG',
    desc: 'Indicadores sociais e ambientais para editais, financiadores e certificações.',
    live: false,
  },
]

const PLANOS = [
  {
    nome: 'Gratuito',
    preco: 'R$ 0',
    periodo: '/mês',
    limite: 'Até 10 filiados',
    recursos: ['Gestão de filiados', 'Financeiro básico', 'Documentos', '1 usuário gestor'],
    destaque: false,
    cta: 'Começar grátis',
    href: '/cadastro',
  },
  {
    nome: 'Essencial',
    preco: 'R$ 149',
    periodo: '/mês',
    limite: 'Até 50 filiados',
    recursos: ['Tudo do Gratuito', 'Assembleias digitais', 'Relatórios financeiros', 'Suporte prioritário', '3 usuários'],
    destaque: true,
    cta: 'Assinar agora',
    href: 'mailto:suporte@nexcoop.com.br',
  },
  {
    nome: 'Profissional',
    preco: 'R$ 499',
    periodo: '/mês',
    limite: 'Até 200 filiados',
    recursos: ['Tudo do Essencial', 'Relatórios avançados', 'API e integrações', 'Usuários ilimitados', 'Onboarding dedicado'],
    destaque: false,
    cta: 'Assinar agora',
    href: 'mailto:suporte@nexcoop.com.br',
  },
  {
    nome: 'Agro',
    preco: 'R$ 1.500',
    periodo: '/mês',
    limite: 'Filiados ilimitados',
    recursos: ['Tudo do Profissional', 'Módulo de produção', 'Módulo de projetos', 'Comercialização', 'Suporte personalizado'],
    destaque: false,
    cta: 'Assinar agora',
    href: 'mailto:suporte@nexcoop.com.br',
  },
]

const DIFERENCIAIS = [
  { titulo: 'Feita para você!', desc: 'Desenvolvida para cooperativas, associações e organizações coletivas do Brasil.' },
  { titulo: '100% em nuvem', desc: 'Acesse de qualquer lugar, em qualquer dispositivo, com segurança e sem instalações.' },
  { titulo: 'Começa gratuito', desc: 'Plano gratuito para até 10 filiados — sem cartão, sem compromisso, sem limite de tempo.' },
  { titulo: 'Suporte próximo', desc: 'Time especializado que acompanha cada etapa da implantação e uso do sistema.' },
  { titulo: 'Cresce com você', desc: 'Planos escaláveis que acompanham o crescimento da sua organização.' },
]

const DEMO_FILIADOS = [
  { nome: 'Maria Silva Santos', cpf: '•••.456.789-00', status: 'Ativo', cor: '#4ADE80' },
  { nome: 'João Pedro Oliveira', cpf: '•••.123.456-00', status: 'Ativo', cor: '#4ADE80' },
  { nome: 'Ana Carla Mendes', cpf: '•••.789.012-00', status: 'Inadimplente', cor: '#FBBF24' },
  { nome: 'Carlos Eduardo Lima', cpf: '•••.345.678-00', status: 'Ativo', cor: '#4ADE80' },
]

const DEMO_FINANCEIRO = [
  { desc: 'Taxa de associação — Maio', valor: '+R$ 4.700', status: 'Recebido', positivo: true },
  { desc: 'Aluguel da sede', valor: '-R$ 1.200', status: 'Pendente', positivo: false },
  { desc: 'Venda coletiva — cacau', valor: '+R$ 7.700', status: 'Recebido', positivo: true },
  { desc: 'Material de escritório', valor: '-R$ 380', status: 'Pago', positivo: false },
]

// ─── Page ──────────────────────────────────────────────────────────────────
export default async function LandingPage() {
  // Busca organizações que autorizaram aparecer na landing
  let clientes: OrgCliente[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('organizacoes')
      .select('nome_curto, nome, logo_url')
      .eq('exibir_na_landing', true)
      .order('criado_em')
    clientes = data ?? []
  } catch {
    // fallback: sem clientes (COOPAIBI hardcoded abaixo)
  }

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", color: '#0D2B5E', background: '#fff', minHeight: '100vh' }}>
      <InviteDetector />
      <Navbar />
      <main>
        <Hero />
        <Clientes orgs={clientes} />
        <Funcionalidades />
        <PorQueNexCoop />
        <Demo />
        <Planos />
        <CTAFinal />
      </main>
      <Rodape />
    </div>
  )
}

// ─── Navbar ────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(12px)',
      borderBottom: '1px solid #E2EAF4', height: 68,
      display: 'flex', alignItems: 'center',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <LogoMarca />
        <nav style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          {[['#funcionalidades', 'Funcionalidades'], ['#planos', 'Planos'], ['#demo', 'Demo'], ['mailto:suporte@nexcoop.com.br', 'Contato']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 14, fontWeight: 500, color: '#64748B', textDecoration: 'none' }}>{label}</a>
          ))}
        </nav>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <Link href="/login" style={{ padding: '8px 20px', border: '1.5px solid #E2EAF4', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#0D2B5E', textDecoration: 'none' }}>
            Entrar
          </Link>
          <Link href="/cadastro" style={{ padding: '9px 22px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#1565C0,#06B6D4)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Começar grátis
          </Link>
        </div>
      </div>
    </header>
  )
}

// ─── Logo ──────────────────────────────────────────────────────────────────
// ⚠️ Substituir o SVG abaixo por <img src="/logo.png" ... /> quando o PNG estiver disponível
function LogoMarca({ size = 38 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
      <svg width={size} height={size} viewBox="0 0 38 38" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1565C0" />
            <stop offset="100%" stopColor="#06B6D4" />
          </linearGradient>
        </defs>
        <rect width="38" height="38" rx="10" fill="url(#lg)" />
        <text x="7" y="27" fontFamily="Arial Black,sans-serif" fontSize="22" fontWeight="900" fill="white">N</text>
      </svg>
      <span style={{ fontFamily: "'Sora',system-ui,sans-serif", fontSize: 22, fontWeight: 800, letterSpacing: '-0.5px' }}>
        <span style={{ color: '#0D2B5E' }}>Nex</span>
        <span style={{ color: '#06B6D4' }}>Coop</span>
      </span>
    </div>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg,#0D2B5E 0%,#1565C0 60%,#06B6D4 100%)',
      display: 'flex', alignItems: 'center',
      paddingTop: 68, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '5rem 2rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        {/* Texto */}
        <div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.3)', borderRadius: 100, padding: '6px 16px', fontSize: 13, fontWeight: 500, color: '#06B6D4', marginBottom: '1.5rem' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06B6D4', display: 'inline-block' }} />
            Plataforma 100% em nuvem
          </div>
          <h1 style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: -1, marginBottom: '1.5rem', fontFamily: "'Sora',system-ui,sans-serif" }}>
            Gestão que{' '}
            <em style={{ fontStyle: 'normal', background: 'linear-gradient(90deg,#00D4B1,#0EA5E9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              fortalece
            </em>
            {' '}cooperativas e associações
          </h1>
          <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.75)', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 480 }}>
            Controle filiados, finanças, assembleias e documentos em uma plataforma simples, segura e feita para cooperativas e associações brasileiras.
          </p>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <a href="#demo" style={{ padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, color: '#0D2B5E', background: '#fff', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              ▶ Explorar demonstração
            </a>
            <a href="#funcionalidades" style={{ padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#fff', background: 'rgba(255,255,255,0.1)', border: '1.5px solid rgba(255,255,255,0.3)', textDecoration: 'none' }}>
              Conhecer o sistema
            </a>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '2.5rem', flexWrap: 'wrap' }}>
            {['Dados seguros (LGPD)', 'Suporte dedicado', 'Plano gratuito disponível'].map(item => (
              <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.65)' }}>
                ✓ {item}
              </span>
            ))}
          </div>
        </div>

        {/* Mockup */}
        <MockupDashboard />
      </div>
    </section>
  )
}

function MockupDashboard() {
  const cardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 20, padding: '1.5rem', backdropFilter: 'blur(20px)',
  }
  const statStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '0.75rem',
  }
  const bars = [30, 45, 38, 55, 48, 70, 85]
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: -18, right: 30, background: '#fff', borderRadius: 12, padding: '0.6rem 0.9rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 12, fontWeight: 600, color: '#0D2B5E', zIndex: 2 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80' }} /> 47 filiados ativos
      </div>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#fff' }}>Nex<span style={{ color: '#06B6D4' }}>Coop</span></span>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#1565C0,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>GC</div>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
          <strong style={{ color: '#fff', fontSize: 15, display: 'block', marginBottom: 2 }}>Painel de controle</strong>
          Resumo da sua cooperativa hoje
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
          {[['Filiados', '47', '+12% este mês'], ['Receitas', 'R$18k', '+8% vs anterior'], ['Documentos', '23', '2 vencem em 30d']].map(([label, val, trend]) => (
            <div key={label} style={statStyle}>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>{label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Sora',sans-serif" }}>{val}</div>
              <div style={{ fontSize: 10, color: '#4ADE80', marginTop: 2 }}>{trend}</div>
            </div>
          ))}
        </div>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '0.875rem', marginBottom: '0.75rem' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: '0.75rem' }}>Evolução de filiados — 2025</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 52 }}>
            {bars.map((h, i) => (
              <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', height: `${h}%`, background: i >= 5 ? 'linear-gradient(180deg,#06B6D4,#1565C0)' : 'rgba(6,182,212,0.4)' }} />
            ))}
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          {[['🏛️', 'Próxima assembleia', '15 Jun'], ['💰', 'A pagar', 'R$3.200']].map(([icon, label, val]) => (
            <div key={label} style={{ ...statStyle, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(6,182,212,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Sora',sans-serif" }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: -18, left: 20, background: '#fff', borderRadius: 12, padding: '0.6rem 0.9rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 12, fontWeight: 600, color: '#0D2B5E', zIndex: 2 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#06B6D4' }} /> Ata gerada automaticamente
      </div>
    </div>
  )
}

// ─── Clientes ──────────────────────────────────────────────────────────────
function Clientes({ orgs }: { orgs: OrgCliente[] }) {
  // Fallback: se não houver organizações via Supabase, mostra COOPAIBI
  const lista = orgs.length > 0 ? orgs : [{ nome_curto: 'COOPAIBI', nome: 'COOPAIBI', logo_url: null }]
  return (
    <section style={{ padding: '3rem 2rem', background: '#fff', borderBottom: '1px solid #E2EAF4' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2rem' }}>
          Organizações que confiam na NexCoop
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '3rem' }}>
          {lista.map(org => {
            const nome = org.nome_curto || org.nome
            return (
              <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.6, filter: 'grayscale(1)', transition: 'all .3s' }}>
                {org.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={org.logo_url} alt={nome} style={{ width: 36, height: 36, borderRadius: 8, objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: 'linear-gradient(135deg,#1565C0,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🌱</div>
                )}
                <span style={{ fontFamily: "'Sora',system-ui,sans-serif", fontSize: 18, fontWeight: 700, color: '#0D2B5E' }}>{nome}</span>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ─── Funcionalidades ───────────────────────────────────────────────────────
function Funcionalidades() {
  return (
    <section id="funcionalidades" style={{ padding: '6rem 2rem', background: '#F4F8FF' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <RotuloSecao>Funcionalidades</RotuloSecao>
        <h2 style={estiloTituloSecao}>
          Tudo que sua organização precisa em{' '}
          <em style={estiloDestaque}>um só lugar</em>
        </h2>
        <p style={estiloDescSecao}>Plataforma integrada que conecta pessoas, processos e dados para uma gestão mais eficiente, transparente e estratégica.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem' }}>
          {FUNCIONALIDADES.map(f => (
            <div key={f.title} style={{ background: '#fff', borderRadius: 16, padding: '2rem', border: '1px solid #E2EAF4', opacity: f.live ? 1 : 0.65, position: 'relative', overflow: 'hidden' }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,rgba(21,101,192,0.1),rgba(6,182,212,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, marginBottom: '1.25rem' }}>
                {f.icon}
              </div>
              <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 100, marginBottom: '0.75rem', background: f.live ? '#E1F5EE' : '#E6F1FB', color: f.live ? '#085041' : '#0C447C' }}>
                {f.live ? 'Disponível' : 'Em breve'}
              </span>
              <h3 style={{ fontSize: 17, fontWeight: 700, color: '#0D2B5E', marginBottom: '0.6rem' }}>{f.title}</h3>
              <p style={{ fontSize: 14, color: '#64748B', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Por que NexCoop ───────────────────────────────────────────────────────
function PorQueNexCoop() {
  return (
    <section style={{ padding: '6rem 2rem', background: 'linear-gradient(135deg,#0D2B5E 0%,#1565C0 60%,#06B6D4 100%)', position: 'relative', overflow: 'hidden' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center', position: 'relative', zIndex: 1 }}>
        {/* Depoimento */}
        <div style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '2.5rem', backdropFilter: 'blur(10px)' }}>
          <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 72, color: '#06B6D4', lineHeight: 0.8, marginBottom: '0.5rem', opacity: 0.6 }}>"</div>
          <p style={{ fontSize: 18, fontWeight: 500, color: '#fff', lineHeight: 1.7, fontFamily: "'Sora',sans-serif", marginBottom: '1.5rem' }}>
            &ldquo;A NexCoop trouxe organização e clareza para a gestão da nossa cooperativa. Hoje temos controle real dos filiados, das finanças e das assembleias — tudo em um lugar só.&rdquo;
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1565C0,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: '#fff', fontFamily: "'Sora',sans-serif", flexShrink: 0 }}>CA</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Gestão COOPAIBI</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Cooperativa Mista Agropecuária de Ibirataia</div>
            </div>
          </div>
        </div>
        {/* Diferenciais */}
        <div>
          <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: '2rem', fontWeight: 800, color: '#fff', marginBottom: '2rem', lineHeight: 1.2 }}>
            Por que escolher a{' '}
            <em style={{ fontStyle: 'normal', background: 'linear-gradient(90deg,#00D4B1,#0EA5E9)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>NexCoop?</em>
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {DIFERENCIAIS.map(d => (
              <div key={d.titulo} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(6,182,212,0.2)', border: '1.5px solid rgba(6,182,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                  <span style={{ color: '#06B6D4', fontSize: 13, fontWeight: 700 }}>✓</span>
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{d.titulo}</div>
                  <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{d.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Demo interativa ───────────────────────────────────────────────────────
// 'use client' não pode ser misturado no Server Component, então a lógica
// de tabs é feita com CSS :target — sem JS, sem hidratação extra.
function Demo() {
  return (
    <section id="demo" style={{ padding: '6rem 2rem', background: '#0D2B5E' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <RotuloSecao cor="#06B6D4">Experimente agora</RotuloSecao>
        <h2 style={{ ...estiloTituloSecao, color: '#fff', marginBottom: '0.75rem' }}>
          Veja o sistema <em style={estiloDestaque}>em ação</em>
        </h2>
        <p style={{ ...estiloDescSecao, color: 'rgba(255,255,255,0.6)', marginBottom: '3rem' }}>
          Explore o painel com dados de demonstração — sem criar conta, sem compromisso.
        </p>

        {/* Tabs via CSS :target */}
        <style>{`
          .demo-panel { display: none; }
          .demo-panel:target,
          .demo-panel#tab-dashboard:not(:target-within) { display: block; }
          #tab-dashboard { display: block; }
          .demo-panel:target ~ #tab-dashboard { display: none; }
          .dtab { background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:8px 18px;font-size:13px;font-weight:600;color:rgba(255,255,255,.6);cursor:pointer;text-decoration:none;font-family:inherit;transition:all .2s; }
          .dtab:hover { background:rgba(255,255,255,.12);color:#fff; }
        `}</style>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <a href="#tab-dashboard" className="dtab">📊 Dashboard</a>
          <a href="#tab-filiados" className="dtab">👥 Filiados</a>
          <a href="#tab-financeiro" className="dtab">💰 Financeiro</a>
          <a href="#tab-assembleia" className="dtab">🏛️ Assembleia</a>
        </div>

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '1.5rem', backdropFilter: 'blur(10px)' }}>
          {/* Dashboard */}
          <div id="tab-dashboard" className="demo-panel">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '0.75rem', marginBottom: '1.25rem' }}>
              {[['47', 'Filiados ativos', '#fff'], ['R$18k', 'Receitas do mês', '#4ADE80'], ['3', 'Docs vencendo', '#FBBF24'], ['15 Jun', 'Próx. assembleia', '#06B6D4']].map(([val, label, cor]) => (
                <div key={label} style={{ background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '0.875rem', textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: cor }}>{val}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 3 }}>{label}</div>
                </div>
              ))}
            </div>
            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: '1rem' }}>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: '0.75rem' }}>Evolução de filiados — 2025</div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 60 }}>
                {[40, 52, 45, 62, 55, 78, 100].map((h, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', height: `${h}%`, background: i >= 5 ? 'linear-gradient(180deg,#06B6D4,#1565C0)' : `rgba(6,182,212,${0.3 + i * 0.05})` }} />
                ))}
              </div>
            </div>
          </div>

          {/* Filiados */}
          <div id="tab-filiados" className="demo-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>47 filiados cadastrados</span>
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>Dados de demonstração</span>
            </div>
            {DEMO_FILIADOS.map(f => (
              <div key={f.nome} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '0.5rem', background: 'rgba(255,255,255,0.04)', fontSize: 13 }}>
                <span style={{ color: '#fff', fontWeight: 500 }}>{f.nome}</span>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{f.cpf}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: `${f.cor}22`, color: f.cor }}>{f.status}</span>
              </div>
            ))}
            <div style={{ textAlign: 'center', padding: '0.75rem', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>+ 43 filiados na lista completa</div>
          </div>

          {/* Financeiro */}
          <div id="tab-financeiro" className="demo-panel">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <div style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>A receber</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#4ADE80' }}>R$ 12.400</div>
              </div>
              <div style={{ background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)', borderRadius: 10, padding: '1rem' }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginBottom: 4 }}>A pagar</div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 22, fontWeight: 800, color: '#F87171' }}>R$ 3.200</div>
              </div>
            </div>
            {DEMO_FINANCEIRO.map(f => (
              <div key={f.desc} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '0.5rem', background: 'rgba(255,255,255,0.04)', fontSize: 13 }}>
                <span style={{ color: '#fff' }}>{f.desc}</span>
                <span style={{ fontWeight: 600, color: f.positivo ? '#4ADE80' : '#F87171' }}>{f.valor}</span>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: f.positivo ? 'rgba(74,222,128,0.15)' : 'rgba(251,191,36,0.15)', color: f.positivo ? '#4ADE80' : '#FBBF24' }}>{f.status}</span>
              </div>
            ))}
          </div>

          {/* Assembleia */}
          <div id="tab-assembleia" className="demo-panel">
            <div style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.2)', borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Assembleia Geral Ordinária</div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 3 }}>15 de Junho de 2026 · 14h · Sede da cooperativa</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 100, background: 'rgba(251,191,36,0.15)', color: '#FBBF24' }}>Agendada</span>
              </div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Quórum mínimo: 24 filiados (50%) · Convocação enviada: ✓</div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>Pauta</div>
            {[['1. Aprovação do balanço 2025', 'Deliberação'], ['2. Eleição da diretoria', 'Votação'], ['3. Planejamento 2026', 'Informativo']].map(([item, tipo]) => (
              <div key={item} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 10, marginBottom: '0.5rem', background: 'rgba(255,255,255,0.04)', fontSize: 13 }}>
                <span style={{ color: '#fff' }}>{item}</span>
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{tipo}</span>
              </div>
            ))}
            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: 12, color: 'rgba(255,255,255,0.3)' }}>Ata gerada automaticamente após o encerramento</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <Link href="/cadastro" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '13px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, color: '#0D2B5E', background: '#fff', textDecoration: 'none' }}>
            🚀 Criar minha conta grátis
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Planos ────────────────────────────────────────────────────────────────
function Planos() {
  return (
    <section id="planos" style={{ padding: '6rem 2rem', background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <RotuloSecao>Planos e preços</RotuloSecao>
        <h2 style={estiloTituloSecao}>
          Simples, transparente, <em style={estiloDestaque}>sem surpresas</em>
        </h2>
        <p style={estiloDescSecao}>Escolha o plano ideal para o tamanho e necessidades da sua organização.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem', marginTop: '3.5rem' }}>
          {PLANOS.map(p => (
            <div key={p.nome} style={{ borderRadius: 16, padding: '2rem 1.5rem', border: p.destaque ? '2px solid #06B6D4' : '1px solid #E2EAF4', background: p.destaque ? 'linear-gradient(180deg,rgba(6,182,212,0.04) 0%,#fff 100%)' : '#fff', position: 'relative', display: 'flex', flexDirection: 'column' }}>
              {p.destaque && (
                <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(135deg,#1565C0,#06B6D4)', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 14px', borderRadius: 100, whiteSpace: 'nowrap', fontFamily: "'Sora',sans-serif" }}>
                  Mais popular
                </div>
              )}
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 16, fontWeight: 700, color: '#0D2B5E', marginBottom: '0.5rem' }}>{p.nome}</div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: '2rem', fontWeight: 800, color: '#0D2B5E', lineHeight: 1, marginBottom: '0.25rem' }}>
                {p.preco}<span style={{ fontSize: 13, fontWeight: 400, color: '#64748B' }}>{p.periodo}</span>
              </div>
              <div style={{ fontSize: 12, color: '#64748B', marginBottom: '1.25rem', paddingBottom: '1.25rem', borderBottom: '1px solid #E2EAF4' }}>{p.limite}</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                {p.recursos.map(r => (
                  <li key={r} style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ color: '#06B6D4', fontWeight: 700 }}>✓</span> {r}
                  </li>
                ))}
              </ul>
              <a href={p.href} style={{ display: 'block', textAlign: 'center', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: 'none', background: p.destaque ? 'linear-gradient(135deg,#1565C0,#06B6D4)' : 'none', color: p.destaque ? '#fff' : '#0D2B5E', outline: p.destaque ? 'none' : '1.5px solid #E2EAF4', cursor: 'pointer' }}>
                {p.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Enterprise */}
        <div style={{ marginTop: '1.25rem', border: '1px solid #E2EAF4', borderRadius: 16, padding: '2rem 2.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#1565C0,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🏢</div>
            <div>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#0D2B5E' }}>Enterprise</div>
              <div style={{ fontSize: 14, color: '#64748B', marginTop: 3, maxWidth: 480 }}>Para grandes redes cooperativistas, federações e centrais. Infraestrutura dedicada, SLA garantido, múltiplas organizações e integrações customizadas.</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: '#0D2B5E' }}>Sob consulta</div>
              <div style={{ fontSize: 12, color: '#94A3B8' }}>Proposta personalizada</div>
            </div>
            <a href="mailto:suporte@nexcoop.com.br" style={{ padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#1565C0,#06B6D4)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
              Falar com consultor →
            </a>
          </div>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#94A3B8', marginTop: '1.5rem' }}>
          Cooperativa com isenção fiscal?{' '}
          <a href="mailto:suporte@nexcoop.com.br" style={{ color: '#1565C0', textDecoration: 'none', fontWeight: 500 }}>Consulte condições especiais →</a>
        </p>
      </div>
    </section>
  )
}

// ─── CTA Final ─────────────────────────────────────────────────────────────
function CTAFinal() {
  return (
    <section style={{ padding: '5rem 2rem', background: '#F4F8FF', borderTop: '1px solid #E2EAF4' }}>
      <div style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: 'linear-gradient(135deg,#1565C0,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 1.5rem' }}>🚀</div>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(1.6rem,3vw,2.5rem)', fontWeight: 800, color: '#0D2B5E', lineHeight: 1.2, letterSpacing: -0.5, marginBottom: '1rem' }}>
          Pronto para transformar a gestão da sua cooperativa ou associação?
        </h2>
        <p style={{ fontSize: 16, color: '#64748B', marginBottom: '2rem', lineHeight: 1.6 }}>
          Explore o sistema gratuitamente e descubra como a NexCoop pode organizar, digitalizar e fortalecer sua cooperativa ou associação.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <a href="#demo" style={{ padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700, color: '#fff', background: 'linear-gradient(135deg,#1565C0,#06B6D4)', textDecoration: 'none' }}>
            ▶ Explorar demonstração
          </a>
          <Link href="/cadastro" style={{ padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600, color: '#0D2B5E', background: 'none', border: '1.5px solid #E2EAF4', textDecoration: 'none' }}>
            Criar conta grátis
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Rodapé ────────────────────────────────────────────────────────────────
function Rodape() {
  return (
    <footer style={{ background: '#0D2B5E', padding: '4rem 2rem 2rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '3rem' }}>
          <div>
            <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, marginBottom: '0.75rem' }}>
              <span style={{ color: '#fff' }}>Nex</span><span style={{ color: '#06B6D4' }}>Coop</span>
            </div>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', lineHeight: 1.6, maxWidth: 260 }}>
              Gestão tecnológica para cooperativas e associações que buscam crescer com eficiência, inovação e sustentabilidade.
            </p>
          </div>
          {[
            { titulo: 'Produto', links: [['#funcionalidades', 'Funcionalidades'], ['#planos', 'Planos e preços'], ['#', 'Novidades'], ['#', 'Roadmap']] },
            { titulo: 'Empresa', links: [['#', 'Sobre nós'], ['#', 'Blog'], ['#', 'Política de Privacidade'], ['#', 'Termos de Uso']] },
            { titulo: 'Contato', links: [['mailto:suporte@nexcoop.com.br', '📧 suporte@nexcoop.com.br'], ['#', '🇧🇷 Brasil']] },
          ].map(col => (
            <div key={col.titulo}>
              <h4 style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col.titulo}</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {col.links.map(([href, label]) => (
                  <li key={label}><a href={href} style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)', textDecoration: 'none' }}>{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)' }}>© 2026 NexCoop. Todos os direitos reservados.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {[['#', 'Privacidade'], ['#', 'Termos'], ['#', 'LGPD']].map(([href, label]) => (
              <a key={label} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.3)', textDecoration: 'none' }}>{label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Helpers de estilo ─────────────────────────────────────────────────────
function RotuloSecao({ children, cor = '#06B6D4' }: { children: React.ReactNode; cor?: string }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: cor, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center', marginBottom: '0.75rem' }}>
      {children}
    </div>
  )
}

const estiloTituloSecao: React.CSSProperties = {
  fontFamily: "'Sora',system-ui,sans-serif",
  fontSize: 'clamp(1.6rem,3vw,2.5rem)',
  fontWeight: 800,
  color: '#0D2B5E',
  textAlign: 'center',
  lineHeight: 1.2,
  letterSpacing: -0.5,
  marginBottom: '1rem',
}

const estiloDescSecao: React.CSSProperties = {
  textAlign: 'center',
  color: '#64748B',
  fontSize: 16,
  lineHeight: 1.7,
  maxWidth: 580,
  margin: '0 auto 3.5rem',
}

const estiloDestaque: React.CSSProperties = {
  fontStyle: 'normal',
  background: 'linear-gradient(135deg,#1565C0,#06B6D4)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text',
}
