import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import InviteDetector from './InviteDetector'
import NavbarMobile from './NavbarMobile'
import DemoInterativa from './DemoInterativa'

interface OrgCliente {
  nome_curto: string | null
  nome: string
  logo_url: string | null
}

const FUNCIONALIDADES = [
  { icon: '🎯', title: 'Captação + Radar IA', desc: 'Pipeline Kanban com varredura automática de editais por perfil da organização. Identifique oportunidades antes da concorrência.', live: true, novo: true, cor: '#1D9E75' },
  { icon: '👥', title: 'Gestão de Filiados', desc: 'Cadastro completo com histórico, CAF/DAP, cotas, matrículas e controle de admissão e desligamento.', live: true, novo: false, cor: null },
  { icon: '💰', title: 'Gestão Financeira', desc: 'Lançamentos de receitas e despesas, contas a pagar/receber e relatórios completos.', live: true, novo: false, cor: null },
  { icon: '🏛️', title: 'Assembleias', desc: 'Convocação digital, controle de quórum e geração automática de atas estatutárias.', live: true, novo: false, cor: null },
  { icon: '📅', title: 'Mensalidades / Cotas', desc: 'Controle de contribuições, inadimplência, isenções, cota plena e colaboradora.', live: true, novo: false, cor: null },
  { icon: '📁', title: 'Documentos', desc: 'Repositório seguro com alertas de vencimento e acesso hierarquizado por perfil.', live: true, novo: false, cor: null },
  { icon: '🤝', title: 'Comercialização', desc: 'Compra de cacau, estoque físico e virtual, Caixa, NF-e de entrada e Diário de Caixa.', live: true, novo: false, cor: null },
  { icon: '🛒', title: 'Loja Agropecuária', desc: 'PDV com estoque FIFO, NF-e integrada e conta-corrente do cooperado.', live: true, novo: false, cor: null },
  { icon: '📊', title: 'Distribuição de Sobras', desc: 'Rateio configurável por operação, assembleia de aprovação e crédito automático por cooperado.', live: false, novo: false, cor: null },
  { icon: '📱', title: 'Portal do Filiado', desc: 'Área mobile: perfil, documentos, extratos, assembleias e notificações.', live: false, novo: false, cor: null },
  { icon: '🌿', title: 'Projetos e ESG', desc: 'Indicadores sociais e ambientais para editais, financiadores e certificações.', live: false, novo: false, cor: null },
  { icon: '🏦', title: 'Tesouraria', desc: 'Importação OFX/XML, reconciliação e controle de capital externo e investidores.', live: false, novo: false, cor: null },
]

const PLANOS = [
  { nome: 'Gratuito', preco: 'R$ 0', periodo: '/mês', limite: 'Até 10 filiados', recursos: ['Gestão de filiados', 'Financeiro básico', 'Documentos', '1 usuário gestor'], destaque: false, cta: 'Começar grátis', href: '/cadastro' },
  { nome: 'Essencial', preco: 'R$ 149', periodo: '/mês', limite: 'Até 50 filiados', recursos: ['Tudo do Gratuito', 'Assembleias digitais', 'Módulo Contábil', 'Suporte prioritário', '3 usuários'], destaque: true, cta: 'Assinar agora', href: 'mailto:suporte@nexcoop.com.br' },
  { nome: 'Profissional', preco: 'R$ 499', periodo: '/mês', limite: 'Até 200 filiados', recursos: ['Tudo do Essencial', 'Loja Agropecuária', 'Comercialização', 'Usuários ilimitados', 'Onboarding dedicado'], destaque: false, cta: 'Assinar agora', href: 'mailto:suporte@nexcoop.com.br' },
  { nome: 'Agro', preco: 'R$ 1.500', periodo: '/mês', limite: 'Filiados ilimitados', recursos: ['Tudo do Profissional', 'Captação + Radar IA', 'Portal do Filiado', 'Suporte personalizado'], destaque: false, cta: 'Falar com equipe', href: 'https://wa.me/55SEUNUMERO' },
]

const DIFERENCIAIS = [
  { titulo: 'Feita para você', desc: 'Desenvolvida para cooperativas, associações e organizações coletivas do Brasil.' },
  { titulo: '100% em nuvem', desc: 'Acesse de qualquer lugar, em qualquer dispositivo, com segurança e sem instalações.' },
  { titulo: 'Começa gratuito', desc: 'Plano gratuito para até 10 filiados — sem cartão, sem compromisso, sem limite de tempo.' },
  { titulo: 'Suporte próximo', desc: 'Time especializado que acompanha cada etapa da implantação e uso do sistema.' },
  { titulo: 'Cresce com você', desc: 'Planos escaláveis que acompanham o crescimento da sua organização.' },
  { titulo: 'Conformidade legal', desc: 'Atas, assembleias, contabilidade e documentos alinhados à legislação cooperativista brasileira.' },
]

const DORES = [
  { icon: '⚠️', cor: '#FAECE7', corIcon: '#D85A30', titulo: 'Assembleia virou bagunça', desc: 'Dificuldade de controlar quórum, registrar votações e gerar ata legal dentro do prazo.', resolve: 'Convocação digital + quórum automático + ata gerada pelo sistema' },
  { icon: '📄', cor: '#EEEDFE', corIcon: '#534AB7', titulo: 'Contador pede dados que não tenho', desc: 'Horas perdidas enviando planilhas e extratos por e-mail para o escritório contábil.', resolve: 'Portal do contador com acesso direto + exportação SPED automática' },
  { icon: '👥', cor: '#E1F5EE', corIcon: '#0F6E56', titulo: 'Não sei quem está inadimplente', desc: 'Controle de cotas e mensalidades espalhado em planilhas desatualizadas.', resolve: 'Painel de inadimplência com alertas automáticos por filiado' },
  { icon: '📊', cor: '#E6F1FB', corIcon: '#185FA5', titulo: 'Distribuição de sobras é um caos', desc: 'Calcular o rateio por cooperado no final do exercício leva dias e gera conflitos.', resolve: 'Módulo de Sobras com fórmula configurável por tipo de operação' },
  { icon: '⏰', cor: '#FAEEDA', corIcon: '#BA7517', titulo: 'Documentos vencendo sem aviso', desc: 'Alvarás, certidões e contratos com prazos perdidos em pastas e papéis.', resolve: 'Repositório com alertas de vencimento 30 dias antes' },
  { icon: '💵', cor: '#E1F5EE', corIcon: '#0F6E56', titulo: 'Captação de recursos travada', desc: 'Editais passam despercebidos por falta de tempo ou ferramenta de monitoramento.', resolve: 'Radar IA + pipeline Kanban de oportunidades de financiamento' },
]

