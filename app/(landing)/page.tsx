import Link from 'next/link'

const GREEN = '#1D9E75'
const GREEN_DARK = '#0F6E56'
const BG = '#f8f7f4'
const TEXT = '#1a1a1a'
const FONT = "system-ui, -apple-system, 'Segoe UI', sans-serif"

export default function LandingPage() {
  return (
    <div style={{ fontFamily: FONT, color: TEXT, background: BG, minHeight: '100vh' }}>
      <Header />
      <main>
        <Hero />
        <Features />
        <ForWho />
        <Pricing />
        <FinalCTA />
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: 'rgba(248,247,244,0.95)', backdropFilter: 'blur(8px)',
      borderBottom: '1px solid #e8e6e1', padding: '0 24px', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      <Logo />
      <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <NavLink href="#funcionalidades">Funcionalidades</NavLink>
        <NavLink href="#planos">Planos</NavLink>
        <NavLink href="#contato">Contato</NavLink>
      </nav>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Link href="/login" style={{ padding: '8px 16px', borderRadius: 8, border: `1.5px solid ${GREEN}`, color: GREEN, fontWeight: 500, fontSize: 14, textDecoration: 'none' }}>
          Entrar
        </Link>
        <Link href="/login" style={{ padding: '8px 18px', borderRadius: 8, background: GREEN, color: '#fff', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
          Começar grátis
        </Link>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 22 }}>🌱</span>
      <span style={{ fontWeight: 700, fontSize: 18, color: GREEN_DARK, letterSpacing: '-0.3px' }}>NextCoop</span>
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: TEXT, textDecoration: 'none', fontSize: 14, fontWeight: 500, opacity: 0.75 }}>
      {children}
    </a>
  )
}

