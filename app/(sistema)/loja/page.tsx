import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import Link from "next/link"
import { temModulo } from "@/lib/org"
import { podeVerEstoqueLoja, podeVenderLoja } from "@/lib/permissoes"
import GraficoFaturamento from "@/components/loja/GraficoFaturamento"
import {
  getHubKpis,
  getAlertasEstoque,
  getTopProdutos,
  getUltimasVendas,
  getFaturamentoDiario,
} from "@/lib/loja/hub-actions"

export const metadata = { title: "Loja — NexCoop" }
export const dynamic = 'force-dynamic'

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

const GESTAO = [
  { label: 'Conferência de Caixa', desc: 'Confira e aprove os fechamentos dos operadores de caixa.',     icone: 'ti-clipboard-check', cor: C.laranja, href: '/loja/conferencia'       },
  { label: 'Caixas',               desc: 'Veja as sessões abertas e fechadas, e force o fechamento.',     icone: 'ti-cash-register',   cor: C.verde,   href: '/loja/caixas'           },
  { label: 'Rel. Vendas',          desc: 'Histórico e totais de vendas por período e operador.',           icone: 'ti-chart-bar',       cor: C.azul,    href: '/loja/relatorio/vendas' },
  { label: 'Rel. Estoque',         desc: 'Posição atual, movimentações e histórico de ajustes.',           icone: 'ti-packages',        cor: C.roxo,    href: '/loja/relatorio/estoque'},
  { label: 'Rel. Caixa',           desc: 'Faturamento, sangrias e fechamentos por sessão.',                icone: 'ti-report-money',    cor: C.cinza,   href: '/loja/relatorio/caixa'  },
]

const MODULOS_GUIA = [
  { icone: '🏪', titulo: 'PDV (Caixa)',            desc: 'Para registrar uma venda, abra o PDV, adicione os produtos e finalize com o meio de pagamento do cliente. Rápido e simples!'       },
  { icone: '📦', titulo: 'Estoque',                desc: 'Aqui você acompanha a quantidade de cada produto. Quando um item cair abaixo do mínimo, ele aparece como alerta no painel.'       },
  { icone: '🧾', titulo: 'Conferência de Caixa',   desc: 'No fim do expediente, o operador fecha o caixa e você faz a conferência. Tudo fica registrado para auditoria.'                   },
  { icone: '🛒', titulo: 'Compras',                desc: 'Sempre que chegar mercadoria, registre a compra aqui. O estoque é atualizado automaticamente com cada entrada.'                   },
  { icone: '📊', titulo: 'Relatórios',             desc: 'Veja o desempenho da loja por período: faturamento, movimentações de estoque e resumos de fechamento de caixa.'                  },
  { icone: '🏷️', titulo: 'Produtos e Categorias', desc: 'Cadastre produtos, defina preços e estoque mínimo, e organize por categoria. Esse cadastro alimenta diretamente o PDV.'           },
]

const FORMA_CORES: Record<string, { bg: string; txt: string }> = {
  especie:           { bg: C.verdeLt,   txt: '#15803D' },
  pix:               { bg: C.azulLt,    txt: '#1D4ED8' },
  cartao:            { bg: C.roxoLt,    txt: '#6D28D9' },
  credito_cooperado: { bg: C.laranjaLt, txt: '#C2410C' },
}

const TOP_CORES = [C.laranja, '#10B981', '#6366F1', '#F97316', '#14B8A6']

function fmt(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
}

function fmtForma(forma: string) {
  const map: Record<string, string> = {
    especie:           "Dinheiro",
    pix:               "PIX",
    cartao:            "Cartão",
    credito_cooperado: "Crédito Coop.",
  }
  return map[forma] ?? forma
}

