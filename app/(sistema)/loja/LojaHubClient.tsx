'use client'

import Link from 'next/link'
import GraficoFaturamento from '@/components/loja/GraficoFaturamento'
import {
  HubStyles, KpiCard, LinkCard, ContentCard, COM_C, HERO,
} from '@/components/nexcoop/ui'

const GESTAO = [
  { label: 'Conta Corrente', desc: 'Consulte saldo financeiro e extrato do cooperado por CPF.', icon: 'ti-wallet', cor: COM_C.azul, corLt: COM_C.azulLt, href: '/loja/conta-corrente' },
  { label: 'Conferência de Caixa', desc: 'Confira e aprove os fechamentos dos operadores de caixa.', icon: 'ti-clipboard-check', cor: COM_C.laranja, corLt: COM_C.laranjaLt, href: '/loja/conferencia' },
  { label: 'Caixas', desc: 'Veja as sessões abertas e fechadas, e force o fechamento.', icon: 'ti-cash-register', cor: COM_C.verde, corLt: COM_C.verdeLt, href: '/loja/caixas' },
  { label: 'Rel. Vendas', desc: 'Histórico e totais de vendas por período e operador.', icon: 'ti-chart-bar', cor: COM_C.azul, corLt: COM_C.azulLt, href: '/loja/relatorios/vendas' },
  { label: 'Rel. Estoque', desc: 'Posição atual, movimentações e histórico de ajustes.', icon: 'ti-packages', cor: COM_C.roxo, corLt: COM_C.roxoLt, href: '/loja/relatorios/estoque' },
  { label: 'Rel. Caixa', desc: 'Faturamento, sangrias e fechamentos por sessão.', icon: 'ti-report-money', cor: COM_C.txtSub, corLt: '#F5F5F4', href: '/loja/relatorios/caixa' },
]

const MODULOS_GUIA = [
  { icone: '🏪', titulo: 'PDV (Caixa)', desc: 'Para registrar uma venda, abra o PDV, adicione os produtos e finalize com o meio de pagamento do cliente. Rápido e simples!' },
  { icone: '📦', titulo: 'Estoque', desc: 'Aqui você acompanha a quantidade de cada produto. Quando um item cair abaixo do mínimo, ele aparece como alerta no painel.' },
  { icone: '🧾', titulo: 'Conferência de Caixa', desc: 'No fim do expediente, o operador fecha o caixa e você faz a conferência. Tudo fica registrado para auditoria.' },
  { icone: '🛒', titulo: 'Compras', desc: 'Sempre que chegar mercadoria, registre a compra aqui. O estoque é atualizado automaticamente com cada entrada.' },
  { icone: '📊', titulo: 'Relatórios', desc: 'Veja o desempenho da loja por período: faturamento, movimentações de estoque e resumos de fechamento de caixa.' },
  { icone: '🏷️', titulo: 'Produtos e Categorias', desc: 'Cadastre produtos, defina preços e estoque mínimo, e organize por categoria. Esse cadastro alimenta diretamente o PDV.' },
]

const FORMA_CORES: Record<string, { bg: string; txt: string }> = {
  especie: { bg: COM_C.verdeLt, txt: '#15803D' },
  pix: { bg: COM_C.azulLt, txt: '#1D4ED8' },
  cartao: { bg: COM_C.roxoLt, txt: '#6D28D9' },
  credito_cooperado: { bg: COM_C.laranjaLt, txt: '#C2410C' },
}

const TOP_CORES = [COM_C.laranja, '#10B981', '#6366F1', '#F97316', '#14B8A6']

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtForma(forma: string) {
  const map: Record<string, string> = {
    especie: 'Dinheiro',
    pix: 'PIX',
    cartao: 'Cartão',
    credito_cooperado: 'Crédito Coop.',
  }
  return map[forma] ?? forma
}

interface HubKpis {
  fatHoje: number
  fatMes: number
  ticketMedio: number
  saldoCaixa: number
  vendasEmConta: number
  transacoesHoje: number
  caixaAberto: boolean
  operadorNome: string | null
  totalCaixasAbertos: number
}

interface AlertaEstoque {
  produto_id: string
  nome: string
  estoque_atual: number
  estoque_minimo: number
  unidade: string
}

interface TopProduto {
  produto_id: string
  nome: string
  total: number
  qtd: number
}

interface UltimaVenda {
  id: string
  num: string
  hora: string
  forma: string
  total: number
}

interface Props {
  hoje: string
  kpis: HubKpis
  alertas: AlertaEstoque[]
  topProdutos: TopProduto[]
  ultimasVendas: UltimaVenda[]
  faturamentoDiario: { label: string; valor: number }[]
  podeVender: boolean
}