function Hero() {
  return (
    <section style={{ paddingTop: 140, paddingBottom: 100, paddingLeft: 24, paddingRight: 24, textAlign: 'center', maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center', background: '#e6f5f0', color: GREEN_DARK, fontSize: 12, fontWeight: 600, letterSpacing: '0.5px', padding: '5px 14px', borderRadius: 20, marginBottom: 32, textTransform: 'uppercase' }}>
        Multi-tenant · Dados isolados · 100% na nuvem
      </div>
      <h1 style={{ fontSize: 52, fontWeight: 800, lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 20, color: TEXT }}>
        Gestão completa para{' '}
        <span style={{ color: GREEN }}>cooperativas e associações</span>
      </h1>
      <p style={{ fontSize: 19, lineHeight: 1.65, color: '#555', maxWidth: 640, margin: '0 auto 40px' }}>
        Controle filiados, mensalidades, assembleias e documentos em uma plataforma simples, segura e feita para o cooperativismo brasileiro.
      </p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/login" style={{ padding: '14px 28px', borderRadius: 10, background: GREEN, color: '#fff', fontWeight: 700, fontSize: 16, textDecoration: 'none', boxShadow: '0 4px 16px rgba(29,158,117,0.3)' }}>
          Começar agora — é grátis
        </Link>
        <a href="#funcionalidades" style={{ padding: '14px 28px', borderRadius: 10, border: '1.5px solid #ccc', color: TEXT, fontWeight: 600, fontSize: 16, textDecoration: 'none' }}>
          Ver demonstração
        </a>
      </div>
    </section>
  )
}

const FEATURES = [
  { icon: '👥', title: 'Gestão de Filiados', desc: 'Cadastro completo com status, histórico e quota-parte de cada filiado.' },
  { icon: '💳', title: 'Mensalidades', desc: 'Geração automática de cobranças e controle de inadimplência em tempo real.' },
  { icon: '🏛️', title: 'Assembleias', desc: 'Convocações, registro de atas digitais e controle de presença.' },
  { icon: '📁', title: 'Documentos', desc: 'Repositório centralizado com alertas automáticos de vencimento.' },
  { icon: '💰', title: 'Financeiro', desc: 'Lançamentos, categorias e visão de fluxo de caixa da cooperativa.' },
  { icon: '🌱', title: 'Projetos Agro', desc: 'Captação de recursos e gestão de projetos do agronegócio. Em breve.', soon: true },
]

function Features() {
  return (
    <section id="funcionalidades" style={{ background: '#fff', padding: '96px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionLabel>Funcionalidades</SectionLabel>
        <h2 style={sectionHeading}>Tudo que sua cooperativa precisa em um só lugar</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, marginTop: 56 }}>
          {FEATURES.map(f => <FeatureCard key={f.title} {...f} />)}
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon, title, desc, soon }: { icon: string; title: string; desc: string; soon?: boolean }) {
  return (
    <div style={{ border: '1px solid #e8e6e1', borderRadius: 14, padding: '28px 24px', background: BG, position: 'relative' }}>
      {soon && (
        <span style={{ position: 'absolute', top: 16, right: 16, fontSize: 11, fontWeight: 700, background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 20, letterSpacing: '0.4px', textTransform: 'uppercase' }}>
          Em breve
        </span>
      )}
      <div style={{ fontSize: 30, marginBottom: 14 }}>{icon}</div>
      <h3 style={{ fontWeight: 700, fontSize: 17, marginBottom: 8, color: TEXT }}>{title}</h3>
      <p style={{ fontSize: 14, lineHeight: 1.6, color: '#666' }}>{desc}</p>
    </div>
  )
}

const AUDIENCES = [
  { icon: '🌾', title: 'Cooperativas agropecuárias', desc: 'Gestão de filiados, cotas e projetos com rastreabilidade completa para cooperativas de produção rural.' },
  { icon: '🤝', title: 'Associações rurais', desc: 'Controle de mensalidades, atas e documentos legais para associações de produtores e trabalhadores rurais.' },
  { icon: '🏢', title: 'Centrais de cooperativas', desc: 'Estrutura multi-tenant que permite gerir múltiplas cooperativas afiliadas com dados completamente isolados.' },
]

function ForWho() {
  return (
    <section style={{ padding: '96px 24px', background: BG }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <SectionLabel>Para quem é</SectionLabel>
        <h2 style={sectionHeading}>Feito para o cooperativismo brasileiro</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 24, marginTop: 56 }}>
          {AUDIENCES.map(a => (
            <div key={a.title} style={{ background: '#fff', border: '1px solid #e8e6e1', borderRadius: 14, padding: '32px 28px', borderTop: `4px solid ${GREEN}` }}>
              <div style={{ fontSize: 32, marginBottom: 16 }}>{a.icon}</div>
              <h3 style={{ fontWeight: 700, fontSize: 18, marginBottom: 10, color: TEXT }}>{a.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: '#666' }}>{a.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const PLANS = [
  {
    name: 'Gratuito',
    price: 'R$ 0',
    period: '/mês',
    limit: 'Até 10 filiados',
    features: ['Gestão de filiados', 'Mensalidades', 'Documentos', 'Assembleias'],
    highlight: false,
  },
  {
    name: 'Essencial',
    price: 'R$ 149',
    period: '/mês',
    limit: 'Até 50 filiados',
    features: ['Gestão de filiados', 'Mensalidades', 'Documentos', 'Suporte por e-mail'],
    highlight: false,
  },
  {
    name: 'Profissional',
    price: 'R$ 499',
    period: '/mês',
    limit: 'Até 200 filiados',
    features: ['Tudo do Essencial', 'Assembleias', 'Módulo financeiro', 'Suporte prioritário'],
    highlight: true,
  },
  {
    name: 'Agro',
    price: 'R$ 1.500',
    period: '/mês',
    limit: 'Filiados ilimitados',
    features: ['Tudo do Profissional', 'Projetos Agro', 'API de integração', 'Gerente de conta'],
    highlight: false,
  },
  {
    name: 'Enterprise',
    price: 'Consulta',
    period: '',
    limit: 'Personalizado',
    features: ['Infraestrutura dedicada', 'SLA garantido', 'Integrações customizadas', 'Suporte 24/7'],
    highlight: false,
  },
]

function Pricing() {
  return (
    <section id="planos" style={{ background: '#fff', padding: '96px 24px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <SectionLabel>Planos</SectionLabel>
        <h2 style={sectionHeading}>Preços transparentes, sem surpresas</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginTop: 56 }}>
          {PLANS.map(p => <PlanCard key={p.name} {...p} />)}
        </div>
      </div>
    </section>
  )
}

function PlanCard({ name, price, period, limit, features, highlight }: (typeof PLANS)[0]) {
  return (
    <div style={{ border: highlight ? `2px solid ${GREEN}` : '1px solid #e8e6e1', borderRadius: 16, padding: '32px 24px', background: highlight ? '#f0faf6' : BG, display: 'flex', flexDirection: 'column', position: 'relative' }}>
      {highlight && (
        <span style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', background: GREEN, color: '#fff', fontSize: 11, fontWeight: 700, padding: '3px 12px', borderRadius: 20, letterSpacing: '0.5px', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>
          Mais popular
        </span>
      )}
      <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8, color: TEXT }}>{name}</div>
      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 30, fontWeight: 800, color: TEXT }}>{price}</span>
        <span style={{ fontSize: 14, color: '#888', fontWeight: 500 }}>{period}</span>
      </div>
      <div style={{ fontSize: 13, color: GREEN_DARK, fontWeight: 600, marginBottom: 20 }}>{limit}</div>
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', flex: 1 }}>
        {features.map(f => (
          <li key={f} style={{ fontSize: 13, color: '#555', padding: '5px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: GREEN, fontWeight: 700 }}>✓</span> {f}
          </li>
        ))}
      </ul>
      <Link href="/login" style={{ display: 'block', textAlign: 'center', padding: '11px 0', borderRadius: 8, background: highlight ? GREEN : 'transparent', border: highlight ? 'none' : `1.5px solid ${GREEN}`, color: highlight ? '#fff' : GREEN, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
        {name === 'Gratuito' ? 'Começar grátis' : name === 'Enterprise' ? 'Falar com vendas' : 'Assinar'}
      </Link>
    </div>
  )
}

function FinalCTA() {
  return (
    <section style={{ background: GREEN_DARK, padding: '96px 24px', textAlign: 'center' }}>
      <h2 style={{ fontSize: 38, fontWeight: 800, color: '#fff', marginBottom: 16, letterSpacing: '-0.8px' }}>
        Pronto para modernizar sua gestão?
      </h2>
      <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, marginBottom: 36 }}>
        Comece gratuitamente e leve sua cooperativa para o próximo nível.
      </p>
      <Link href="/login" style={{ display: 'inline-block', padding: '16px 36px', borderRadius: 10, background: '#fff', color: GREEN_DARK, fontWeight: 700, fontSize: 17, textDecoration: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' }}>
        Criar conta gratuita
      </Link>
    </section>
  )
}

function Footer() {
  return (
    <footer id="contato" style={{ background: '#111', color: 'rgba(255,255,255,0.6)', padding: '48px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
            <span style={{ fontSize: 20 }}>🌱</span>
            <span style={{ fontWeight: 700, color: '#fff', fontSize: 16 }}>NextCoop</span>
          </div>
          <p style={{ fontSize: 13, lineHeight: 1.6, maxWidth: 220 }}>Gestão cooperativa para o Brasil</p>
        </div>
        <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <FooterLink href="#">Política de Privacidade</FooterLink>
          <FooterLink href="#">Termos de Uso</FooterLink>
          <FooterLink href="#">Contato</FooterLink>
        </div>
        <p style={{ fontSize: 12, alignSelf: 'flex-end' }}>© 2026 NextCoop. Todos os direitos reservados.</p>
      </div>
    </footer>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, textDecoration: 'none' }}>{children}</a>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 700, color: GREEN, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 12, textAlign: 'center' }}>
      {children}
    </div>
  )
}

const sectionHeading: React.CSSProperties = {
  fontSize: 36, fontWeight: 800, textAlign: 'center', letterSpacing: '-0.8px', color: TEXT, maxWidth: 560, margin: '0 auto',
}