export default async function LojaHubPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const { data: usuario } = await supabase
    .from("usuarios")
    .select("organizacao_id, nome_completo, role, funcoes, organizacoes(modulos_ativos)")
    .eq("id", user.id)
    .single()

  if (!usuario) redirect("/login")

  const orgRaw = usuario.organizacoes as any
  const org = Array.isArray(orgRaw) ? orgRaw[0] : orgRaw
  if (!temModulo(org?.modulos_ativos, "loja")) redirect("/dashboard")

  const up = { role: usuario.role ?? "", funcoes: (usuario.funcoes ?? []) as string[] }
  if (!podeVerEstoqueLoja(up) && !podeVenderLoja(up)) redirect("/dashboard")

  const orgId = usuario.organizacao_id as string

  const [kpis, alertas, topProdutos, ultimasVendas, faturamentoDiario] = await Promise.all([
    getHubKpis(orgId),
    getAlertasEstoque(orgId),
    getTopProdutos(orgId),
    getUltimasVendas(orgId),
    getFaturamentoDiario(orgId),
  ])

  const hoje = new Date().toLocaleDateString("pt-BR", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  })

  const kpiCards = [
    { label: "Faturamento hoje",   value: fmt(kpis.fatHoje),       sub: `${kpis.transacoesHoje} transações hoje`,  icon: "💰", cor: C.laranja,                                        corLt: C.laranjaLt  },
    { label: "Faturamento do mês", value: fmt(kpis.fatMes),        sub: "Mês corrente",                            icon: "📈", cor: C.azul,                                           corLt: C.azulLt     },
    { label: "Ticket médio",       value: fmt(kpis.ticketMedio),   sub: "Mês corrente",                            icon: "🧾", cor: C.roxo,                                           corLt: C.roxoLt     },
    { label: "Saldo em caixa",     value: fmt(kpis.saldoCaixa),    sub: "Estimado (dinheiro + pix)",               icon: "💵", cor: C.verde,                                          corLt: C.verdeLt    },
    { label: "Estoque crítico",    value: `${alertas.length} ${alertas.length === 1 ? "item" : "itens"}`, sub: "Abaixo do mínimo", icon: "⚠️", cor: alertas.length > 0 ? C.vermelho : C.cinza, corLt: alertas.length > 0 ? C.vermelhoLt : C.cinzaLt },
    { label: "Vendas em conta",    value: fmt(kpis.vendasEmConta), sub: "Acumulado no mês",                        icon: "🤝", cor: C.cinza,                                          corLt: C.cinzaLt    },
  ]

  return (
    <>
      <style>{`
        @keyframes pulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(22,163,74,0.5); }
          50%      { box-shadow: 0 0 0 6px rgba(22,163,74,0); }
        }
        .dot-pulse { animation: pulse 2s ease-in-out infinite; }
        .kpi-card { transition: transform 0.15s ease, box-shadow 0.15s ease; cursor: default; }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.07) !important; }
        .link-card { transition: border-color 0.15s, box-shadow 0.15s; }
        .link-card:hover { border-color: #E07B30 !important; box-shadow: 0 4px 12px rgba(224,123,48,0.12); }
        .venda-row { transition: background 0.1s; border-radius: 8px; }
        .venda-row:hover { background: #FAFAF9 !important; }
        .bar-fill { transition: width 0.5s ease; }
        .btn-pdv { transition: opacity 0.15s, transform 0.1s; }
        .btn-pdv:hover { opacity: 0.92; transform: translateY(-1px); }
      `}</style>

      <div style={{ margin: '-2rem', background: C.bg, minHeight: '100vh' }}>

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
            <div style={{ fontSize: 12, color: C.txtSub, paddingLeft: 46 }}>{hoje}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {kpis.caixaAberto ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.verdeLt, border: `1px solid #BBF7D0`,
                borderRadius: 8, padding: '7px 14px',
              }}>
                <span
                  className="dot-pulse"
                  style={{ width: 8, height: 8, borderRadius: '50%', background: C.verde, display: 'inline-block', flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#15803D' }}>
                  {(kpis as any).totalCaixasAbertos > 1
                    ? `${(kpis as any).totalCaixasAbertos} caixas abertos · ${kpis.operadorNome}`
                    : `Caixa aberto · ${kpis.operadorNome ?? "—"}`}
                </span>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: C.cinzaLt, border: `1px solid ${C.borda}`,
                borderRadius: 8, padding: '7px 14px',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  border: `2px solid ${C.cinza}`, display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: C.cinza }}>Nenhum caixa aberto</span>
              </div>
            )}

            {alertas.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: C.vermelhoLt, border: `1px solid #FECACA`,
                borderRadius: 8, padding: '7px 14px',
              }}>
                <span style={{ fontSize: 13 }}>⚠️</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.vermelho }}>
                  {alertas.length} {alertas.length === 1 ? 'item crítico' : 'itens críticos'}
                </span>
              </div>
            )}

            {podeVenderLoja(up) && (
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
            )}
          </div>
        </div>

        <div style={{ padding: '28px 32px', maxWidth: 1200 }}>

          {/* ═══ KPI CARDS ═══════════════════════════════════════════════════════ */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
            gap: 12, marginBottom: 24,
          }}>
            {kpiCards.map(k => (
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
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                  background: k.cor, borderRadius: '14px 14px 0 0',
                }} />
                <div style={{ marginBottom: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: k.corLt,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 19,
                  }}>{k.icon}</div>
                </div>
                <div style={{
                  fontSize: 26, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 5,
                  color: k.label === 'Estoque crítico' && alertas.length > 0 ? C.vermelho : C.txt,
                }}>
                  {k.value}
                </div>
                <div style={{ fontSize: 12, color: C.txtSub, fontWeight: 500 }}>{k.label}</div>
                <div style={{ fontSize: 10, color: '#A8A29E', marginTop: 2 }}>{k.sub}</div>
              </div>
            ))}
          </div>

          {/* ═══ GRÁFICO + ALERTAS ═══════════════════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, marginBottom: 24 }}>

            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.borda}`, padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: C.txt }}>Faturamento diário</div>
                <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>Últimos 30 dias</div>
              </div>
              <GraficoFaturamento dados={faturamentoDiario} />
            </div>

            {alertas.length > 0 ? (
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
                    <div style={{ fontSize: 11, color: '#C2410C' }}>{alertas.length} produto{alertas.length > 1 ? 's' : ''} abaixo do mínimo</div>
                  </div>
                </div>
                <div style={{ padding: '14px 18px' }}>
                  {alertas.map((a: any, i: number) => {
                    const pct = Math.min(100, Math.round((Number(a.estoque_atual) / Number(a.estoque_minimo)) * 100))
                    return (
                      <div key={a.produto_id} style={{
                        paddingTop: i > 0 ? 13 : 0,
                        marginTop: i > 0 ? 13 : 0,
                        borderTop: i > 0 ? `1px solid #FEE2E2` : 'none',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'flex-start' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: C.txt, lineHeight: 1.3, maxWidth: '62%' }}>{a.nome}</span>
                          <span style={{ fontSize: 11, color: C.vermelho, fontWeight: 700, flexShrink: 0 }}>
                            {Number(a.estoque_atual).toFixed(1)} / {Number(a.estoque_minimo).toFixed(1)} {a.unidade}
                          </span>
                        </div>
                        <div style={{ height: 5, background: '#FEE2E2', borderRadius: 99, overflow: 'hidden' }}>
                          <div className="bar-fill" style={{ height: '100%', width: `${pct}%`, background: C.vermelho, borderRadius: 99 }} />
                        </div>
                      </div>
                    )
                  })}
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
            ) : (
              <div style={{
                background: '#fff', borderRadius: 14, border: `1px solid ${C.borda}`,
                padding: '28px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <div style={{ fontSize: 32 }}>✅</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>Estoque ok</div>
                  <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>Nenhum produto abaixo do mínimo</div>
                </div>
              </div>
            )}
          </div>

          {/* ═══ TOP PRODUTOS + ÚLTIMAS VENDAS ═══════════════════════════════════ */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.borda}`, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.txtSub }}>
                  Top 5 produtos do mês
                </span>
                <Link href="/loja/estoque" style={{ fontSize: 12, color: C.laranja, fontWeight: 600, textDecoration: 'none' }}>
                  Ver estoque →
                </Link>
              </div>
              {topProdutos.length === 0 ? (
                <div style={{ fontSize: 13, color: C.txtSub, textAlign: 'center', padding: '24px 0' }}>
                  Nenhuma venda registrada neste mês.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {topProdutos.map((p: any, i: number) => {
                    const pct = topProdutos[0].total > 0 ? (p.total / topProdutos[0].total) * 100 : 0
                    return (
                      <div key={p.produto_id}>
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
                            <div style={{ fontSize: 13, fontWeight: 700, color: C.txt }}>{fmt(p.total)}</div>
                            <div style={{ fontSize: 10, color: C.txtSub }}>{Number(p.qtd).toFixed(0)} un</div>
                          </div>
                        </div>
                        <div style={{ height: 5, background: '#F5F5F4', borderRadius: 99, overflow: 'hidden' }}>
                          <div
                            className="bar-fill"
                            style={{ height: '100%', width: `${pct}%`, background: TOP_CORES[i] ?? C.laranja, borderRadius: 99 }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${C.borda}`, padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: C.txtSub }}>
                  Últimas vendas hoje
                </span>
                {kpis.transacoesHoje > 0 && (
                  <span style={{ fontSize: 11, fontWeight: 600, background: C.verdeLt, color: '#15803D', padding: '3px 9px', borderRadius: 6 }}>
                    {kpis.transacoesHoje} vendas
                  </span>
                )}
              </div>
              {ultimasVendas.length === 0 ? (
                <div style={{ fontSize: 13, color: C.txtSub, textAlign: 'center', padding: '24px 0' }}>
                  Nenhuma venda registrada hoje.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {ultimasVendas.map((v: any) => {
                    const formaCor = FORMA_CORES[v.forma] ?? { bg: C.cinzaLt, txt: C.cinza }
                    return (
                      <div
                        key={v.id}
                        className="venda-row"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontSize: 11, color: C.txtSub, fontFamily: 'monospace', width: 36, flexShrink: 0 }}>{v.hora}</span>
                          <span style={{ fontSize: 12, fontWeight: 700, color: C.laranja }}>{v.num}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <span style={{
                            fontSize: 11, background: formaCor.bg, color: formaCor.txt,
                            padding: '2px 9px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap',
                          }}>{fmtForma(v.forma)}</span>
                          <span style={{ fontSize: 13, fontWeight: 800, color: C.txt, width: 72, textAlign: 'right', flexShrink: 0 }}>
                            {fmt(v.total)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ═══ RELATÓRIOS & GESTÃO ═════════════════════════════════════════════ */}
          <div style={{ marginBottom: 32 }}>
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
                    borderRadius: 12, padding: '16px', textDecoration: 'none',
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

          {/* ═══ COMO USAR A LOJA ════════════════════════════════════════════════ */}
          <div style={{
            padding: '20px 24px',
            background: '#fff', borderRadius: 14,
            border: `1px solid ${C.borda}`,
            borderLeft: `4px solid ${C.laranja}`,
            boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 4 }}>
              Como usar a Loja
            </div>
            <div style={{ fontSize: 12, color: C.txtSub, marginBottom: 20 }}>
              Um guia rápido para cada área do módulo — fique à vontade para explorar!
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
              {MODULOS_GUIA.map(m => (
                <div key={m.titulo} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, background: C.laranjaLt,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 17, flexShrink: 0,
                  }}>{m.icone}</div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: C.txt, marginBottom: 3 }}>{m.titulo}</div>
                    <div style={{ fontSize: 12, color: C.txtSub, lineHeight: 1.5 }}>{m.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </>
  )
}
