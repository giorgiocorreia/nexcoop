'use client'

import { useTransition, useState } from 'react'
import { atualizarIndiceNex, registrarCotacaoMoageira } from '@/lib/dashboard/indice-nex.actions'

type Snapshot = {
  score_final: number
  faixa: string
  score_oferta: number | null
  score_demanda: number | null
  score_financeiro: number | null
  score_macro: number | null
  prob_forte_alta: number | null
  prob_alta: number | null
  prob_estavel: number | null
  prob_baixa: number | null
  calculado_em: string
}
type HistoricoItem = { calculado_em: string; score_final: number; faixa: string }
type Sinal = { titulo: string | null; dimensao: string; fonte: string; url: string | null; impacto: number; coletado_em: string }
type Cotacao = { fonte: string; preco_brl: number | null; data_referencia: string }
type CotacaoOrg = { preco_cooperado: number; preco_externo: number; data: string; obs: string | null }

interface Props {
  snapshot: Snapshot | null
  historico: HistoricoItem[]
  sinais: Sinal[]
  cotacoes: Cotacao[]
  ultimasCotacoesOrg: CotacaoOrg[]
  precoBahia: { preco_brl: number | null } | null
  usdBrl: { preco_brl: number | null; cambio_usd_brl: number | null } | null
  orgId: string
}

const C = {
  primary:    '#92400e',
  primaryLt:  '#FFF7ED',
  azul:       '#2563EB',
  azulLt:     '#EFF6FF',
  verde:      '#16A34A',
  verdeLt:    '#F0FDF4',
  vermelho:   '#DC2626',
  vermelhoLt: '#FEF2F2',
  roxo:       '#635BFF',
  roxoLt:     '#F0EFFF',
  cinza:      '#78716C',
  cinzaLt:    '#F5F5F4',
  borda:      '#E5E3DC',
  bg:         '#F8F7F4',
  txt:        '#1C1917',
  txtSub:     '#78716C',
}

const NOME_MOAGEIRA: Record<string, string> = {
  barry_callebaut: 'Barry Callebaut',
  cargill: 'Cargill',
  olam: 'Olam / OFI',
}
const BANDEIRA: Record<string, string> = {
  barry_callebaut: '🇨🇭',
  cargill: '🇺🇸',
  olam: '🇸🇬',
}
const FAIXA_LABEL: Record<string, string> = {
  forte_baixa: 'Forte baixa',
  baixa: 'Baixa',
  estavel: 'Estável',
  alta: 'Alta',
  forte_alta: 'Forte alta',
}
const FAIXA_COR: Record<string, { bg: string; txt: string }> = {
  forte_baixa: { bg: '#FEF2F2', txt: '#DC2626' },
  baixa:       { bg: '#FEF2F2', txt: '#DC2626' },
  estavel:     { bg: '#F5F5F4', txt: '#78716C' },
  alta:        { bg: '#F0FDF4', txt: '#16A34A' },
  forte_alta:  { bg: '#F0FDF4', txt: '#16A34A' },
}

function ImpactoBadge({ impacto }: { impacto: number }) {
  const cfg: Record<string, { label: string; bg: string; txt: string }> = {
    '2':  { label: 'Forte alta', bg: '#F0FDF4', txt: '#16A34A' },
    '1':  { label: 'Alta',       bg: '#F0FDF4', txt: '#16A34A' },
    '0':  { label: 'Neutro',     bg: '#F5F5F4', txt: '#78716C' },
    '-1': { label: 'Baixa',      bg: '#FEF2F2', txt: '#DC2626' },
    '-2': { label: 'Forte baixa',bg: '#FEF2F2', txt: '#DC2626' },
  }
  const c = cfg[String(impacto)] ?? cfg['0']
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: c.bg, color: c.txt }}>
      {c.label}
    </span>
  )
}

function FaixaBadge({ faixa }: { faixa: string }) {
  const c = FAIXA_COR[faixa] ?? FAIXA_COR.estavel
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: c.bg, color: c.txt }}>
      {FAIXA_LABEL[faixa] ?? faixa}
    </span>
  )
}

const secLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.08em', color: C.txtSub, marginBottom: 14,
}

const contentCard: React.CSSProperties = {
  background: '#fff', borderRadius: 14, border: `1px solid ${C.borda}`,
  boxShadow: '0 1px 4px rgba(0,0,0,0.04)', padding: '20px 22px',
}