export default function LojaHubClient({
  hoje,
  kpis,
  alertas,
  topProdutos,
  ultimasVendas,
  faturamentoDiario,
  podeVender,
}: Props) {
  return (
    <>
      <HubStyles />

      <div style={{
        position: 'sticky', top: 0, zIndex: 10, background: HERO.bg,
        borderBottom: HERO.borda, margin: '0 -2rem 0 -2rem',
      }}>
        <div className="com-page-header" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 9, background: HERO.chip,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <i className="ti ti-building-store" style={{ fontSize: 20, color: HERO.txt }} />
              </div>
              <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: HERO.txt, letterSpacing: '-0.02em' }}>
                Loja Agropecuária
              </h1>
            </div>
            <div className="com-hub-date" style={{ color: HERO.txtSub }}>{hoje}</div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {kpis.caixaAberto ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: COM_C.verdeLt, border: '1px solid #BBF7D0',
                borderRadius: 8, padding: '7px 14px',
              }}>
                <span
                  className="com-dot-pulse"
                  style={{ width: 8, height: 8, borderRadius: '50%', background: COM_C.verde, display: 'inline-block', flexShrink: 0 }}
                />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#15803D' }}>
                  {kpis.totalCaixasAbertos > 1
                    ? `${kpis.totalCaixasAbertos} caixas abertos · ${kpis.operadorNome}`
                    : `Caixa aberto · ${kpis.operadorNome ?? '—'}`}
                </span>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#F5F5F4', border: `1px solid ${COM_C.borda}`,
                borderRadius: 8, padding: '7px 14px',
              }}>
                <span style={{
                  width: 8, height: 8, borderRadius: '50%',
                  border: `2px solid ${COM_C.txtSub}`, display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: COM_C.txtSub }}>Nenhum caixa aberto</span>
              </div>
            )}

            {alertas.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 7,
                background: COM_C.vermelhoLt, border: '1px solid #FECACA',
                borderRadius: 8, padding: '7px 14px',
              }}>
                <i className="ti ti-alert-triangle" style={{ fontSize: 14, color: COM_C.vermelho }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: COM_C.vermelho }}>
                  {alertas.length} {alertas.length === 1 ? 'item crítico' : 'itens críticos'}
                </span>
              </div>
            )}

            {podeVender && (
              <Link
                href="/loja/pdv"
                className="com-btn-cta"
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  background: COM_C.laranja, color: '#fff',
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
      </div>

      <div className="com-hub-content">
        <div className="com-kpi-grid">
          <KpiCard label="Faturamento hoje" value={fmt(kpis.fatHoje)} sub={`${kpis.transacoesHoje} transações hoje`}
            icon="ti-cash" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
          <KpiCard label="Faturamento do mês" value={fmt(kpis.fatMes)} sub="Mês corrente"
            icon="ti-chart-line" cor={COM_C.azul} corLt={COM_C.azulLt} />
          <KpiCard label="Ticket médio" value={fmt(kpis.ticketMedio)} sub="Mês corrente"
            icon="ti-receipt" cor={COM_C.roxo} corLt={COM_C.roxoLt} />
          <KpiCard label="Saldo em caixa" value={fmt(kpis.saldoCaixa)} sub="Estimado (dinheiro + pix)"
            icon="ti-cash-banknote" cor={COM_C.verde} corLt={COM_C.verdeLt} />
          <KpiCard
            label="Estoque crítico"
            value={`${alertas.length} ${alertas.length === 1 ? 'item' : 'itens'}`}
            sub="Abaixo do mínimo"
            icon="ti-alert-triangle"
            cor={alertas.length > 0 ? COM_C.vermelho : COM_C.txtSub}
            corLt={alertas.length > 0 ? COM_C.vermelhoLt : '#F5F5F4'}
          />
          <KpiCard label="Vendas em conta" value={fmt(kpis.vendasEmConta)} sub="Acumulado no mês"
            icon="ti-users" cor={COM_C.txtSub} corLt="#F5F5F4" />
        </div>

        <div className="com-chart-row">
          <ContentCard title="Faturamento diário" subtitle="Últimos 30 dias" padding="22px 24px">
            <GraficoFaturamento dados={faturamentoDiario} />
          </ContentCard>

          {alertas.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{
                background: COM_C.laranjaLt, borderBottom: '1px solid #FED7AA',
                padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 9, background: '#FFEDD5',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <i className="ti ti-alert-triangle" style={{ fontSize: 18, color: COM_C.laranja }} />
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#9A3412' }}>Estoque crítico</div>
                  <div style={{ fontSize: 11, color: '#C2410C' }}>{alertas.length} produto{alertas.length > 1 ? 's' : ''} abaixo do mínimo</div>
                </div>
              </div>
              <div style={{ padding: '14px 18px' }}>
                {alertas.map((a, i) => {
                  const pct = Math.min(100, Math.round((Number(a.estoque_atual) / Number(a.estoque_minimo)) * 100))
                  return (
                    <div key={a.produto_id} style={{
                      paddingTop: i > 0 ? 13 : 0,
                      marginTop: i > 0 ? 13 : 0,
                      borderTop: i > 0 ? '1px solid #FEE2E2' : 'none',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'flex-start' }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: COM_C.txt, lineHeight: 1.3, maxWidth: '62%' }}>{a.nome}</span>
                        <span style={{ fontSize: 11, color: COM_C.vermelho, fontWeight: 700, flexShrink: 0 }}>
                          {Number(a.estoque_atual).toFixed(1)} / {Number(a.estoque_minimo).toFixed(1)} {a.unidade}
                        </span>
                      </div>
                      <div style={{ height: 5, background: '#FEE2E2', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: COM_C.vermelho, borderRadius: 99, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
              <div style={{ padding: '4px 18px 16px' }}>
                <Link href="/loja/produtos" style={{
                  display: 'block', padding: '9px',
                  background: COM_C.vermelho, color: '#fff',
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
              background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`,
              padding: '28px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              display: 'flex', alignItems: 'center', gap: 16,
            }}>
              <i className="ti ti-circle-check" style={{ fontSize: 32, color: COM_C.verde }} />
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#15803D' }}>Estoque ok</div>
                <div style={{ fontSize: 12, color: '#166534', marginTop: 4 }}>Nenhum produto abaixo do mínimo</div>
              </div>
            </div>
          )}
        </div>

        <div className="com-two-col">
          <ContentCard
            title="Top 5 produtos do mês"
            action={
              <Link href="/loja/estoque" style={{ fontSize: 12, color: COM_C.laranja, fontWeight: 600, textDecoration: 'none' }}>
                Ver estoque →
              </Link>
            }
          >
            {topProdutos.length === 0 ? (
              <div style={{ fontSize: 13, color: COM_C.txtSub, textAlign: 'center', padding: '24px 0' }}>
                Nenhuma venda registrada neste mês.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {topProdutos.map((p, i) => {
                  const pct = topProdutos[0].total > 0 ? (p.total / topProdutos[0].total) * 100 : 0
                  return (
                    <div key={p.produto_id}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 7, alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 24, height: 24, borderRadius: 7,
                            background: i === 0 ? COM_C.laranja : COM_C.borda,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 10, fontWeight: 800,
                            color: i === 0 ? '#fff' : COM_C.txtSub,
                            flexShrink: 0,
                          }}>{i + 1}</div>
                          <span style={{ fontSize: 13, fontWeight: 500, color: COM_C.txt }}>{p.nome}</span>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt }}>{fmt(p.total)}</div>
                          <div style={{ fontSize: 10, color: COM_C.txtSub }}>{Number(p.qtd).toFixed(0)} un</div>
                        </div>
                      </div>
                      <div style={{ height: 5, background: '#F5F5F4', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: TOP_CORES[i] ?? COM_C.laranja, borderRadius: 99, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ContentCard>

          <ContentCard
            title="Últimas vendas hoje"
            action={
              kpis.transacoesHoje > 0 ? (
                <span style={{ fontSize: 11, fontWeight: 600, background: COM_C.verdeLt, color: '#15803D', padding: '3px 9px', borderRadius: 6 }}>
                  {kpis.transacoesHoje} vendas
                </span>
              ) : undefined
            }
          >
            {ultimasVendas.length === 0 ? (
              <div style={{ fontSize: 13, color: COM_C.txtSub, textAlign: 'center', padding: '24px 0' }}>
                Nenhuma venda registrada hoje.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {ultimasVendas.map((v) => {
                  const formaCor = FORMA_CORES[v.forma] ?? { bg: '#F5F5F4', txt: COM_C.txtSub }
                  return (
                    <div
                      key={v.id}
                      className="com-venda-row"
                      style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 10px', borderRadius: 8, transition: 'background 0.1s' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 11, color: COM_C.txtSub, fontFamily: 'monospace', width: 36, flexShrink: 0 }}>{v.hora}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: COM_C.laranja }}>{v.num}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{
                          fontSize: 11, background: formaCor.bg, color: formaCor.txt,
                          padding: '2px 9px', borderRadius: 6, fontWeight: 600, whiteSpace: 'nowrap',
                        }}>{fmtForma(v.forma)}</span>
                        <span style={{ fontSize: 13, fontWeight: 800, color: COM_C.txt, width: 72, textAlign: 'right', flexShrink: 0 }}>
                          {fmt(v.total)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </ContentCard>
        </div>

        <p className="com-section-label">Relatórios & Gestão</p>
        <div className="com-link-grid" style={{ marginBottom: 28 }}>
          {GESTAO.map((item) => (
            <LinkCard key={item.href} {...item} />
          ))}
        </div>

        <div className="com-guia-card" style={{ borderLeft: `4px solid ${COM_C.laranja}` }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt, marginBottom: 4 }}>
            Como usar a Loja
          </div>
          <div style={{ fontSize: 12, color: COM_C.txtSub, marginBottom: 20 }}>
            Um guia rápido para cada área do módulo — fique à vontade para explorar!
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 18 }}>
            {MODULOS_GUIA.map((m) => (
              <div key={m.titulo} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10, background: COM_C.laranjaLt,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 17, flexShrink: 0,
                }}>{m.icone}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt, marginBottom: 3 }}>{m.titulo}</div>
                  <div style={{ fontSize: 12, color: COM_C.txtSub, lineHeight: 1.5 }}>{m.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}