'use client'

import Link from 'next/link'

// ── Design tokens ─────────────────────────────────────────────────────────────
const C = {
  laranja:    '#E07B30',
  laranjaLt:  '#FFF7ED',
  verde:      '#16A34A',
  verdeLt:    '#F0FDF4',
  azul:       '#2563EB',
  azulLt:     '#EFF6FF',
  roxo:       '#7C3AED',
  roxoLt:     '#F5F3FF',
  vermelho:   '#DC2626',
  vermelhoLt: '#FEF2F2',
  cinza:      '#78716C',
  cinzaLt:    '#F5F5F4',
  borda:      '#E5E3DC',
  bg:         '#F8F7F4',
  txt:        '#1C1917',
  txtSub:     '#78716C',
}

// ── Mock data ─────────────────────────────────────────────────────────────────
const KPIS = [
  { label: 'Faturamento hoje',   value: 'R$ 2.847', sub: '22 transações',        icon: '💰', cor: C.laranja,  corLt: C.laranjaLt,  trend: '+18%', up: true  },
  { label: 'Faturamento do mês', value: 'R$ 38.420', sub: 'Jun 2026',            icon: '📈', cor: C.azul,     corLt: C.azulLt,     trend: '+12%', up: true  },
  { label: 'Ticket médio',       value: 'R$ 127,42', sub: 'Mês corrente',        icon: '🧾', cor: C.roxo,     corLt: C.roxoLt,     trend: '+5%',  up: true  },
  { label: 'Saldo estimado',     value: 'R$ 1.245',  sub: 'Dinheiro + PIX hoje', icon: '💵', cor: C.verde,    corLt: C.verdeLt,    trend: null,   up: true  },
  { label: 'Estoque crítico',    value: '3 itens',   sub: 'Abaixo do mínimo',    icon: '⚠️', cor: C.vermelho, corLt: C.vermelhoLt, trend: null,   up: false },
  { label: 'Vendas em conta',    value: 'R$ 3.840',  sub: 'Acumulado no mês',    icon: '🤝', cor: C.cinza,    corLt: C.cinzaLt,    trend: null,   up: true  },
]

const ALERTAS = [
  { nome: 'Milho em Grão 60kg',       atual: 2,  minimo: 10, unidade: 'sc', pct: 20 },
  { nome: 'Ração Bovina 30kg',        atual: 5,  minimo: 15, unidade: 'sc', pct: 33 },
  { nome: 'Herbicida Glifosato 5L',   atual: 1,  minimo: 5,  unidade: 'un', pct: 20 },
]

const CHART = [
  { dia: '14/06', val: 980  },
  { dia: '15/06', val: 1540 },
  { dia: '16/06', val: 720  },
  { dia: '17/06', val: 1890 },
  { dia: '18/06', val: 2100 },
  { dia: '19/06', val: 1450 },
  { dia: '20/06', val: 2340 },
  { dia: '21/06', val: 1780 },
  { dia: '22/06', val: 1620 },
  { dia: '23/06', val: 2847 },
]

const TOP = [
  { nome: 'Milho em Grão 60kg',   qtd: 18, total: 8640, cor: '#F59E0B' },
  { nome: 'Ração Bovina 30kg',    qtd: 12, total: 5280, cor: '#10B981' },
  { nome: 'Herbicida Glifosato',  qtd: 8,  total: 3840, cor: '#6366F1' },
  { nome: 'Calcário Agrícola',    qtd: 25, total: 2750, cor: '#F97316' },
  { nome: 'Fertilizante NPK 20kg',qtd: 5,  total: 1850, cor: '#14B8A6' },
]

const VENDAS = [
  { num: 'V-9F2A8B', hora: '09:38', forma: 'PIX',           cor: { bg: '#E0F2FE', txt: '#0369A1' }, total: 340.80 },
  { num: 'V-7E1C4D', hora: '09:15', forma: 'Dinheiro',      cor: { bg: '#F0FDF4', txt: '#15803D' }, total: 127.50 },
  { num: 'V-3A9F2E', hora: '08:52', forma: 'Cartão',        cor: { bg: '#EFF6FF', txt: '#2563EB' }, total: 89.90  },
  { num: 'V-2B8D5F', hora: '08:30', forma: 'Crédito Coop.', cor: { bg: '#F5F3FF', txt: '#7C3AED' }, total: 512.00 },
  { num: 'V-1C7E3A', hora: '08:05', forma: 'PIX',           cor: { bg: '#E0F2FE', txt: '#0369A1' }, total: 234.00 },
]