const WPP_URL = 'https://wa.me/5573999818190'

// ─── CSS Responsivo Global ─────────────────────────────────────────────────
function EstilosGlobais() {
  return (
    <style>{`
      * { box-sizing: border-box; }
      html, body { overflow-x: hidden; max-width: 100vw; }

      .nav-links { display: flex; gap: 2rem; align-items: center; }
      .nav-ctas  { display: flex; gap: 0.75rem; align-items: center; }
      .nav-hamburger { display: none; cursor: pointer; background: none; border: none; padding: 6px; }
      .nav-mobile-wrapper { position: relative; }
      .nav-mobile-menu { display: flex; flex-direction: column; position: fixed; top: 68px; left: 0; right: 0; background: rgba(255,255,255,0.98); backdrop-filter: blur(12px); border-bottom: 1px solid #E2EAF4; padding: 1rem 1.5rem; gap: 0.25rem; z-index: 200; }

      .hero-grid       { display: grid; grid-template-columns: 1fr 1fr; gap: 4rem; align-items: center; }
      .func-grid       { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
      .porque-grid     { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; }
      .planos-grid     { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1.25rem; margin-top: 3.5rem; }
      .telas-grid      { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; }
      .dores-grid      { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.25rem; }
      .footer-grid     { display: grid; grid-template-columns: 2fr 1fr 1fr 1fr; gap: 3rem; margin-bottom: 3rem; }
      .enterprise-row  { display: flex; align-items: center; justify-content: space-between; gap: 2rem; flex-wrap: wrap; }
      .hero-badges     { display: flex; gap: 1.5rem; margin-top: 2.5rem; flex-wrap: wrap; }
      .hero-ctas       { display: flex; gap: 1rem; flex-wrap: wrap; }
      .contabil-pills  { display: grid; grid-template-columns: repeat(3,1fr); gap: 8px; }
      .mockup-stats    { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0.75rem; margin-bottom: 1.25rem; }
      .mockup-bottom   { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }

      .demo-panel { display: none; }
      .demo-panel.ativo { display: block; }
      .dtab { background:rgba(255,255,255,.06); border:1px solid rgba(255,255,255,.12); border-radius:8px; padding:8px 18px; font-size:13px; font-weight:600; color:rgba(255,255,255,.6); cursor:pointer; text-decoration:none; font-family:inherit; transition:all .2s; }
      .dtab:hover { background:rgba(255,255,255,.12); color:#fff; }
      .dtab.ativo { background:rgba(255,255,255,.14); color:#fff; border-color:rgba(255,255,255,.25); }
      .demo-tabs { display: flex; justify-content: center; gap: 0.5rem; margin-bottom: 2rem; flex-wrap: wrap; }

      .tela-wrap { border-radius: 10px; overflow: hidden; border: 0.5px solid rgba(255,255,255,0.12); }
      .tela-bar { background: rgba(0,0,0,0.4); height: 26px; display: flex; align-items: center; padding: 0 10px; gap: 5px; }
      .tela-dot { width: 7px; height: 7px; border-radius: 50%; }
      .tela-url { flex: 1; background: rgba(255,255,255,0.07); border-radius: 3px; height: 15px; margin: 0 8px; display: flex; align-items: center; padding: 0 7px; }
      .tela-url span { font-size: 9px; color: rgba(255,255,255,0.4); }
      .tela-body { display: flex; height: 200px; }
      .tela-sb { width: 110px; flex-shrink: 0; background: #fff; border-right: 0.5px solid #e5e3dc; padding: 8px 0; display: flex; flex-direction: column; }
      .tela-sb-logo { padding: 5px 10px 8px; font-size: 11px; font-weight: 600; color: #185FA5; border-bottom: 0.5px solid #e5e3dc; margin-bottom: 5px; }
      .tela-sb-logo span { color: #0C447C; }
      .tela-sb-sec { font-size: 7px; color: #bbb; letter-spacing: 0.08em; text-transform: uppercase; padding: 5px 10px 2px; }
      .tela-sb-item { display: flex; align-items: center; gap: 5px; padding: 4px 10px; font-size: 9px; color: #888; }
      .tela-sb-item.ativo { background: #E6F1FB; color: #185FA5; }
      .tela-sb-item.dim { opacity: 0.4; }
      .tela-sb-bot { margin-top: auto; padding: 6px 10px; border-top: 0.5px solid #e5e3dc; display: flex; align-items: center; gap: 5px; }
      .tela-sb-av { width: 18px; height: 18px; border-radius: 50%; background: #185FA5; display: flex; align-items: center; justify-content: center; font-size: 7px; font-weight: 600; color: #fff; flex-shrink: 0; }
      .tela-sb-nome { font-size: 8px; color: #888; }
      .tela-content { flex: 1; background: #f8f7f4; padding: 12px; overflow: hidden; }
      .tela-caption { padding: 10px 0 0; text-align: center; font-size: 11px; color: rgba(255,255,255,0.4); }

      @media (max-width: 768px) {
        .nav-links { display: none !important; }
        .nav-ctas  { display: none !important; }
        .nav-hamburger { display: flex !important; align-items: center; justify-content: center; }
        .hero-grid { grid-template-columns: 1fr !important; gap: 2.5rem !important; }
        .hero-mockup-col { order: -1; }
        .func-grid { grid-template-columns: 1fr !important; }
        .porque-grid { grid-template-columns: 1fr !important; }
        .dores-grid { grid-template-columns: 1fr !important; }
        .telas-grid { grid-template-columns: 1fr !important; }
        .planos-grid { grid-template-columns: 1fr !important; }
        .footer-grid { grid-template-columns: 1fr !important; gap: 2rem !important; }
        .enterprise-row { flex-direction: column; align-items: flex-start; }
        .contabil-pills { grid-template-columns: 1fr 1fr !important; }
        .mockup-stats { grid-template-columns: 1fr 1fr !important; }
        .mockup-bottom { grid-template-columns: 1fr !important; }
        .hero-ctas { flex-direction: column; }
        .hero-ctas a, .hero-ctas button { text-align: center; }
      }
    `}</style>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────
export default async function LandingPage() {
  let clientes: OrgCliente[] = []
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('organizacoes')
      .select('nome_curto, nome, logo_url')
      .eq('exibir_na_landing', true)
      .order('criado_em')
    clientes = data ?? []
  } catch {}

  return (
    <div style={{ fontFamily: "system-ui,-apple-system,'Segoe UI',sans-serif", color: '#0D2B5E', background: '#fff', minHeight: '100vh' }}>
      <EstilosGlobais />
      <InviteDetector />
      <Navbar />
      <main>
        <Hero />
        <Numeros />
        <Clientes orgs={clientes} />
        <Dores />
        <Funcionalidades />
        <TelasReais />
        <Demo />
        <PorQueNexCoop />
        <Depoimento />
        <Planos />
        <CTAFinal />
      </main>
      <Rodape />
      <WppFlutuante />
    </div>
  )
}

// ─── Navbar ────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <header style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, background: 'rgba(4,44,83,0.97)', backdropFilter: 'blur(12px)', borderBottom: '1px solid rgba(255,255,255,0.08)', height: 68 }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '0 1.5rem', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
        <LogoMarca />
        <nav className="nav-links">
          {[['#funcionalidades', 'Funcionalidades'], ['#demo', 'Como funciona'], ['#planos', 'Planos'], ['mailto:suporte@nexcoop.com.br', 'Contato']].map(([href, label]) => (
            <a key={href} href={href} style={{ fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.6)', textDecoration: 'none' }}>{label}</a>
          ))}
        </nav>
        <div className="nav-ctas">
          <Link href="/login" style={{ padding: '8px 20px', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 8, fontSize: 14, fontWeight: 600, color: 'rgba(255,255,255,0.8)', textDecoration: 'none' }}>
            Entrar
          </Link>
          <a href={WPP_URL} target="_blank" rel="noopener noreferrer" style={{ padding: '9px 18px', borderRadius: 8, fontSize: 14, fontWeight: 600, color: '#fff', background: '#1D9E75', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 6, whiteSpace: 'nowrap' }}>
            💬 Falar com a equipe
          </a>
        </div>
        <NavbarMobile />
      </div>
    </header>
  )
}

