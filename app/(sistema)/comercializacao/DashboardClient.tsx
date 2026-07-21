'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getDashboardComercializacao } from '@/lib/comercializacao/dashboard'
import type { getCacauAOrdem } from '@/lib/comercializacao/cacau-a-ordem'
import { criarSolicitacaoAporte } from '@/lib/comercializacao/aportes'
import { abrirCaixa, getMeuSaldoResponsabilidadeComercializacao } from '@/lib/comercializacao/caixa.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { mesLabel } from '@/lib/comercializacao/saidas-caixa-utils'
import { Btn, BtnLink } from '@/components/ui/Btn'
import { COM_C, HERO } from '@/components/comercializacao/ui/tokens'
import { HubStyles } from '@/components/comercializacao/ui/HubStyles'
import { KpiCard } from '@/components/comercializacao/ui/KpiCard'
import { LinkCard } from '@/components/comercializacao/ui/LinkCard'
import GraficoEntregas from '@/components/comercializacao/ui/GraficoEntregas'

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtKg(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} t`
  return `${fmt(n)} kg`
}

// Formatação determinística de kg (3 casas), sem toLocaleString — evita
// divergência de hidratação entre server e client. Ex.: 758.25 → "758,250 kg".
function fmtKgExato(n: number) {
  const gramas = Math.round(Math.abs(n) * 1000)
  const inteiro = Math.floor(gramas / 1000)
  const frac = String(gramas % 1000).padStart(3, '0')
  const intFmt = String(inteiro).replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${n < 0 ? '-' : ''}${intFmt},${frac} kg`
}

const GUIA = [
  { icone: '📦', titulo: 'Entrega', desc: 'Produtor entrega cacau no caixa. O sistema registra kg na conta dele.' },
  { icone: '💰', titulo: 'Conversão', desc: 'Produtor converte kg em dinheiro (espécie ou Pix) na cotação do dia.' },
  { icone: '📋', titulo: 'Lote', desc: 'Admin agrupa entregas em lotes para venda e emissão de NF-e de saída.' },
  { icone: '🧾', titulo: 'Fiscal', desc: 'NF-e de entrada por produtor e saída por lote, integrada ao Focus NFe.' },
]