export function PainelMercadoClient({
  snapshot, historico, sinais, cotacoes,
  ultimasCotacoesOrg, precoBahia, usdBrl, orgId,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const [moageiraSel, setMoageiraSel] = useState('barry_callebaut')
  const [precoInput, setPrecoInput] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [filtroNoticia, setFiltroNoticia] = useState('todas')

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const precoBahiaVal = precoBahia?.preco_brl ? Number(precoBahia.preco_brl) : null

  const calcDeságio = (preco: number) => {
    if (!precoBahiaVal) return null
    return (((preco - precoBahiaVal) / precoBahiaVal) * 100).toFixed(1)
  }

  const melhorOferta = () => {
    const m = cotacoes.filter(c => ['barry_callebaut','cargill','olam'].includes(c.fonte) && c.preco_brl)
    if (!m.length) return '—'
    const melhor = m.reduce((a, b) => Number(a.preco_brl) > Number(b.preco_brl) ? a : b)
    return `${NOME_MOAGEIRA[melhor.fonte]} · R$ ${Number(melhor.preco_brl).toFixed(2)}`
  }

  const deságioMedio = () => {
    if (!precoBahiaVal) return '—'
    const m = cotacoes.filter(c => ['barry_callebaut','cargill','olam'].includes(c.fonte) && c.preco_brl)
    if (!m.length) return '—'
    const media = m.reduce((a, b) => a + Number(b.preco_brl), 0) / m.length
    return `${(((media - precoBahiaVal) / precoBahiaVal) * 100).toFixed(1)}% vs. mercado`
  }

  const handleRegistrar = () => {
    const preco = parseFloat(precoInput.replace(',', '.'))
    if (isNaN(preco) || preco <= 0) return
    setSalvando(true)
    startTransition(async () => {
      try {
        await registrarCotacaoMoageira({
          moageira: moageiraSel as 'barry_callebaut' | 'cargill' | 'olam',
          preco_brl: preco,
        })
        setPrecoInput('')
      } finally {
        setSalvando(false)
      }
    })
  }

  const sinaisFiltrados = sinais.filter(s =>
    s.titulo && (filtroNoticia === 'todas' || s.dimensao === filtroNoticia)
  )

  const kpis = [
    {
      label: 'Índice Nex',
      valor: snapshot ? String(Math.round(snapshot.score_final)) : '—',
      sub: snapshot ? FAIXA_LABEL[snapshot.faixa] : 'Sem dados',
      cor: C.primary, corLt: C.primaryLt, icone: 'ti-chart-line',
    },
    {
      label: 'Mercado Bahia',
      valor: precoBahiaVal ? `R$ ${precoBahiaVal.toFixed(2)}` : '—',
      sub: 'por arroba · precodocacau.com.br',
      cor: C.verde, corLt: C.verdeLt, icone: 'ti-plant',
    },
    {
      label: 'USD / BRL',
      valor: usdBrl?.preco_brl ? `R$ ${Number(usdBrl.preco_brl).toFixed(2)}` : '—',
      sub: 'Banco Central do Brasil',
      cor: C.azul, corLt: C.azulLt, icone: 'ti-currency-dollar',
    },
    {
      label: 'Melhor moageira',
      valor: (() => {
        const m = cotacoes.filter(c => ['barry_callebaut','cargill','olam'].includes(c.fonte) && c.preco_brl)
        if (!m.length) return '—'
        const melhor = m.reduce((a, b) => Number(a.preco_brl) > Number(b.preco_brl) ? a : b)
        return `R$ ${Number(melhor.preco_brl).toFixed(2)}`
      })(),
      sub: melhorOferta().split('·')[0].trim(),
      cor: C.roxo, corLt: C.roxoLt, icone: 'ti-building-factory',
    },
    {
      label: 'Último praticado',
      valor: ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_cooperado) : '—',
      sub: 'cooperado · última cotação',
      cor: C.cinza, corLt: C.cinzaLt, icone: 'ti-users',
    },
    {
      label: 'Sinais hoje',
      valor: String(sinais.length),
      sub: `${sinais.filter(s => s.impacto > 0).length} de alta · ${sinais.filter(s => s.impacto < 0).length} de baixa`,
      cor: C.primary, corLt: C.primaryLt, icone: 'ti-radar',
    },
  ]

  return (
    <>
      <style>{`
        .painel-header { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .painel-content { padding: 28px 32px; margin: 0 -2rem -2rem -2rem; background: ${C.bg}; }
        .hub-kpi-grid { display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin-bottom: 24px; }
        .kpi-card { background: #fff; border-radius: 14px; border: 1px solid ${C.borda}; padding: 16px; cursor: default; transition: transform 0.15s, box-shadow 0.15s; }
        .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
        .hub-two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .hub-three-col { display: grid; grid-template-columns: 1.4fr 1fr; gap: 16px; }
        .filter-btn { font-size: 11px; padding: 3px 10px; border-radius: 20px; border: 1px solid ${C.borda}; background: transparent; color: ${C.txtSub}; cursor: pointer; font-weight: 500; }
        .filter-btn.active { background: ${C.primary}; border-color: ${C.primary}; color: #fff; }
        .period-btn { font-size: 11px; padding: 3px 10px; border-radius: 20px; border: 1px solid ${C.borda}; background: transparent; color: ${C.txtSub}; cursor: pointer; }
        .period-btn.active { background: ${C.primary}; border-color: ${C.primary}; color: #fff; }
        .btn-registrar { font-size: 12px; font-weight: 600; padding: 6px 14px; border: 1px solid ${C.primary}; border-radius: 8px; background: transparent; color: ${C.primary}; cursor: pointer; white-space: nowrap; transition: background 0.15s, color 0.15s; }
        .btn-registrar:hover { background: ${C.primary}; color: #fff; }
        .btn-registrar:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-atualizar { display: flex; align-items: center; gap: 5px; padding: 8px 16px; font-size: 13px; font-weight: 600; color: ${C.primary}; background: transparent; border: 1px solid ${C.primary}; border-radius: 8px; cursor: pointer; transition: background 0.15s, color 0.15s; line-height: 1; }
        .btn-atualizar:hover { background: ${C.primary}; color: #fff; }
        .btn-atualizar:disabled { opacity: 0.6; cursor: not-allowed; }
        .divider { border: none; border-top: 1px solid ${C.borda}; margin: 14px 0; }
        .row-item { display: flex; justify-content: space-between; align-items: center; padding: 7px 0; border-bottom: 1px solid ${C.borda}; }
        .row-item:last-child { border-bottom: none; }
        @media (max-width: 1024px) {
          .hub-kpi-grid { grid-template-columns: repeat(3, 1fr) !important; }
          .hub-three-col { grid-template-columns: 1fr !important; }
          .hub-two-col { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .painel-header { padding: 0 16px 0 56px; min-height: 60px; }
          .painel-content { padding: 16px; }
          .hub-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
          .hub-two-col { grid-template-columns: 1fr !important; }
        }
      `}</style>

      {/* Header sticky */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        margin: '0 -2rem 0 -2rem',
      }}>
        <div className="painel-header" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <a href="/comercializacao" style={{ color: C.txtSub, textDecoration: 'none', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
              <i className="ti ti-arrow-left" style={{ fontSize: 14 }} aria-hidden="true" />
              Comercialização
            </a>
            <span style={{ color: C.borda }}>›</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: C.primaryLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-chart-line" style={{ fontSize: 20, color: C.primary }} aria-hidden="true" />
              </div>
              <div>
                <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>
                  Painel de mercado
                </h1>
                <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
                  Índice Nex — cacau
                  {snapshot && (
                    <span style={{ marginLeft: 8 }}>
                      · <FaixaBadge faixa={snapshot.faixa} />
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: C.txtSub }}>
              {snapshot
                ? `Atualizado às ${new Date(snapshot.calculado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Nunca atualizado'}
            </span>
            <button
              className="btn-atualizar"
              onClick={() => startTransition(async () => { await atualizarIndiceNex(orgId) })}
              disabled={isPending}
            >
              <i className="ti ti-refresh" style={{ fontSize: 14 }} aria-hidden="true" />
              {isPending ? 'Atualizando…' : 'Atualizar agora'}
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="painel-content">

        {/* KPI cards */}
        <div className="hub-kpi-grid">
          {kpis.map(({ label, valor, sub, cor, corLt, icone }) => (
            <div key={label} className="kpi-card" style={{ borderTop: `3px solid ${cor}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: corLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={`ti ${icone}`} style={{ fontSize: 16, color: cor }} aria-hidden="true" />
                </div>
                <span style={{ fontSize: 12, color: C.txtSub, fontWeight: 500 }}>{label}</span>
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.txt, lineHeight: 1 }}>{valor}</div>
              <div style={{ fontSize: 10, color: C.txtSub, marginTop: 4 }}>{sub}</div>
            </div>
          ))}
        </div>

        {/* Banner Índice Nex */}
        <div style={{ ...contentCard, background: '#E6F1FB', border: '1px solid #B5D4F4', marginBottom: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '2rem', alignItems: 'center' }}>
            <div>
              <div style={{ ...secLabel, color: '#185FA5', marginBottom: 6 }}>Índice Nex</div>
              <div style={{ fontSize: 52, fontWeight: 800, color: '#042C53', lineHeight: 1 }}>
                {snapshot ? Math.round(snapshot.score_final) : '—'}
                <span style={{ fontSize: 18, color: '#185FA5', fontWeight: 400 }}> / 100</span>
              </div>
              <div style={{ marginTop: 8 }}>
                {snapshot ? <FaixaBadge faixa={snapshot.faixa} /> : <span style={{ fontSize: 12, color: '#185FA5' }}>Clique em atualizar</span>}
              </div>
            </div>
            <div>
              <div style={{ ...secLabel, color: '#185FA5' }}>Probabilidades</div>
              {([
                { label: 'Forte alta', pct: snapshot?.prob_forte_alta ?? 0, cor: '#0F6E56' },
                { label: 'Alta',       pct: snapshot?.prob_alta ?? 0,       cor: '#1D9E75' },
                { label: 'Estável',    pct: snapshot?.prob_estavel ?? 0,    cor: C.cinza },
                { label: 'Baixa',      pct: snapshot?.prob_baixa ?? 0,      cor: C.vermelho },
              ] as const).map(({ label, pct, cor }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#185FA5', width: 64, flexShrink: 0 }}>{label}</span>
                  <div style={{ flex: 1, height: 6, background: 'rgba(24,95,165,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: cor }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#042C53', width: 32, textAlign: 'right' }}>{pct}%</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ ...secLabel, color: '#185FA5' }}>Dimensões</div>
              {snapshot && ([
                { nome: 'Oferta mundial',   score: snapshot.score_oferta,     peso: '40%' },
                { nome: 'Demanda mundial',  score: snapshot.score_demanda,    peso: '30%' },
                { nome: 'Merc. financeiro', score: snapshot.score_financeiro, peso: '20%' },
                { nome: 'Macroeconomia',    score: snapshot.score_macro,      peso: '10%' },
              ] as const).map(({ nome, score, peso }) => (
                <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 11, color: '#185FA5', width: 100, flexShrink: 0 }}>{nome}</span>
                  <div style={{ width: 80, height: 5, background: 'rgba(24,95,165,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${score ?? 50}%`, height: '100%', borderRadius: 3, background: '#185FA5' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#042C53', width: 22, textAlign: 'right' }}>{score ?? '—'}</span>
                  <span style={{ fontSize: 10, color: '#185FA599', width: 28, textAlign: 'right' }}>{peso}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Histórico + Notícias */}
        <div className="hub-three-col" style={{ marginBottom: 16 }}>
          <div style={contentCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={secLabel}>Histórico do Índice Nex</div>
            </div>
            {historico.length > 0 ? (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Data', 'Score', 'Faixa'].map((h, i) => (
                      <th key={h} style={{ fontSize: 11, fontWeight: 700, color: C.txtSub, textAlign: i === 0 ? 'left' : 'right', padding: '4px 0', borderBottom: `1px solid ${C.borda}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...historico].reverse().slice(0, 14).map((h, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 12, color: C.txtSub, padding: '7px 0', borderBottom: `1px solid ${C.borda}` }}>
                        {new Date(h.calculado_em).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                      </td>
                      <td style={{ fontSize: 14, fontWeight: 700, color: C.txt, textAlign: 'right', padding: '7px 0', borderBottom: `1px solid ${C.borda}` }}>
                        {Math.round(h.score_final)}
                      </td>
                      <td style={{ textAlign: 'right', padding: '7px 0', borderBottom: `1px solid ${C.borda}` }}>
                        <FaixaBadge faixa={h.faixa} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: C.txtSub, fontSize: 13 }}>
                Sem histórico ainda.<br />
                <span style={{ fontSize: 12 }}>O índice acumula a cada atualização.</span>
              </div>
            )}
          </div>

          <div style={contentCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={secLabel}>Notícias relevantes</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(['todas', 'oferta', 'demanda', 'macro', 'financeiro'] as const).map(f => (
                  <button key={f} className={`filter-btn${filtroNoticia === f ? ' active' : ''}`} onClick={() => setFiltroNoticia(f)}>
                    {f === 'todas' ? 'Todas' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            {sinaisFiltrados.length > 0 ? sinaisFiltrados.map((sinal, i, arr) => (
              <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < arr.length - 1 ? `1px solid ${C.borda}` : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <ImpactoBadge impacto={sinal.impacto} />
                  <span style={{ fontSize: 11, color: C.txtSub, textTransform: 'capitalize' }}>{sinal.dimensao}</span>
                  <span style={{ fontSize: 11, color: C.txtSub, marginLeft: 'auto' }}>
                    {new Date(sinal.coletado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: 13, color: C.txt, lineHeight: 1.45, marginBottom: 4 }}>{sinal.titulo}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: C.txtSub }}>{sinal.fonte}</span>
                  {sinal.url && (
                    <a href={sinal.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 11, color: C.azul, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 3 }}>
                      ler artigo <i className="ti ti-external-link" style={{ fontSize: 12 }} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '2rem 0', color: C.txtSub, fontSize: 13 }}>
                {filtroNoticia === 'todas'
                  ? 'Sem notícias. Clique em "Atualizar agora".'
                  : `Sem notícias para "${filtroNoticia}".`}
              </div>
            )}
          </div>
        </div>

        {/* Moageiras + Histórico org */}
        <div className="hub-two-col" style={{ marginBottom: 16 }}>
          <div style={contentCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={secLabel}>Oferta das moageiras</div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: '#FAEEDA', color: '#854F0B', marginTop: -14 }}>manual</span>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Empresa', 'Oferta /arroba', 'Deságio'].map((h, i) => (
                    <th key={h} style={{ fontSize: 11, fontWeight: 700, color: C.txtSub, textAlign: i === 0 ? 'left' : 'right', padding: '4px 0', borderBottom: `1px solid ${C.borda}`, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {['barry_callebaut', 'cargill', 'olam'].map(fonte => {
                  const cot = cotacoes.find(c => c.fonte === fonte)
                  const deságio = cot?.preco_brl ? calcDeságio(Number(cot.preco_brl)) : null
                  return (
                    <tr key={fonte}>
                      <td style={{ padding: '8px 0', borderBottom: `1px solid ${C.borda}` }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>{NOME_MOAGEIRA[fonte]}</div>
                        <div style={{ fontSize: 11, color: C.txtSub }}>
                          {BANDEIRA[fonte]}{cot ? ` · ${new Date(cot.data_referencia).toLocaleDateString('pt-BR')}` : ''}
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 0', borderBottom: `1px solid ${C.borda}` }}>
                        {cot?.preco_brl
                          ? <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>R$ {Number(cot.preco_brl).toFixed(2)}</span>
                          : <span style={{ fontSize: 13, color: C.txtSub }}>—</span>}
                      </td>
                      <td style={{ textAlign: 'right', padding: '8px 0', borderBottom: `1px solid ${C.borda}` }}>
                        {deságio
                          ? <span style={{ fontSize: 12, fontWeight: 600, color: C.vermelho }}>{deságio}%</span>
                          : <span style={{ fontSize: 12, color: C.txtSub }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <select value={moageiraSel} onChange={e => setMoageiraSel(e.target.value)}
                style={{ flex: 1, fontSize: 13, padding: '7px 10px', border: `1px solid ${C.borda}`, borderRadius: 8, background: C.bg, color: C.txt }}>
                <option value="barry_callebaut">Barry Callebaut</option>
                <option value="cargill">Cargill</option>
                <option value="olam">Olam / OFI</option>
              </select>
              <input type="text" placeholder="R$/arroba" value={precoInput} onChange={e => setPrecoInput(e.target.value)}
                style={{ width: 110, fontSize: 13, padding: '7px 10px', border: `1px solid ${C.borda}`, borderRadius: 8, textAlign: 'right', color: C.txt }} />
              <button className="btn-registrar" onClick={handleRegistrar} disabled={salvando || !precoInput}>
                {salvando ? '…' : 'Registrar'}
              </button>
            </div>
          </div>

          <div style={contentCard}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
              <div style={secLabel}>Praticado pela cooperativa</div>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 9px', borderRadius: 6, background: C.roxoLt, color: C.roxo, marginTop: -14 }}>cotações</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
              <div style={{ background: C.bg, borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: C.txtSub, marginBottom: 4 }}>Último cooperado</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.roxo }}>
                  {ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_cooperado) : '—'}
                </div>
              </div>
              <div style={{ background: C.bg, borderRadius: 10, padding: '10px 14px' }}>
                <div style={{ fontSize: 11, color: C.txtSub, marginBottom: 4 }}>Último externo</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.primary }}>
                  {ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_externo) : '—'}
                </div>
              </div>
            </div>
            {ultimasCotacoesOrg.length > 0 ? ultimasCotacoesOrg.map((c, i) => (
              <div key={i} className="row-item">
                <span style={{ fontSize: 12, color: C.txtSub, width: 48 }}>
                  {new Date(c.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
                <span style={{ fontSize: 12, color: C.txt, flex: 1, padding: '0 10px' }}>{c.obs ?? '—'}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: C.roxo }}>{fmt(c.preco_cooperado)}</span>
                  <span style={{ fontSize: 11, color: C.txtSub }}> / {fmt(c.preco_externo)}</span>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '1rem 0', color: C.txtSub, fontSize: 13 }}>
                Nenhuma cotação registrada.
              </div>
            )}
          </div>
        </div>

        {/* Contexto + Configurações */}
        <div className="hub-two-col">
          <div style={contentCard}>
            <div style={secLabel}>Contexto de mercado</div>
            {[
              { label: 'Deságio médio moageiras', valor: deságioMedio(), cor: C.vermelho },
              { label: 'Melhor oferta hoje',       valor: melhorOferta(), cor: C.txt },
              { label: 'Último praticado (coop.)', valor: ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_cooperado) + '/arr.' : '—', cor: C.roxo },
              { label: 'Último praticado (ext.)',  valor: ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_externo) + '/arr.' : '—', cor: C.primary },
              { label: 'Sinais coletados hoje',    valor: String(sinais.length), cor: C.txt },
              { label: 'Sinais de alta',           valor: String(sinais.filter(s => s.impacto > 0).length), cor: C.verde },
              { label: 'Sinais de baixa',          valor: String(sinais.filter(s => s.impacto < 0).length), cor: C.vermelho },
            ].map(({ label, valor, cor }) => (
              <div key={label} className="row-item">
                <span style={{ fontSize: 13, color: C.txt }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: cor }}>{valor}</span>
              </div>
            ))}
          </div>

          <div style={contentCard}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={secLabel}>Configurações do índice</div>
              <a href="/comercializacao/painel/config" style={{ fontSize: 12, color: C.azul, textDecoration: 'none', fontWeight: 600 }}>
                Editar →
              </a>
            </div>
            {[
              { label: 'Peso oferta mundial',   valor: '40%' },
              { label: 'Peso demanda mundial',  valor: '30%' },
              { label: 'Peso merc. financeiro', valor: '20%' },
              { label: 'Peso macroeconomia',    valor: '10%' },
            ].map(({ label, valor }) => (
              <div key={label} className="row-item">
                <span style={{ fontSize: 13, color: C.txt }}>{label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.txt }}>{valor}</span>
              </div>
            ))}
            <div style={{ marginTop: 14, padding: '10px 14px', background: C.bg, borderRadius: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: C.txtSub, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Fontes ativas</div>
              <div style={{ fontSize: 12, color: C.txt, lineHeight: 1.7 }}>
                precodocacau.com.br · BCB · Google News RSS · ICCO · NOAA CPC · CFTC
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: 11, color: C.txtSub, textAlign: 'center', marginTop: 24 }}>
          Fontes: BCB · precodocacau.com.br · ICCO · Google News RSS · NOAA CPC · análise automática via Claude Haiku · 1×/dia
        </div>
      </div>
    </>
  )
}