// ─── Logo ──────────────────────────────────────────────────────────────────
function LogoMarca() {
  return (
    <img
      src="/images/logo-nexcoop-horizontal.png"
      alt="NexCoop"
      style={{ height: 36, width: 'auto', display: 'block' }}
    />
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section style={{ minHeight: '100vh', position: 'relative', display: 'flex', alignItems: 'center', paddingTop: 68, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/images/bg-hero.jpg')", backgroundSize: 'cover', backgroundPosition: 'center top' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg,rgba(4,44,83,0.94) 0%,rgba(12,68,124,0.88) 55%,rgba(12,68,124,0.65) 100%)' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', width: '100%', padding: '4rem 1.5rem', position: 'relative', zIndex: 1 }}>
        <div className="hero-grid">
          <div>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(55,138,221,0.18)', border: '1px solid rgba(55,138,221,0.35)', borderRadius: 100, padding: '5px 14px', fontSize: 13, fontWeight: 500, color: '#85B7EB', marginBottom: '1.5rem' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#378ADD', display: 'inline-block', flexShrink: 0 }} />
              Novo: Módulo Contábil completo com SPED
            </div>
            <h1 style={{ fontSize: 'clamp(2rem,5vw,3.2rem)', fontWeight: 800, color: '#fff', lineHeight: 1.15, letterSpacing: -1, marginBottom: '1.5rem', fontFamily: "'Sora',system-ui,sans-serif" }}>
              Sua{' '}
              <em style={{ fontStyle: 'normal', color: '#85B7EB' }}>cooperativa ou associação</em>
              {' '}organizada, digital e no controle
            </h1>
            <p style={{ fontSize: 17, color: 'rgba(255,255,255,0.7)', lineHeight: 1.7, marginBottom: '2rem', maxWidth: 480 }}>
              Gerencie filiados, finanças, assembleias, documentos e contabilidade — em uma plataforma feita para o cooperativismo brasileiro.
            </p>
            <div className="hero-ctas">
              <a href={WPP_URL} target="_blank" rel="noopener noreferrer" style={{ padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 700, color: '#fff', background: '#1D9E75', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                💬 Falar com a equipe
              </a>
              <a href="#demo" style={{ padding: '14px 28px', borderRadius: 10, fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,0.8)', background: 'rgba(255,255,255,0.08)', border: '1.5px solid rgba(255,255,255,0.25)', textDecoration: 'none' }}>
                ▼ Veja como funciona
              </a>
            </div>
            <div className="hero-badges">
              {['LGPD', '100% nuvem', 'Plano gratuito', 'Suporte PT-BR'].map(item => (
                <span key={item} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
                  ✓ {item}
                </span>
              ))}
            </div>
          </div>
          <div className="hero-mockup-col">
            <MockupDashboard />
          </div>
        </div>
      </div>
    </section>
  )
}

function MockupDashboard() {
  const cardStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 20, padding: '1.5rem', backdropFilter: 'blur(20px)' }
  const statStyle: React.CSSProperties = { background: 'rgba(255,255,255,0.05)', borderRadius: 10, padding: '0.75rem' }
  const bars = [32, 46, 40, 58, 52, 74, 100]
  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: -18, right: 30, background: '#fff', borderRadius: 12, padding: '0.6rem 0.9rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 12, fontWeight: 600, color: '#0D2B5E', zIndex: 2 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80' }} /> 284 filiados ativos
      </div>
      <div style={cardStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
          <span style={{ fontFamily: "'Sora',sans-serif", fontSize: 14, fontWeight: 700, color: '#fff' }}>Nex<span style={{ color: '#85B7EB' }}>Coop</span></span>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(55,138,221,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#B5D4F4' }}>MA</div>
        </div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
          <strong style={{ color: '#fff', fontSize: 15, display: 'block', marginBottom: 2 }}>Dashboard</strong>
          Visão geral da organização
        </div>
        <div className="mockup-stats">
          {[['Filiados', '284', '+12 este mês'], ['A receber', 'R$42k', '+8% vs anterior'], ['Docs vencendo', '7', 'Próximos 30 dias']].map(([label, val, trend]) => (
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
              <div key={i} style={{ flex: 1, borderRadius: '4px 4px 0 0', height: `${h}%`, background: i >= 5 ? 'linear-gradient(180deg,#85B7EB,#185FA5)' : 'rgba(55,138,221,0.35)' }} />
            ))}
          </div>
        </div>
        <div className="mockup-bottom">
          {[['🏛️', 'Próxima assembleia', '28 Jul'], ['💰', 'Capital a receber', 'R$124.500']].map(([icon, label, val]) => (
            <div key={label} style={{ ...statStyle, display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(55,138,221,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>{icon}</div>
              <div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>{label}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', fontFamily: "'Sora',sans-serif" }}>{val}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', bottom: -18, left: 20, background: '#fff', borderRadius: 12, padding: '0.6rem 0.9rem', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: 12, fontWeight: 600, color: '#0D2B5E', zIndex: 2 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#85B7EB' }} /> Ata gerada automaticamente
      </div>
    </div>
  )
}

// ─── Números ───────────────────────────────────────────────────────────────
function Numeros() {
  return (
    <section style={{ background: '#fff', display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderBottom: '1px solid #E2EAF4' }}>
      {[['284+', 'Filiados gerenciados'], ['13', 'Telas contábeis integradas'], ['7 dias', 'Para implantar'], ['100%', 'Em nuvem, sem instalação']].map(([val, label]) => (
        <div key={label} style={{ textAlign: 'center', padding: '1.5rem 1rem', borderRight: '1px solid #E2EAF4' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#0C447C', letterSpacing: -0.5, fontFamily: "'Sora',sans-serif" }}>{val}</div>
          <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>{label}</div>
        </div>
      ))}
    </section>
  )
}

// ─── Clientes ──────────────────────────────────────────────────────────────
function Clientes({ orgs }: { orgs: OrgCliente[] }) {
  const lista = orgs.length > 0 ? orgs : [{ nome_curto: 'COOPAIBI', nome: 'COOPAIBI', logo_url: '/images/coopaibi-logo.jpg' }]
  return (
    <section style={{ padding: '3rem 1.5rem', background: '#fff', borderBottom: '1px solid #E2EAF4' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <p style={{ textAlign: 'center', fontSize: 12, fontWeight: 600, color: '#94A3B8', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '2rem' }}>
          Organizações que confiam na NexCoop
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', gap: '2rem' }}>
          {lista.map(org => {
            const nome = org.nome_curto || org.nome
            return (
              <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: 0.75, filter: 'grayscale(0.3)' }}>
                {org.logo_url ? (
                  <img src={org.logo_url} alt={nome} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg,#1565C0,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌱</div>
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

// ─── Dores ─────────────────────────────────────────────────────────────────
function Dores() {
  return (
    <section style={{ position: 'relative', padding: '6rem 1.5rem', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/images/bg-dores.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(248,247,244,0.95)' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
          <span style={{ display: 'inline-block', background: '#E6F1FB', color: '#185FA5', fontSize: 11, fontWeight: 600, padding: '4px 12px', borderRadius: 100 }}>Para a presidência</span>
        </div>
        <h2 style={estiloTituloSecao}>Você já passou por isso?</h2>
        <p style={estiloDescSecao}>Os problemas que todo presidente de cooperativa ou associação enfrenta — e como o NexCoop resolve cada um.</p>
        <div className="dores-grid">
          {DORES.map(d => (
            <div key={d.titulo} style={{ background: '#fff', border: '1px solid #E2EAF4', borderRadius: 16, padding: '1.5rem' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: d.cor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, marginBottom: '1rem' }}>{d.icon}</div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0D2B5E', marginBottom: '0.5rem' }}>{d.titulo}</h3>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6, marginBottom: '0.875rem' }}>{d.desc}</p>
              <div style={{ fontSize: 12, color: '#185FA5', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ flexShrink: 0, marginTop: 1 }}>✓</span>
                <span>{d.resolve}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Funcionalidades ───────────────────────────────────────────────────────
function Funcionalidades() {
  return (
    <section id="funcionalidades" style={{ position: 'relative', padding: '6rem 1.5rem', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/images/bg-funcs.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(244,248,255,0.96)' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <RotuloSecao>Funcionalidades</RotuloSecao>
        <h2 style={estiloTituloSecao}>Tudo em <em style={estiloDestaque}>um só lugar</em></h2>
        <p style={estiloDescSecao}>Plataforma integrada que conecta pessoas, processos e dados para uma gestão mais eficiente, transparente e estratégica.</p>

        <div style={{ background: 'linear-gradient(135deg,#0F766E,#0D6B63)', borderRadius: 16, padding: '2rem', marginBottom: '1.5rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1.25rem', position: 'relative', zIndex: 1, flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 14, padding: 12, fontSize: 28, flexShrink: 0 }}>🏦</div>
            <div style={{ flex: 1, minWidth: 260 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: '#fff', fontFamily: "'Sora',sans-serif" }}>Módulo Contábil Completo</span>
                <span style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 100 }}>Disponível</span>
                <span style={{ background: '#FCD34D', color: '#78350F', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>Exclusivo</span>
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.8)', marginBottom: '1rem', lineHeight: 1.6 }}>
                Contabilidade completa feita para cooperativas e associações brasileiras — sem precisar de outro sistema.
              </p>
              <div className="contabil-pills">
                {[['📊', 'Plano de contas'], ['📄', 'DRE e Balanço'], ['📤', 'Exportação SPED'], ['🔒', 'Fechamento SHA-256'], ['🏦', 'Conciliação bancária'], ['💼', 'Portal do contador']].map(([icon, label]) => (
                  <div key={label} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: 8, padding: '6px 10px', fontSize: 12, color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{icon}</span>{label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="func-grid">
          {FUNCIONALIDADES.map(f => (
            <div key={f.title} style={{ background: '#fff', borderRadius: 16, padding: '1.5rem', border: f.novo ? `2px solid ${f.cor}` : '1px solid #E2EAF4', opacity: f.live ? 1 : 0.65, position: 'relative' }}>
              {f.novo && (
                <div style={{ position: 'absolute', top: -11, right: 14, background: f.cor!, color: '#fff', fontSize: 10, fontWeight: 700, padding: '3px 10px', borderRadius: 100 }}>Novo</div>
              )}
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,rgba(21,101,192,0.1),rgba(6,182,212,0.1))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: '1rem' }}>
                {f.icon}
              </div>
              <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 600, padding: '3px 10px', borderRadius: 100, marginBottom: '0.6rem', background: f.live ? '#E1F5EE' : '#E6F1FB', color: f.live ? '#085041' : '#0C447C' }}>
                {f.live ? 'Disponível' : 'Em breve'}
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#0D2B5E', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: '#64748B', lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Telas Reais ───────────────────────────────────────────────────────────
function TelasReais() {
  const sb = (ativo: string, items: string[][]) => (
    <div className="tela-sb">
      <div className="tela-sb-logo">Nex<span>Coop</span></div>
      {items.map(([sec, ...links]) => (
        <div key={sec}>
          <div className="tela-sb-sec">{sec}</div>
          {links.map(l => {
            const [icon, label, isAtivo, isDim] = l.split('|')
            return (
              <div key={label} className={`tela-sb-item${isAtivo === ativo ? ' ativo' : ''}${isDim ? ' dim' : ''}`}>
                <span style={{ fontSize: 10 }}>{icon}</span> {label}
              </div>
            )
          })}
        </div>
      ))}
      <div className="tela-sb-bot">
        <div className="tela-sb-av">MA</div>
        <div className="tela-sb-nome">Maria Andrade</div>
      </div>
    </div>
  )

  return (
    <section style={{ background: '#042C53', padding: '6rem 1.5rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <RotuloSecao cor="#85B7EB">O sistema na prática</RotuloSecao>
        <h2 style={{ ...estiloTituloSecao, color: '#fff' }}>
          Telas <em style={{ fontStyle: 'normal', color: '#85B7EB' }}>reais</em> do NexCoop
        </h2>
        <p style={{ ...estiloDescSecao, color: 'rgba(255,255,255,0.45)' }}>
          Sem demos simuladas. O que você vê aqui é exatamente o que sua organização vai usar.
        </p>
        <div className="telas-grid">

          {/* Dashboard */}
          <div>
            <div className="tela-wrap">
              <div className="tela-bar">
                <div className="tela-dot" style={{ background: '#ff5f57' }} />
                <div className="tela-dot" style={{ background: '#febc2e' }} />
                <div className="tela-dot" style={{ background: '#28c840' }} />
                <div className="tela-url"><span>nexcoop.com.br/dashboard</span></div>
              </div>
              <div className="tela-body">
                {sb('dashboard', [
                  ['Principal', '🏠|Dashboard|dashboard', '👥|Cooperados', '💰|Financeiro', '🏛️|Assembleias', '📁|Documentos'],
                  ['Agro', '🤝|Comercialização'],
                ])}
                <div className="tela-content">
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#042C53', marginBottom: 2 }}>Dashboard</div>
                  <div style={{ fontSize: 8, color: '#aaa', marginBottom: 8 }}>Visão geral da organização</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 4, marginBottom: 5 }}>
                    {[['284', 'Filiados', '#185FA5'], ['R$42k', 'A receber', '#085041'], ['R$8k', 'A pagar', '#A32D2D'], ['7', 'Docs venc.', '#854F0B']].map(([v, l, c]) => (
                      <div key={l} style={{ background: '#fff', borderRadius: 4, border: '0.5px solid #e5e3dc', padding: 5 }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: c }}>{v}</div>
                        <div style={{ fontSize: 7, color: '#aaa', marginTop: 1 }}>{l}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 5 }}>
                    <div style={{ background: '#fff', borderRadius: 4, border: '0.5px solid #e5e3dc', padding: 5 }}>
                      <div style={{ fontSize: 7, fontWeight: 600, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Capital a receber</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#042C53' }}>R$124.500</div>
                      <div style={{ fontSize: 7, color: '#aaa' }}>Parcelas de cotas</div>
                    </div>
                    <div style={{ background: '#fff', borderRadius: 4, border: '0.5px solid #e5e3dc', padding: 5 }}>
                      <div style={{ fontSize: 7, fontWeight: 600, color: '#A32D2D', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Inadimplentes</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#A32D2D' }}>12</div>
                      <div style={{ fontSize: 7, color: '#aaa' }}>4,2% dos filiados</div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    <div style={{ background: '#fff', borderRadius: 4, border: '0.5px solid #e5e3dc', padding: 5 }}>
                      <div style={{ fontSize: 8, fontWeight: 600, color: '#042C53', marginBottom: 4 }}>Últimos lançamentos</div>
                      {[['Mensalidades Maio', '+R$18.400', '#085041'], ['Aluguel sede', '-R$2.800', '#A32D2D'], ['Venda coletiva', '+R$67.200', '#085041']].map(([d, v, c]) => (
                        <div key={d} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 7, padding: '2px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                          <span style={{ color: '#555' }}>{d}</span><span style={{ color: c, fontWeight: 600 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: '#fff', borderRadius: 4, border: '0.5px solid #e5e3dc', padding: 5 }}>
                      <div style={{ fontSize: 7, fontWeight: 600, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Próx. assembleia</div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: '#042C53' }}>AGO 2026</div>
                      <div style={{ fontSize: 7, color: '#888', marginBottom: 5 }}>28 de julho de 2026</div>
                      <div style={{ fontSize: 7, fontWeight: 600, color: '#854F0B', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>Docs vencendo</div>
                      {[['Alvará funcionamento', '02/07'], ['Certidão FGTS', '15/07']].map(([d, v]) => (
                        <div key={d} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 6, padding: '2px 0', borderBottom: '0.5px solid #f0f0f0' }}>
                          <span style={{ color: '#555' }}>{d}</span><span style={{ color: '#A32D2D' }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="tela-caption">Dashboard — visão geral da presidência</div>
          </div>

          {/* Captação */}
          <div>
            <div className="tela-wrap">
              <div className="tela-bar">
                <div className="tela-dot" style={{ background: '#ff5f57' }} />
                <div className="tela-dot" style={{ background: '#febc2e' }} />
                <div className="tela-dot" style={{ background: '#28c840' }} />
                <div className="tela-url"><span>nexcoop.com.br/captacao</span></div>
              </div>
              <div className="tela-body">
                {sb('captacao', [
                  ['Projetos', '🎯|Captação|captacao', '🌿|ESG||dim'],
                  ['Contábil', '🏦|Plano Contas', '✏️|Escrituração'],
                ])}
                <div className="tela-content">
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#042C53', marginBottom: 1 }}>Captação de Recursos</div>
                  <div style={{ fontSize: 8, color: '#aaa', marginBottom: 6 }}>Gerencie oportunidades de financiamento</div>
                  <div style={{ display: 'flex', gap: 0, marginBottom: 6, borderBottom: '0.5px solid #e5e3dc' }}>
                    {['Abertas', 'A abrir', 'Vencidas', 'Radar IA'].map((t, i) => (
                      <div key={t} style={{ fontSize: 7, padding: '3px 7px', color: i === 3 ? '#185FA5' : '#aaa', borderBottom: i === 3 ? '1.5px solid #185FA5' : 'none', fontWeight: i === 3 ? 600 : 400 }}>{t}</div>
                    ))}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 6 }}>
                    <div style={{ background: '#fff', borderRadius: 5, border: '0.5px solid #e5e3dc', padding: 6 }}>
                      <div style={{ fontSize: 7, fontWeight: 600, color: '#042C53', marginBottom: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        Fontes <span style={{ background: '#1D9E75', color: '#fff', fontSize: 6, padding: '1px 4px', borderRadius: 2 }}>+ Add</span>
                      </div>
                      {[['CAR / BA', 'ba.gov.br/car', 'Nacional'], ['Prêmio Zayed', 'zayedsustainability...', 'Internacional']].map(([n, u, b]) => (
                        <div key={n} style={{ border: '0.5px solid #e5e3dc', borderRadius: 3, padding: 4, marginBottom: 3 }}>
                          <div style={{ fontSize: 7, fontWeight: 600, color: '#042C53', marginBottom: 1 }}>{n}</div>
                          <div style={{ fontSize: 6, color: '#aaa', marginBottom: 2 }}>{u}</div>
                          <span style={{ fontSize: 6, padding: '1px 4px', borderRadius: 100, background: b === 'Nacional' ? '#E6F1FB' : '#EEEDFE', color: b === 'Nacional' ? '#185FA5' : '#534AB7' }}>{b}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: '#fff', borderRadius: 5, border: '0.5px solid #e5e3dc', padding: 6 }}>
                      <div style={{ fontSize: 7, fontWeight: 600, color: '#042C53', marginBottom: 4 }}>Resultados da varredura</div>
                      {[['94/100', 'EDITAL CAR Nº 006 — PLANTAS MEDICINAIS', '#E1F5EE', '#085041'], ['81/100', 'EDITAL CAR Nº 008 — RAÍZES DA BAHIA', '#E6F1FB', '#185FA5']].map(([score, titulo, bg, cor]) => (
                        <div key={titulo} style={{ border: '0.5px solid #e5e3dc', borderRadius: 3, padding: 5, marginBottom: 3 }}>
                          <span style={{ fontSize: 5, fontWeight: 600, padding: '1px 5px', borderRadius: 100, background: bg, color: cor, display: 'inline-block', marginBottom: 2 }}>Compatível · {score}</span>
                          <div style={{ fontSize: 7, fontWeight: 600, color: '#042C53', marginBottom: 1, lineHeight: 1.3 }}>{titulo}</div>
                          <div style={{ fontSize: 6, color: '#aaa' }}>CAR — Companhia de Desenvolvimento</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="tela-caption">Captação + Radar IA — varredura automática de editais</div>
          </div>

          {/* Plano de Contas */}
          <div>
            <div className="tela-wrap">
              <div className="tela-bar">
                <div className="tela-dot" style={{ background: '#ff5f57' }} />
                <div className="tela-dot" style={{ background: '#febc2e' }} />
                <div className="tela-dot" style={{ background: '#28c840' }} />
                <div className="tela-url"><span>nexcoop.com.br/contabil/plano-de-contas</span></div>
              </div>
              <div className="tela-body">
                {sb('plano', [
                  ['Contábil', '🏦|Plano Contas|plano', '⚖️|Balancete', '📊|DRE', '🏛️|Balanço', '📖|Livro Razão', '🔄|Conciliação'],
                ])}
                <div className="tela-content">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#042C53', marginBottom: 1 }}>Plano de Contas</div>
                      <div style={{ fontSize: 8, color: '#aaa' }}>Estrutura contábil hierárquica</div>
                    </div>
                    <div style={{ background: '#185FA5', color: '#fff', fontSize: 7, padding: '2px 7px', borderRadius: 3 }}>+ Nova Conta</div>
                  </div>
                  <table style={{ width: '100%', borderRadius: 5, overflow: 'hidden', border: '0.5px solid #e5e3dc', borderCollapse: 'collapse' }}>
                    <thead style={{ background: '#0C447C' }}>
                      <tr>{['Código', 'Nome', 'Natureza', 'Lanç.'].map(h => <th key={h} style={{ fontSize: 7, fontWeight: 600, color: '#fff', padding: '4px 5px', textAlign: 'left' }}>{h}</th>)}</tr>
                    </thead>
                    <tbody>
                      {[
                        ['1', 'ATIVO', 'DEVEDORA', '', true],
                        ['1.1', 'Ativo Circulante', 'DEVEDORA', '', true],
                        ['1.1.1', 'Disponibilidades', 'DEVEDORA', '', false],
                        ['1.1.1.01', 'Caixa', 'DEVEDORA', 'Sim', false],
                        ['1.1.1.02', 'Banco Conta Mov.', 'DEVEDORA', 'Sim', false],
                        ['1.1.2', 'Créditos a Receber', 'DEVEDORA', '', false],
                        ['1.1.2.01', 'Mensalidades a Rec.', 'DEVEDORA', 'Sim', false],
                        ['1.2', 'Ativo Não Circ.', 'DEVEDORA', '', true],
                      ].map(([cod, nome, nat, lanc, bold], i) => (
                        <tr key={cod as string} style={{ background: i % 2 === 0 ? '#fff' : '#f8f9fc', borderBottom: '0.5px solid #e5e3dc' }}>
                          <td style={{ fontSize: 6, color: '#aaa', padding: '3px 5px' }}>{cod}</td>
                          <td style={{ fontSize: 7, fontWeight: bold ? 700 : 400, color: '#042C53', padding: '3px 5px' }}>{nome}</td>
                          <td style={{ fontSize: 6, color: '#555', padding: '3px 5px' }}>{nat}</td>
                          <td style={{ padding: '3px 5px' }}>{lanc ? <span style={{ background: '#E1F5EE', color: '#085041', fontSize: 6, padding: '1px 4px', borderRadius: 100 }}>{lanc}</span> : null}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div className="tela-caption">Módulo Contábil — plano de contas com exportação SPED</div>
          </div>

          {/* Assembleias */}
          <div>
            <div className="tela-wrap">
              <div className="tela-bar">
                <div className="tela-dot" style={{ background: '#ff5f57' }} />
                <div className="tela-dot" style={{ background: '#febc2e' }} />
                <div className="tela-dot" style={{ background: '#28c840' }} />
                <div className="tela-url"><span>nexcoop.com.br/assembleias/nova</span></div>
              </div>
              <div className="tela-body">
                {sb('assembleias', [
                  ['Principal', '🏠|Dashboard', '👥|Cooperados', '💰|Financeiro', '🏛️|Assembleias|assembleias', '📁|Documentos'],
                  ['Agro', '🤝|Comercializ.'],
                ])}
                <div className="tela-content">
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#042C53', marginBottom: 1 }}>Nova assembleia</div>
                  <div style={{ fontSize: 8, color: '#aaa', marginBottom: 7 }}>Registre uma assembleia ou reunião de conselho</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 6 }}>
                    {[['AGO', 'Assembleia Geral Ordinária', true], ['AGE', 'Assembleia Geral Extraordinária', false], ['CA', 'Conselho de Administração', false], ['CF', 'Conselho Fiscal', false]].map(([cod, nome, sel]) => (
                      <div key={cod as string} style={{ border: sel ? '1.5px solid #185FA5' : '0.5px solid #e5e3dc', borderRadius: 4, padding: 5, background: sel ? '#E6F1FB' : '#fff' }}>
                        <div style={{ fontSize: 9, fontWeight: 700, color: sel ? '#0C447C' : '#888', marginBottom: 1 }}>{cod}</div>
                        <div style={{ fontSize: 6, color: sel ? '#185FA5' : '#888' }}>{nome}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background: '#fff', borderRadius: 4, border: '0.5px solid #e5e3dc', padding: 6 }}>
                    <div style={{ fontSize: 7, fontWeight: 600, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Identificação</div>
                    <div style={{ fontSize: 7, color: '#888', marginBottom: 2 }}>Título *</div>
                    <div style={{ border: '0.5px solid #d1d5db', borderRadius: 3, padding: '3px 6px', fontSize: 8, color: '#aaa', marginBottom: 5 }}>Assembleia Geral Ordinária 2026</div>
                    <div style={{ fontSize: 7, color: '#888', marginBottom: 2 }}>Modalidade</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
                      {[['Presencial', true], ['Remota', false], ['Híbrida', false]].map(([l, sel]) => (
                        <div key={l as string} style={{ border: sel ? '1px solid #185FA5' : '0.5px solid #d1d5db', borderRadius: 3, padding: '3px 4px', fontSize: 6, color: sel ? '#185FA5' : '#888', display: 'flex', alignItems: 'center', gap: 3, background: sel ? '#E6F1FB' : '#fff' }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', border: '1.5px solid #185FA5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {sel && <div style={{ width: 2.5, height: 2.5, borderRadius: '50%', background: '#185FA5' }} />}
                          </div>
                          {l}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="tela-caption">Assembleias — convocação digital com controle de quórum</div>
          </div>

        </div>
      </div>
    </section>
  )
}

// ─── Demo ──────────────────────────────────────────────────────────────────
function Demo() { return <DemoInterativa /> }

// ─── Por que NexCoop ───────────────────────────────────────────────────────
function PorQueNexCoop() {
  return (
    <section style={{ position: 'relative', padding: '6rem 1.5rem', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/images/bg-depo.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,44,83,0.9)' }} />
      <div style={{ maxWidth: 1200, margin: '0 auto', position: 'relative', zIndex: 1 }}>
        <RotuloSecao cor="#85B7EB">Por que NexCoop</RotuloSecao>
        <h2 style={{ ...estiloTituloSecao, color: '#fff' }}>
          Por que escolher a{' '}
          <em style={{ fontStyle: 'normal', color: '#85B7EB' }}>NexCoop?</em>
        </h2>
        <p style={{ ...estiloDescSecao, color: 'rgba(255,255,255,0.5)' }}>
          Cinco razões para confiar a gestão da sua organização à nossa plataforma.
        </p>
        <div className="porque-grid">
          {DIFERENCIAIS.map(d => (
            <div key={d.titulo} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, padding: '1.25rem' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'rgba(6,182,212,0.2)', border: '1.5px solid rgba(6,182,212,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                <span style={{ color: '#06B6D4', fontSize: 13, fontWeight: 700 }}>✓</span>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginBottom: 4 }}>{d.titulo}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{d.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Depoimento ────────────────────────────────────────────────────────────
function Depoimento() {
  return (
    <section style={{ position: 'relative', padding: '6rem 1.5rem', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/images/bg-funcs.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(4,44,83,0.88)' }} />
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 72, color: '#378ADD', lineHeight: 0.8, marginBottom: '0.5rem', opacity: 0.6 }}>&quot;</div>
        <p style={{ fontSize: 18, fontWeight: 500, color: '#fff', lineHeight: 1.75, fontFamily: "'Sora',sans-serif", marginBottom: '1.5rem' }}>
          &ldquo;A NexCoop trouxe organização real para a nossa cooperativa. Hoje tenho controle dos cooperados, das finanças e das assembleias — tudo em um sistema só, sem precisar de planilhas ou papel.&rdquo;
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
          <img src="/images/coopaibi-logo.jpg" alt="COOPAIBI" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>João Matheus</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>Presidente · COOPAIBI — Cooperativa Mista Agropecuária de Ibirataia, BA</div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Planos ────────────────────────────────────────────────────────────────
function Planos() {
  return (
    <section id="planos" style={{ padding: '6rem 1.5rem', background: '#fff' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <RotuloSecao>Planos e preços</RotuloSecao>
        <h2 style={estiloTituloSecao}>
          Simples, transparente, <em style={estiloDestaque}>sem surpresas</em>
        </h2>
        <p style={estiloDescSecao}>Escolha o plano ideal para o tamanho e necessidades da sua organização.</p>

        <div className="planos-grid">
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
                    <span style={{ color: '#1D9E75', fontWeight: 700 }}>✓</span> {r}
                  </li>
                ))}
              </ul>
              <a href={p.href} target={p.href.startsWith('https') ? '_blank' : undefined} rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, textAlign: 'center', padding: '11px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', background: p.nome === 'Agro' ? '#1D9E75' : p.destaque ? 'linear-gradient(135deg,#1565C0,#06B6D4)' : 'none', color: (p.destaque || p.nome === 'Agro') ? '#fff' : '#0D2B5E', outline: (p.destaque || p.nome === 'Agro') ? 'none' : '1.5px solid #E2EAF4', cursor: 'pointer' }}>
                {p.nome === 'Agro' && '💬 '}{p.cta}
              </a>
            </div>
          ))}
        </div>

        <div style={{ marginTop: '1.25rem', border: '1px solid #E2EAF4', borderRadius: 16, padding: '2rem' }}>
          <div className="enterprise-row">
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flex: 1 }}>
              <div style={{ width: 52, height: 52, borderRadius: 14, background: 'linear-gradient(135deg,#1565C0,#06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🏢</div>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 18, fontWeight: 800, color: '#0D2B5E' }}>Enterprise</div>
                <div style={{ fontSize: 14, color: '#64748B', marginTop: 3, maxWidth: 480 }}>Para grandes redes cooperativistas, federações e centrais. Infraestrutura dedicada, SLA garantido, múltiplas organizações e integrações customizadas.</div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontFamily: "'Sora',sans-serif", fontSize: 20, fontWeight: 800, color: '#0D2B5E' }}>Sob consulta</div>
                <div style={{ fontSize: 12, color: '#94A3B8' }}>Proposta personalizada</div>
              </div>
              <a href={WPP_URL} target="_blank" rel="noopener noreferrer" style={{ padding: '12px 24px', borderRadius: 10, fontSize: 14, fontWeight: 600, color: '#fff', background: 'linear-gradient(135deg,#1565C0,#06B6D4)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                💬 Falar com consultor
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── CTA Final ─────────────────────────────────────────────────────────────
function CTAFinal() {
  return (
    <section style={{ position: 'relative', padding: '5rem 1.5rem', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: "url('/images/bg-cta.jpg')", backgroundSize: 'cover', backgroundPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.93)' }} />
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 1 }}>
        <div style={{ width: 72, height: 72, borderRadius: 20, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 1.5rem' }}>💬</div>
        <h2 style={{ fontFamily: "'Sora',sans-serif", fontSize: 'clamp(1.6rem,3vw,2.5rem)', fontWeight: 800, color: '#0D2B5E', lineHeight: 1.2, letterSpacing: -0.5, marginBottom: '1rem' }}>
          Pronto para transformar a gestão da sua organização?
        </h2>
        <p style={{ fontSize: 16, color: '#64748B', marginBottom: '2rem', lineHeight: 1.6 }}>
          Fale com nossa equipe agora pelo WhatsApp. Apresentamos o sistema em 20 minutos, sem compromisso.
        </p>
        <a href={WPP_URL} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '14px 32px', borderRadius: 10, fontSize: 16, fontWeight: 700, color: '#fff', background: '#1D9E75', textDecoration: 'none', marginBottom: '1rem' }}>
          💬 Falar com a equipe no WhatsApp
        </a>
        <div style={{ fontSize: 13, color: '#94A3B8' }}>
          Ou escreva para <a href="mailto:suporte@nexcoop.com.br" style={{ color: '#1565C0', textDecoration: 'none' }}>suporte@nexcoop.com.br</a>
        </div>
      </div>
    </section>
  )
}

// ─── WhatsApp Flutuante ─────────────────────────────────────────────────────
function WppFlutuante() {
  return (
    <a
      href={WPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 999, background: '#1D9E75', color: '#fff', padding: '12px 20px', borderRadius: 100, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
    >
      💬 Falar com a equipe
    </a>
  )
}

// ─── Rodapé ────────────────────────────────────────────────────────────────
function Rodape() {
  return (
    <footer style={{ background: '#042C53', padding: '4rem 1.5rem 2rem' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        <div className="footer-grid">
          <div>
            <img src="/images/logo-nexcoop-horizontal.png" alt="NexCoop" style={{ height: 28, width: 'auto', display: 'block', marginBottom: '0.75rem', filter: 'brightness(0) invert(1)' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.4)', lineHeight: 1.6, maxWidth: 260 }}>
              Gestão tecnológica para cooperativas e associações que buscam crescer com eficiência, inovação e sustentabilidade.
            </p>
          </div>
          {[
            { titulo: 'Produto', links: [['#funcionalidades', 'Funcionalidades'], ['#planos', 'Planos e preços'], ['#', 'Novidades'], ['#', 'Roadmap']] },
            { titulo: 'Empresa', links: [['#', 'Sobre nós'], ['#', 'Blog'], ['#', 'Política de Privacidade'], ['#', 'Termos de Uso']] },
            { titulo: 'Contato', links: [['mailto:suporte@nexcoop.com.br', 'suporte@nexcoop.com.br'], [WPP_URL, 'WhatsApp'], ['#', '🇧🇷 Brasil']] },
          ].map(col => (
            <div key={col.titulo}>
              <h4 style={{ fontFamily: "'Sora',sans-serif", fontSize: 13, fontWeight: 700, color: '#fff', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{col.titulo}</h4>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {col.links.map(([href, label]) => (
                  <li key={label}><a href={href} style={{ fontSize: 14, color: 'rgba(255,255,255,0.45)', textDecoration: 'none' }}>{label}</a></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)' }}>© 2026 NexCoop. Todos os direitos reservados.</p>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            {[['#', 'Privacidade'], ['#', 'Termos'], ['#', 'LGPD']].map(([href, label]) => (
              <a key={label} href={href} style={{ fontSize: 13, color: 'rgba(255,255,255,0.25)', textDecoration: 'none' }}>{label}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Helpers ───────────────────────────────────────────────────────────────
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