const GESTAO = [
  { label: 'Conferência de Caixa', desc: 'Confira e aprove os fechamentos dos operadores.',     icone: 'ti-clipboard-check', cor: C.laranja, href: '/loja/conferencia'       },
  { label: 'Caixas',               desc: 'Sessões abertas e fechadas, forçar fechamento.',       icone: 'ti-cash-register',   cor: C.verde,   href: '/loja/caixas'           },
  { label: 'Rel. Vendas',          desc: 'Histórico e totais de vendas por período e operador.', icone: 'ti-chart-bar',       cor: C.azul,    href: '/loja/relatorio/vendas' },
  { label: 'Rel. Estoque',         desc: 'Posição atual, movimentações e histórico de ajustes.', icone: 'ti-packages',        cor: C.roxo,    href: '/loja/relatorio/estoque'},
  { label: 'Rel. Caixa',           desc: 'Faturamento, sangrias e fechamentos por sessão.',      icone: 'ti-report-money',    cor: C.cinza,   href: '/loja/relatorio/caixa'  },
]

function BRL(v: number) {
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export default function Teste1Page() {
  const maxChart = Math.max(...CHART.map(d => d.val))
  const maxTop   = TOP[0].total

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
          50%      { box-shadow: 0 0 0 6px rgba(22,163,74,0); }
        }
        .dot-pulse { animation: pulse 2s ease-in-out infinite; }
        .kpi-card  { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: default; }
        .kpi-card:hover  { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.07) !important; }
        .link-card { transition: border-color 0.15s, box-shadow 0.15s; }
        .link-card:hover { border-color: #E07B30 !important; box-shadow: 0 4px 12px rgba(224,123,48,0.12); }
        .venda-row { transition: background 0.1s; border-radius: 8px; }
        .venda-row:hover { background: #FAFAF9 !important; }
        .bar-fill { transition: width 0.5s ease; }
        .btn-pdv  { transition: opacity 0.15s, transform 0.1s; }
        .btn-pdv:hover  { opacity: 0.92; transform: translateY(-1px); }
      `}</style>

      <div style={{ background: C.bg, minHeight: '100vh', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

        {/* ═══ HEADER ════════════════════════════════════════════════════════════ */}
        <div style={{
          background: '#fff',
          borderBottom: `1px solid ${C.borda}`,
          padding: '18px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 12, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9,
                background: C.laranjaLt, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 18, flexShrink: 0,
              }}>🏪</div>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: C.txt, letterSpacing: '-0.02em' }}>
                Loja Agropecuária
              </h1>
            </div>
            <div style={{ fontSize: 12, color: C.txtSub, paddingLeft: 46 }}>
              Segunda-feira, 23 de junho de 2026
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {/* Caixa aberto */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: C.verdeLt, border: `1px solid #BBF7D0`,
              borderRadius: 8, padding: '7px 14px',
            }}>
              <span
                className="dot-pulse"
                style={{ width: 8, height: 8, borderRadius: '50%', background: C.verde, display: 'inline-block', flexShrink: 0 }}
              />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#15803D' }}>Caixa aberto · Carlos Silva</span>
            </div>

            {/* Alerta */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              background: C.vermelhoLt, border: `1px solid #FECACA`,
              borderRadius: 8, padding: '7px 14px',
            }}>
              <span style={{ fontSize: 13 }}>⚠️</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: C.vermelho }}>3 itens críticos</span>
            </div>

            {/* CTA PDV */}
            <Link
              href="/loja/pdv"
              className="btn-pdv"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.laranja, color: '#fff',
                borderRadius: 9, padding: '9px 18px',
                textDecoration: 'none', fontSize: 13, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(224,123,48,0.35)',
              }}
            >
              <i className="ti ti-shopping-cart" style={{ fontSize: 15 }} />
              Abrir PDV
            </Link>
          </div>
        </div>

        <div style={{ padding: '28px 32px', maxWidth: 1200 }}>

          {/* ═══ KPI CARDS ═══════════════════════════════════════════════════════ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))',
            gap: 12, marginBottom: 24,
          }}>
            {KPIS.map(k => (
              <div
                key={k.label}
                className="kpi-card"
                style={{
                  background: '#fff', borderRadius: 14,
                  border: `1px solid ${C.borda}`,
                  padding: '18px 18px 16px',
                  position: 'relative', overflow: 'hidden',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                }}
              >
                {/* Accent top bar */}
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: k.cor, borderRadius: '14px 14px 0 0',
                }} />

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: k.corLt,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 19,
                  }}>{k.icon}</div>

                  {k.trend && (
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '3px 7px', borderRadius: 6,
                      color: k.up ? C.verde : C.vermelho,
                      background: k.up ? C.verdeLt : C.vermelhoLt,
                    }}>
                      {k.up ? '↑' : '↓'} {k.trend}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 26, fontWeight: 800, color: k.label === 'Estoque crítico' ? C.vermelho : C.txt, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 5 }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 12, color: C.txtSub, fontWeight: 500 }}>{k.label}</div>
                <div style={{ fontSize: 10, color: '#A8A29E', marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ═══ GRÁFICO + ALERTAS ═══════════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 24 }}>

            {/* Chart */}
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.borda}`, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: C.txt }}>Faturamento diário</div>
                  <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>Últimos 10 dias</div>
                </div>
                <span style={{ fontSize: 11, color: C.laranja, fontWeight: 700, background: C.laranjaLt, padding: '4px 10px', borderRadius: 6 }}>
                  Jun 2026
                </span>
              </div>

              {/* Bar chart SVG-like com divs */}
              <div style={{ height: 130, display: 'flex', alignItems: 'flex-end', gap: 6, paddingBottom: 28 }}>
                {CHART.map((d, i) => {
                  const hPct = Math.round((d.val / maxChart) * 100)
                  const isLast = i === CHART.length - 1
                  return (
                    <div
                      key={d.dia}
                      title={`${d.dia}: R$ ${d.val.toLocaleString('pt-BR')}`}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, height: '100%', justifyContent: 'flex-end' }}
                    >
                      {isLast && (
                        <div style={{ fontSize: 9, fontWeight: 800, color: C.laranja, whiteSpace: 'nowrap', marginBottom: 2 }}>
                          R$ {(d.val / 1000).toFixed(1)}k
                        </div>
                      )}
                      <div style={{ position: 'relative', width: '100%' }}>
                        <div style={{
                          width: '100%',
                          height: `${Math.round((d.val / maxChart) * 100)}px`,
                          background: isLast
                            ? `linear-gradient(180deg, ${C.laranja} 0%, #F59E0B 100%)`
                            : '#EDE9E3',
                          borderRadius: '4px 4px 0 0',
                          minHeight: 4,
                          transition: 'background 0.2s',
                        }} />
                      </div>
                      <div style={{ fontSize: 8, color: C.txtSub, transform: 'rotate(-35deg)', transformOrigin: 'right center', whiteSpace: 'nowrap', marginTop: 2 }}>
                        {d.dia}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Alertas */}
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.borda}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{
                background: '#FFF7ED', borderBottom: `1px solid #FED7AA`,
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, background: '#FFEDD5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 16, flexShrink: 0,
                }}>⚠️</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#9A3412' }}>Estoque crítico</div>
                  <div style={{ fontSize: 11, color: '#C2410C' }}>3 produtos abaixo do mínimo</div>
                </div>
              </div>

              <div style={{ padding: '14px 18px' }}>
                {ALERTAS.map((a, i) => (
                  <div key={a.nome} style={{
                    paddingTop: i > 0 ? 13 : 0,
                    marginTop: i > 0 ? 13 : 0,
                    borderTop: i > 0 ? `1px solid #FEE2E2` : 'none',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'flex-start' }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: C.txt, lineHeight: 1.3, maxWidth: '62%' }}>{a.nome}</span>
                      <span style={{ fontSize: 11, color: C.vermelho, fontWeight: 700, flexShrink: 0 }}>
                        {a.atual} / {a.minimo} {a.unidade}
                      </span>
                    </div>
                    <div style={{ height: 5, background: '#FEE2E2', borderRadius: 99, overflow: 'hidden' }}>
                      <div className="bar-fill" style={{ height: '100%', width: `${a.pct}%`, background: C.vermelho, borderRadius: 99 }} />
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ padding: '4px 18px 16px' }}>
                <Link href="/loja/produtos" style={{
                  display: 'block', padding: '9px',
                  background: C.vermelho, color: '#fff',
                  borderRadius: 9, fontSize: 12, fontWeight: 700,
                  textAlign: 'center', textDecoration: 'none',
                  boxShadow: '0 2px 6px rgba(220,38,38,0.3)',
                }}>
                  Ver todos os produtos →
                </Link>
              </div>
            </div>
          </div>

          {/* ═══ TOP PRODUTOS + ÚLTIMAS VENDAS ═══════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

            {/* Top produtos */}
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.borda}`, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.txtSub }}>
                  Top 5 produtos do mês
                </span>
                <Link href="/loja/estoque" style={{ fontSize: 12, color: C.laranja, fontWeight: 600, textDecoration: 'none' }}>
                  Ver estoque →
                </Link>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {TOP.map((p, i) => (
                  <div key={p.nome}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 24, height: 24, borderRadius: 7,
                          background: i === 0 ? C.laranja : C.borda,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 10, fontWeight: 800,
                          color: i === 0 ? '#fff' : C.cinza,
                          flexShrink: 0,
                        }}>{i + 1}</div>
                        <span style={{ fontSize: 13, fontWeight: 500, color: C.txt }}>{p.nome}</span>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>
                          R$ {p.total.toLocaleString('pt-BR')}
                        </div>
                        <div style={{ fontSize: 10, color: C.txtSub }}>{p.qtd} un</div>
                      </div>
                    </div>
                    <div style={{ height: 5, background: '#F5F5F4', borderRadius: 99, overflow: 'hidden' }}>
                      <div
                        className="bar-fill"
                        style={{ height: '100%', width: `${Math.round((p.total / maxTop) * 100)}%`, background: p.cor, borderRadius: 99 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Últimas vendas */}
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.borda}`, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.txtSub }}>
                  Últimas vendas hoje
                </span>
                <span style={{ fontSize: 11, fontWeight: 600, background: C.verdeLt, color: '#15803D', padding: '3px 9px', borderRadius: 6 }}>
                  22 vendas
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {VENDAS.map(v => (
                  <div
                    key={v.num}
                    className="venda-row"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 11, color: C.txtSub, fontFamily: 'monospace', width: 36, flexShrink: 0 }}>{v.hora}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: C.laranja }}>{v.num}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize: 11, background: v.cor.bg, color: v.cor.txt,
                        padding: '2px 9px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap',
                      }}>{v.forma}</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: C.txt, width: 72, textAlign: 'right', flexShrink: 0 }}>
                        {BRL(v.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ═══ RELATÓRIOS & GESTÃO ═════════════════════════════════════════════ */}
          <div>
            <div style={{
              fontSize: 11, fontWeight: 700, color: C.txtSub,
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12,
            }}>
              Relatórios & Gestão
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(195px, 1fr))', gap: 10 }}>
              {GESTAO.map(item => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="link-card"
                  style={{
                    display: 'flex', flexDirection: 'column', gap: 12,
                    background: '#fff', border: `1px solid ${C.borda}`,
                    borderRadius: 12, padding: '16px 16px', textDecoration: 'none',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: item.cor + '18',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <i className={`ti ${item.icone}`} style={{ fontSize: 19, color: item.cor }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 4 }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: C.txtSub, lineHeight: 1.45 }}>{item.desc}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* ═══ NOTA DE DESIGN ══════════════════════════════════════════════════ */}
          <div style={{
            marginTop: 32, padding: '18px 22px',
            background: '#fff', borderRadius: 14,
            border: `1px solid ${C.borda}`,
            borderLeft: `4px solid ${C.laranja}`,
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.laranja, marginBottom: 10 }}>
              📐 Notas de design — O que muda em relação à versão atual
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 8 }}>
              {[
                'Header fixo com h1 real — âncora visual imediata',
                'KPIs no topo com números grandes (26px bold)',
                'Accent bar colorida por KPI — identidade semântica',
                'Trend badge (+18%, +12%) no card de faturamento',
                'Barra de progresso nos alertas de estoque',
                'Cores distintas por produto no ranking',
                'Pulse animation no indicador de caixa aberto',
                'Cards de Gestão com título + descrição — contexto',
                'Hierarquia tipográfica clara: 26 → 15 → 13 → 11px',
                'Hover suave nos KPIs (translateY -2px)',
              ].map(n => (
                <div key={n} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: C.verde, fontSize: 12, flexShrink: 0, marginTop: 1 }}>✓</span>
                  <span style={{ fontSize: 12, color: C.txtSub, lineHeight: 1.4 }}>{n}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