export default function DashboardComercializacao({
  data: d,
  cacauAOrdem,
  organizacaoId,
}: {
  data: Awaited<ReturnType<typeof getDashboardComercializacao>>
  cacauAOrdem: Awaited<ReturnType<typeof getCacauAOrdem>>
  organizacaoId: string
}) {
  const router = useRouter()
  const cacauAreaRef = useRef<HTMLDivElement>(null)
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false)
  const [saldoHerdado, setSaldoHerdado] = useState<number | null>(null)
  const [abrindoCaixa, setAbrindoCaixa] = useState(false)
  const [modalAporte, setModalAporte] = useState(false)
  const [valorAporte, setValorAporte] = useState('')
  const [motivoAporte, setMotivoAporte] = useState('')
  const [enviandoAporte, setEnviandoAporte] = useState(false)
  const [aporteEnviado, setAporteEnviado] = useState(false)

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
  const hojeKey = new Date().toISOString().slice(0, 10)
  const caixaAberto = d.sessoesAbertas.length > 0
  const agora = new Date()

  const graficoDados = d.entregasSemana.map((e) => ({
    label: e.dia === hojeKey ? 'hj' : DIAS_SEMANA[new Date(e.dia + 'T12:00:00').getDay()],
    valor: e.totalKg,
  }))

  const operacaoCards = [
    { href: '/comercializacao/caixa', label: 'Caixa Cacau', desc: 'Entregas, conversões, saques e fechamento do dia.', icon: 'ti-wallet', cor: COM_C.marrom, corLt: COM_C.marromLt },
    { href: '/comercializacao/produtores', label: 'Produtores', desc: 'Cadastro, contas e histórico de cada produtor.', icon: 'ti-users', cor: COM_C.roxo, corLt: COM_C.roxoLt },
    { href: '/comercializacao/lotes', label: 'Lotes', desc: 'Agrupar entregas, fechar e emitir NF-e de saída.', icon: 'ti-stack-2', cor: COM_C.laranja, corLt: COM_C.laranjaLt },
  ]

  const gestaoCards = d.isAdmin ? [
    { href: '/comercializacao/cotacoes', label: 'Cotações', desc: 'Preço do dia por produto e safra.', icon: 'ti-chart-line', cor: COM_C.azul, corLt: COM_C.azulLt },
    { href: '/comercializacao/compradores', label: 'Compradores', desc: 'Clientes e empresas que compram os lotes.', icon: 'ti-building-store', cor: COM_C.verde, corLt: COM_C.verdeLt },
    { href: '/comercializacao/distribuicao', label: 'Distribuição', desc: 'Pagamentos e rateio por produtor.', icon: 'ti-arrows-split', cor: COM_C.roxo, corLt: COM_C.roxoLt },
    { href: '/comercializacao/diario', label: 'Diário de Caixa', desc: 'Registro contábil das movimentações.', icon: 'ti-notebook', cor: COM_C.txtSub, corLt: '#F5F5F4' },
    { href: '/comercializacao/caixas', label: 'Gestão de Caixas', desc: 'Sessões abertas, histórico e fechamento forçado.', icon: 'ti-cash-register', cor: COM_C.verde, corLt: COM_C.verdeLt },
    { href: '/comercializacao/resultado', label: 'Resultado Safra', desc: 'Receita, custo e margem por safra.', icon: 'ti-chart-bar', cor: COM_C.azul, corLt: COM_C.azulLt },
  ] : []

  const fiscalCards = [
    { href: '/comercializacao/fiscal', label: 'Documentos Fiscais', desc: 'NF-e entrada, saída e devoluções.', icon: 'ti-file-invoice', cor: COM_C.marrom, corLt: COM_C.marromLt },
    { href: '/comercializacao/painel', label: 'Painel de Mercado', desc: 'Cotações externas e indicadores.', icon: 'ti-chart-dots', cor: COM_C.azul, corLt: COM_C.azulLt },
    { href: '/comercializacao/boletim-preview', label: 'Boletim Cacau (prévia)', desc: 'Modelo visual do boletim ANPC — temporário.', icon: 'ti-report-analytics', cor: COM_C.verde, corLt: COM_C.verdeLt },
  ]

  async function abrirModalAbrirCaixa() {
    setModalAbrirCaixa(true)
    const resp = await getMeuSaldoResponsabilidadeComercializacao()
    setSaldoHerdado(resp.saldo_atual_especie)
  }

  async function handleAbrirCaixa() {
    setAbrindoCaixa(true)
    try {
      await abrirCaixa()
      setModalAbrirCaixa(false)
      setSaldoHerdado(null)
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setAbrindoCaixa(false)
    }
  }

  async function handleSolicitarAporte() {
    if (!d.minhaSessao || !valorAporte || Number(valorAporte) <= 0) return
    setEnviandoAporte(true)
    try {
      await criarSolicitacaoAporte(organizacaoId, d.minhaSessao.id, Number(valorAporte), motivoAporte)
      setAporteEnviado(true)
    } catch {
      alert('Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setEnviandoAporte(false)
    }
  }

  const saldoKpi = () => {
    if (d.sessoesAbertas.length === 0) {
      return {
        value: d.ultimoFechamento ? fmtReal(d.ultimoFechamento.saldo) : '—',
        sub: d.ultimoFechamento
          ? `Últ. fechamento · ${new Date(d.ultimoFechamento.fechamento).toLocaleDateString('pt-BR')}`
          : 'Nenhum fechamento registrado',
        extra: !caixaAberto ? (
          <Btn variante="marrom" tamanho="sm" icone="ti-lock-open" onClick={() => abrirModalAbrirCaixa()}>
            Abrir caixa
          </Btn>
        ) : undefined,
      }
    }
    if (d.sessoesAbertas.length === 1) {
      return {
        value: fmtReal(d.sessoesAbertas[0].saldoCalculado),
        sub: d.sessoesAbertas[0].operador,
        extra: d.minhaSessao ? (
          <Btn variante="verde" tamanho="sm" icone="ti-plus" onClick={() => setModalAporte(true)}>
            Solicitar aporte
          </Btn>
        ) : undefined,
      }
    }
    return {
      value: `${d.sessoesAbertas.length} abertos`,
      sub: 'Múltiplos operadores',
      extra: undefined,
    }
  }

  const saldo = saldoKpi()

  return (
    <>
      <HubStyles />

      {/* Header */}
      <div className="nxc-bleed-x" style={{
        position: 'sticky', top: 0, zIndex: 10, background: HERO.bg,
        borderBottom: HERO.borda,
      }}>
        <div className="com-page-header" style={{ justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
            <div className="com-page-header-icon" style={{
              width: 36, height: 36, borderRadius: 9, background: HERO.chip,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <i className="ti ti-plant-2" style={{ fontSize: 20, color: HERO.txt }} />
            </div>
            <div style={{ minWidth: 0 }}>
              <h1 className="com-page-title" style={{ margin: 0, fontSize: 19, fontWeight: 800, color: HERO.txt, letterSpacing: '-0.02em' }}>
                Comercialização
              </h1>
              <div className="com-hub-date" style={{ color: HERO.txtSub, paddingLeft: 0 }}>{hoje}</div>
            </div>
          </div>

          <div className="com-page-actions" style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', flexShrink: 0 }}>
            {caixaAberto ? (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: COM_C.verdeLt, border: '1px solid #BBF7D0',
                borderRadius: 8, padding: '7px 14px',
              }}>
                <span className="com-dot-pulse" style={{
                  width: 8, height: 8, borderRadius: '50%', background: COM_C.verde,
                  display: 'inline-block', flexShrink: 0,
                }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#15803D' }}>
                  {d.sessoesAbertas.length > 1
                    ? `${d.sessoesAbertas.length} caixas abertos`
                    : `Caixa aberto · ${d.sessoesAbertas[0]?.operador ?? '—'}`}
                </span>
              </div>
            ) : (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: '#F5F5F4', border: `1px solid ${COM_C.borda}`,
                borderRadius: 8, padding: '7px 14px',
              }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', border: `2px solid ${COM_C.txtSub}`, display: 'inline-block' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: COM_C.txtSub }}>Caixa fechado</span>
              </div>
            )}

            <Link
              href="/comercializacao/caixa"
              className="com-btn-cta"
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: COM_C.marrom, color: '#fff',
                borderRadius: 9, padding: '9px 18px',
                textDecoration: 'none', fontSize: 13, fontWeight: 700,
                boxShadow: '0 2px 8px rgba(146,64,14,0.35)',
              }}
            >
              <i className="ti ti-wallet" style={{ fontSize: 15 }} />
              {caixaAberto ? 'Ir para o Caixa' : 'Abrir Caixa'}
            </Link>
          </div>
        </div>
      </div>

      <div className="com-hub-content">

        {/* KPIs */}
        <div className="com-kpi-grid">
          <KpiCard label="Entregas hoje" value={fmt(d.entregasHoje.count)} sub={`${fmtKg(d.entregasHoje.totalKg)} recebidos`}
            icon="ti-package-import" cor={COM_C.marrom} corLt={COM_C.marromLt} />
          <KpiCard label={d.isAdmin && d.sessoesAbertas.length > 1 ? 'Caixas abertos' : 'Saldo em caixa'}
            value={saldo.value} sub={saldo.sub} icon="ti-cash" cor={COM_C.verde} corLt={COM_C.verdeLt}>
            {saldo.extra}
          </KpiCard>
          <KpiCard label="Produtores hoje" value={fmt(d.produtoresHoje)} sub={`de ${fmt(d.totalProdutores)} cadastrados`}
            icon="ti-users" cor={COM_C.roxo} corLt={COM_C.roxoLt} />
          <KpiCard label="Lotes abertos" value={fmt(d.lotesAbertos)} sub="aguardando venda"
            icon="ti-box" cor={COM_C.laranja} corLt={COM_C.laranjaLt} />
          <KpiCard label="Pagamentos a produtores" value={fmtReal(d.pagamentosProdutoresMes.total)}
            sub={`${mesLabel(agora.getMonth() + 1, agora.getFullYear())} · ${d.pagamentosProdutoresMes.count} pagamento${d.pagamentosProdutoresMes.count === 1 ? '' : 's'}`}
            icon="ti-report-money" cor={COM_C.azul} corLt={COM_C.azulLt}
            onClick={() => router.push('/comercializacao/relatorios/saidas-caixa')} />
          <KpiCard label="Qtd. Cacau à ordem" value={fmtKgExato(cacauAOrdem.saldo_total_kg)}
            sub={cacauAOrdem.produtores.length > 0 ? `${fmt(cacauAOrdem.produtores.length)} produtor${cacauAOrdem.produtores.length > 1 ? 'es' : ''} · ver detalhe` : 'aguardando conversão'}
            icon="ti-basket" cor={COM_C.marrom} corLt={COM_C.marromLt}
            onClick={() => cacauAreaRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })} />
        </div>

        {/* Alerta aportes */}
        {d.isAdmin && d.solicitacoesPendentes.length > 0 && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12,
            padding: '14px 18px', marginBottom: 24, display: 'flex', gap: 12,
          }}>
            <i className="ti ti-alert-triangle" style={{ fontSize: 20, color: '#D97706', flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: COM_C.marromDk, margin: '0 0 6px' }}>
                {d.solicitacoesPendentes.length} solicitação{d.solicitacoesPendentes.length > 1 ? 'ões' : ''} de aporte pendente{d.solicitacoesPendentes.length > 1 ? 's' : ''}
              </p>
              {d.solicitacoesPendentes.map((s) => (
                <p key={s.id} style={{ fontSize: 12, color: '#78350f', margin: '2px 0' }}>
                  {s.operador} · {fmtReal(s.valor)}{s.motivo ? ` — ${s.motivo}` : ''}
                </p>
              ))}
              <BtnLink href="/comercializacao/caixa" variante="marrom-outline" tamanho="sm" style={{ marginTop: 8 }}>
                Registrar na tela de caixa →
              </BtnLink>
            </div>
          </div>
        )}

        {/* Navegação — Operação */}
        <p className="com-section-label">Operação</p>
        <div className="com-link-grid" style={{ marginBottom: 28 }}>
          {operacaoCards.map((c) => (
            <LinkCard key={c.href} {...c} />
          ))}
        </div>

        {/* Gráfico + Sessão */}
        <div className="com-chart-row">
          <div style={{
            background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`,
            padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: COM_C.txt }}>Entregas — últimos 7 dias</div>
              <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>Volume em kg por dia</div>
            </div>
            <GraficoEntregas dados={graficoDados} />
          </div>

          <div style={{
            background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`,
            padding: '22px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
          }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: COM_C.txt, marginBottom: 16 }}>Sessão de caixa</div>
            {!d.minhaSessao ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔒</div>
                <p style={{ fontSize: 13, color: COM_C.txtSub, margin: '0 0 14px' }}>Nenhuma sessão aberta para você</p>
                <Btn variante="marrom" icone="ti-lock-open" onClick={() => abrirModalAbrirCaixa()}>Abrir caixa</Btn>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Aportes', valor: d.minhaSessao.aportes, positivo: true },
                  { label: 'Sangrias', valor: d.minhaSessao.sangrias, positivo: false },
                ].map((r) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, color: COM_C.txtSub }}>{r.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: r.positivo ? COM_C.verde : COM_C.vermelho }}>
                      {r.positivo ? '+' : '−'} {fmtReal(r.valor ?? 0)}
                    </span>
                  </div>
                ))}
                <hr style={{ border: 'none', borderTop: `1px solid ${COM_C.borda}`, margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt }}>Saldo atual</span>
                  <span style={{ fontSize: 18, fontWeight: 800, color: COM_C.txt, fontVariantNumeric: 'tabular-nums' }}>
                    {fmtReal(d.minhaSessao.saldoCalculado)}
                  </span>
                </div>
                <BtnLink href="/comercializacao/caixa" variante="marrom" style={{ width: '100%', justifyContent: 'center', marginTop: 6 }}>
                  Ver caixa completo →
                </BtnLink>
              </div>
            )}
          </div>
        </div>

        {/* Gestão (admin) */}
        {gestaoCards.length > 0 && (
          <>
            <p className="com-section-label">Gestão</p>
            <div className="com-link-grid" style={{ marginBottom: 28 }}>
              {gestaoCards.map((c) => (
                <LinkCard key={c.href} {...c} />
              ))}
            </div>
          </>
        )}

        {/* Fiscal */}
        <p className="com-section-label">Fiscal e mercado</p>
        <div className="com-link-grid" style={{ marginBottom: 28 }}>
          {fiscalCards.map((c) => (
            <LinkCard key={c.href} {...c} />
          ))}
        </div>

        {/* Últimas entregas + Cacau à ordem */}
        <div className="com-two-col">
          {d.ultimasEntregas.length > 0 && (
            <div style={{
              background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`,
              padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: COM_C.txtSub, marginBottom: 14 }}>
                Últimas entregas
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Produtor', 'Kg', 'Horário'].map((h, i) => (
                      <th key={h} style={{
                        fontSize: 10, color: COM_C.txtSub, fontWeight: 700,
                        textAlign: i > 0 ? 'right' : 'left',
                        padding: '0 0 8px', borderBottom: `1px solid ${COM_C.borda}`,
                        textTransform: 'uppercase',
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.ultimasEntregas.map((e, i) => (
                    <tr key={i} className="com-venda-row">
                      <td style={{ padding: '9px 0', borderBottom: '1px solid #f5f5f4', color: COM_C.txt }}>
                        <div style={{ fontWeight: 600, fontSize: 12 }}>{e.produtor}</div>
                        <div style={{ fontSize: 11, color: COM_C.txtSub }}>{e.produto}</div>
                      </td>
                      <td style={{ padding: '9px 0', borderBottom: '1px solid #f5f5f4', textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                        {fmtKg(e.kg)}
                      </td>
                      <td style={{ padding: '9px 0', borderBottom: '1px solid #f5f5f4', textAlign: 'right', color: COM_C.txtSub, fontSize: 12 }}>
                        {e.horario}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Cacau à ordem — área detalhada por produtor (alvo do clique no KPI) */}
          <div
            ref={cacauAreaRef}
            style={{
              background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`,
              borderTop: `3px solid ${COM_C.marrom}`, boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              padding: '20px 22px', scrollMarginTop: 100,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <i className="ti ti-basket" style={{ fontSize: 18, color: COM_C.marrom }} />
                  <span style={{ fontSize: 15, fontWeight: 700, color: COM_C.txt }}>Cacau à ordem por produtor</span>
                </div>
                <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 3 }}>
                  Cacau entregue à cooperativa e ainda não convertido em dinheiro.
                </div>
              </div>
              <div style={{
                background: COM_C.marromLt, color: COM_C.marromDk, borderRadius: 9,
                padding: '8px 14px', fontSize: 15, fontWeight: 800, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap',
              }}>
                {fmtKgExato(cacauAOrdem.saldo_total_kg)}
              </div>
            </div>

            {cacauAOrdem.produtores.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: COM_C.txtSub }}>
                <div style={{ fontSize: 30, marginBottom: 8 }}>✅</div>
                <p style={{ fontSize: 13, margin: 0 }}>Nenhum produtor com cacau à ordem no momento.</p>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr>
                    {['Produtor', 'Kg à ordem', ''].map((h, i) => (
                      <th key={i} style={{
                        fontSize: 10, color: COM_C.txtSub, fontWeight: 700,
                        textAlign: i === 1 ? 'right' : 'left',
                        padding: '0 0 8px', borderBottom: `1px solid ${COM_C.borda}`,
                        textTransform: 'uppercase', width: i === 2 ? 24 : undefined,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cacauAOrdem.produtores.map((p) => (
                    <tr
                      key={p.produtor_id}
                      className="com-venda-row"
                      style={{ cursor: 'pointer' }}
                      onClick={() => router.push(`/comercializacao/produtores/${p.produtor_id}`)}
                    >
                      <td style={{ padding: '11px 0', borderBottom: '1px solid #f5f5f4', color: COM_C.txt, fontWeight: 600 }}>
                        {p.nome}
                      </td>
                      <td style={{ padding: '11px 0', borderBottom: '1px solid #f5f5f4', textAlign: 'right', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: COM_C.txt }}>
                        {fmtKgExato(p.saldo_kg)}
                      </td>
                      <td style={{ padding: '11px 0', borderBottom: '1px solid #f5f5f4', textAlign: 'right', color: COM_C.txtSub }}>
                        <i className="ti ti-chevron-right" style={{ fontSize: 15 }} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Orientações de usabilidade — como funciona o fluxo */}
        <div style={{
          background: '#fff', borderRadius: 14, border: `1px solid ${COM_C.borda}`,
          padding: '20px 22px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: COM_C.txtSub, marginBottom: 14 }}>
            Orientações de usabilidade
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
            {GUIA.map((g, i) => (
              <div key={g.titulo} className="com-guia-card" style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: 8, background: COM_C.marromLt,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 800, color: COM_C.marrom, flexShrink: 0,
                }}>{i + 1}</div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt, marginBottom: 3 }}>
                    {g.icone} {g.titulo}
                  </div>
                  <div style={{ fontSize: 12, color: COM_C.txtSub, lineHeight: 1.45 }}>{g.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal abrir caixa */}
      {modalAbrirCaixa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 6px', color: COM_C.txt }}>Abrir caixa</h2>
            <p style={{ fontSize: 13, color: COM_C.txtSub, margin: '0 0 20px' }}>Saldo calculado automaticamente pelo sistema.</p>
            <label style={{ fontSize: 12, color: COM_C.txtSub, display: 'block', marginBottom: 6 }}>Saldo anterior</label>
            <div style={{ fontSize: 20, fontWeight: 700, color: COM_C.marrom, marginBottom: 20 }}>
              {saldoHerdado === null ? '...' : fmtReal(saldoHerdado)}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variante="cinza" onClick={() => { setModalAbrirCaixa(false); setSaldoHerdado(null) }}>Cancelar</Btn>
              <Btn variante="marrom" icone="ti-check" disabled={abrindoCaixa} onClick={handleAbrirCaixa}>
                {abrindoCaixa ? 'Abrindo...' : 'Confirmar'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal aporte */}
      {modalAporte && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: 17, fontWeight: 700, margin: '0 0 1rem', color: COM_C.txt }}>Solicitar aporte</h2>
            {aporteEnviado ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <div style={{ fontSize: 36, marginBottom: 8 }}>✓</div>
                <p style={{ fontSize: 14, color: COM_C.verde, fontWeight: 600 }}>Solicitação enviada!</p>
                <Btn variante="cinza" onClick={() => { setModalAporte(false); setAporteEnviado(false); setValorAporte(''); setMotivoAporte('') }} style={{ marginTop: 16 }}>
                  Fechar
                </Btn>
              </div>
            ) : (
              <>
                <label style={{ fontSize: 12, color: COM_C.txtSub, display: 'block', marginBottom: 6 }}>Valor (R$)</label>
                <input type="number" min="0" step="0.01" value={valorAporte} onChange={(e) => setValorAporte(e.target.value)} autoFocus
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${COM_C.borda}`, fontSize: 14, boxSizing: 'border-box', marginBottom: 12 }} />
                <label style={{ fontSize: 12, color: COM_C.txtSub, display: 'block', marginBottom: 6 }}>Motivo (opcional)</label>
                <input type="text" value={motivoAporte} onChange={(e) => setMotivoAporte(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: `1px solid ${COM_C.borda}`, fontSize: 14, boxSizing: 'border-box', marginBottom: 20 }} />
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Btn variante="cinza" onClick={() => { setModalAporte(false); setValorAporte(''); setMotivoAporte('') }}>Cancelar</Btn>
                  <Btn variante="verde" icone="ti-send" disabled={!valorAporte || Number(valorAporte) <= 0 || enviandoAporte} onClick={handleSolicitarAporte}>
                    {enviandoAporte ? 'Enviando...' : 'Solicitar'}
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}