'use client'

import { useTransition, useState } from 'react'
import { atualizarIndiceNex, registrarCotacaoMoageira } from '@/lib/dashboard/indice-nex.actions'
import { COM_C } from '@/components/nexcoop/ui'

type Snapshot = {
  score_final: number; faixa: string
  score_oferta: number | null; score_demanda: number | null
  score_financeiro: number | null; score_macro: number | null
  prob_forte_alta: number | null; prob_alta: number | null
  prob_estavel: number | null; prob_baixa: number | null
  calculado_em: string
}
type Sinal = { titulo: string | null; dimensao: string; fonte: string; url: string | null; impacto: number; coletado_em: string }
type Cotacao = { fonte: string; preco_brl: number | null; data_referencia: string }
type CotacaoOrg = { preco_cooperado: number; preco_externo: number; data: string; obs: string | null }

interface Props {
  snapshot: Snapshot | null
  sinais: Sinal[]
  cotacoes: Cotacao[]
  ultimasCotacoesOrg: CotacaoOrg[]
  precoBahia: { preco_brl: number | null } | null
  usdBrl: { preco_brl: number | null; cambio_usd_brl: number | null } | null
  iceNy: { preco_usd: number | null; preco_brl: number | null; data_referencia: string } | null
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
  alta: 'Alta — favorável à venda',
  forte_alta: 'Forte alta — ótimo momento para vender',
}
const FAIXA_CURTA: Record<string, string> = {
  forte_baixa: 'Forte baixa',
  baixa: 'Baixa',
  estavel: 'Estável',
  alta: 'Alta · bom p/ vender',
  forte_alta: 'Forte alta · vender',
}

function ImpactoBadge({ impacto }: { impacto: number }) {
  const cfg: Record<number, { label: string; bg: string; cor: string }> = {
    2:  { label: 'Forte alta', bg: '#FAECE7', cor: '#712B13' },
    1:  { label: 'Alta',       bg: '#E1F5EE', cor: '#085041' },
    0:  { label: 'Neutro',     bg: '#f0eeea', cor: '#5F5E5A' },
    [-1]: { label: 'Baixa',    bg: '#FCEBEB', cor: '#791F1F' },
    [-2]: { label: 'Forte baixa', bg: '#FCEBEB', cor: '#791F1F' },
  }
  const c = cfg[impacto] ?? cfg[0]
  return (
    <span style={{ fontSize: 10, fontWeight: 500, padding: '1px 6px', borderRadius: 4, background: c.bg, color: c.cor }}>
      {c.label}
    </span>
  )
}

function chipFaixa(faixa: string | undefined): { bg: string; cor: string } {
  if (faixa === 'forte_alta' || faixa === 'alta') return { bg: '#E1F5EE', cor: '#085041' }
  if (faixa === 'baixa' || faixa === 'forte_baixa') return { bg: '#FCEBEB', cor: '#791F1F' }
  return { bg: '#EEF0FF', cor: '#4840CC' }
}

export function IndiceNex({ snapshot, sinais, cotacoes, ultimasCotacoesOrg, precoBahia, usdBrl, iceNy }: Props) {
  const [isPending, startTransition] = useTransition()
  const [moageiraSel, setMoageiraSel] = useState('barry_callebaut')
  const [precoInput, setPrecoInput] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [mobileExpandido, setMobileExpandido] = useState(false)

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  const precoBahiaVal = precoBahia?.preco_brl ? Number(precoBahia.preco_brl) : null
  const iceUsdTon = iceNy?.preco_usd ? Number(iceNy.preco_usd) : null
  const iceBrlKg = iceNy?.preco_brl ? Number(iceNy.preco_brl) : null

  const calcDeságio = (preco: number) => {
    if (!precoBahiaVal) return null
    return (((preco - precoBahiaVal) / precoBahiaVal) * 100).toFixed(1)
  }

  const melhorOfertaObj = () => {
    const m = cotacoes.filter(c => ['barry_callebaut', 'cargill', 'olam'].includes(c.fonte) && c.preco_brl)
    if (!m.length) return null
    return m.reduce((a, b) => Number(a.preco_brl) > Number(b.preco_brl) ? a : b)
  }

  const melhorOferta = () => {
    const melhor = melhorOfertaObj()
    if (!melhor) return '—'
    return `${NOME_MOAGEIRA[melhor.fonte]} · R$ ${Number(melhor.preco_brl).toFixed(2)}`
  }

  const deságioMedio = () => {
    if (!precoBahiaVal) return '—'
    const m = cotacoes.filter(c => ['barry_callebaut', 'cargill', 'olam'].includes(c.fonte) && c.preco_brl)
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
        await registrarCotacaoMoageira({ moageira: moageiraSel as 'barry_callebaut' | 'cargill' | 'olam', preco_brl: preco })
        setPrecoInput('')
      } finally {
        setSalvando(false)
      }
    })
  }

  const handleAtualizar = () => {
    startTransition(async () => { await atualizarIndiceNex() })
  }

  const s = { card: { background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.25rem' } as const }
  const faixaStyle = chipFaixa(snapshot?.faixa)
  const melhor = melhorOfertaObj()
  const noticiaTopo = sinais.find(x => x.titulo)
  const hora = snapshot
    ? new Date(snapshot.calculado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="inx" style={{ marginTop: 4 }}>
      <style>{`
        /* ── Mobile: só o resumo (ou resumo + detalhes sob demanda) ── */
        .inx-resumo-mobile { display: none; }
        .inx-full { display: block; }
        @media (max-width: 768px) {
          .inx-resumo-mobile { display: block; }
          .inx-full { display: none; }
          .inx-full.inx-full--open { display: block; margin-top: 12px; }
        }
        @media (min-width: 769px) {
          .inx-resumo-mobile { display: none !important; }
        }

        .inx-resumo-card {
          background: #fff;
          border: 1px solid #e5e3dc;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }
        .inx-resumo-hero {
          background: linear-gradient(135deg, #E6F1FB 0%, #F0F7FD 55%, #FEF3C7 100%);
          padding: 14px 16px 12px;
          border-bottom: 1px solid #E5E3DC;
        }
        .inx-resumo-kpis {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          padding: 12px 14px;
        }
        .inx-resumo-kpi {
          background: #F8F7F4;
          border-radius: 10px;
          padding: 10px 12px;
          min-width: 0;
        }
        .inx-resumo-kpi label {
          display: block;
          font-size: 10px;
          font-weight: 600;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 3px;
        }
        .inx-resumo-kpi strong {
          display: block;
          font-size: 15px;
          font-weight: 700;
          color: #1a1a1a;
          letter-spacing: -0.02em;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .inx-resumo-kpi span.sub {
          display: block;
          font-size: 10px;
          color: #888;
          margin-top: 2px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .inx-resumo-linha {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-top: 1px solid #f0eeea;
          font-size: 12px;
        }

        /* ── Desktop / tablet full layout ── */
        .inx-topbar {
          display: flex; align-items: center; justify-content: space-between;
          gap: 10px; margin-bottom: 12px; flex-wrap: wrap;
        }
        .inx-topbar-meta { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .inx-grid {
          display: grid;
          grid-template-columns: minmax(0, 0.85fr) minmax(0, 1.3fr) minmax(0, 0.85fr);
          gap: 12px;
          align-items: start;
        }
        .inx-card-indice {
          background: #E6F1FB; border: 1px solid #B5D4F4; border-radius: 12px;
          padding: 1.25rem; display: flex; flex-direction: column; gap: 12px; min-width: 0;
        }
        .inx-card-precos, .inx-card-news { min-width: 0; }
        .inx-score { font-size: 36px; font-weight: 500; color: #042C53; line-height: 1; }
        .inx-metrics { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .inx-moag-form { display: flex; gap: 6px; margin-top: 8px; }
        .inx-moag-form select { flex: 1; min-width: 0; }
        .inx-bottom {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px;
        }
        @media (max-width: 1024px) and (min-width: 769px) {
          .inx-grid { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); }
          .inx-card-indice { grid-column: 1; grid-row: 1; }
          .inx-card-news { grid-column: 2; grid-row: 1; }
          .inx-card-precos { grid-column: 1 / -1; grid-row: 2; }
        }
        /* Quando mobile expandido, full vira 1 col limpa */
        @media (max-width: 768px) {
          .inx-full--open .inx-grid { grid-template-columns: minmax(0, 1fr); }
          .inx-full--open .inx-card-indice,
          .inx-full--open .inx-card-precos,
          .inx-full--open .inx-card-news { grid-column: auto; grid-row: auto; }
          .inx-full--open .inx-bottom { grid-template-columns: minmax(0, 1fr); }
          .inx-full--open .inx-moag-form { flex-wrap: wrap; }
          .inx-full--open .inx-moag-form select { flex: 1 1 100%; }
          .inx-full--open .inx-score { font-size: 28px; }
          .inx-full--open .inx-topbar { display: none; }
        }
      `}</style>

      {/* ═══════════════ RESUMO MOBILE ═══════════════ */}
      <div className="inx-resumo-mobile">
        <div className="inx-resumo-card">
          <div className="inx-resumo-hero">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                  Mercado de cacau
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                  <span style={{ fontSize: 34, fontWeight: 800, color: '#042C53', letterSpacing: '-0.03em', lineHeight: 1 }}>
                    {snapshot?.score_final ?? '—'}
                  </span>
                  <span style={{ fontSize: 13, color: '#185FA5', fontWeight: 500 }}>/ 100</span>
                </div>
                <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{
                    fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 999,
                    background: faixaStyle.bg, color: faixaStyle.cor,
                  }}>
                    {snapshot ? (FAIXA_CURTA[snapshot.faixa] ?? snapshot.faixa) : 'Sem dados'}
                  </span>
                  {hora && (
                    <span style={{ fontSize: 11, color: '#6B7280' }}>{hora}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleAtualizar}
                disabled={isPending}
                aria-label="Atualizar índice"
                style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  border: '1px solid #D6C4A8', background: 'rgba(255,255,255,0.7)',
                  color: '#92400e', cursor: isPending ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  opacity: isPending ? 0.6 : 1,
                }}
              >
                <i className={`ti ti-refresh${isPending ? ' ti-spin' : ''}`} style={{ fontSize: 18 }} aria-hidden />
              </button>
            </div>
          </div>

          <div className="inx-resumo-kpis">
            <div className="inx-resumo-kpi">
              <label>Bahia / arroba</label>
              <strong style={{ color: '#92400e' }}>
                {precoBahiaVal ? `R$ ${precoBahiaVal.toFixed(2)}` : '—'}
              </strong>
              {precoBahiaVal && (
                <span className="sub">kg R$ {(precoBahiaVal / 15).toFixed(2)}</span>
              )}
            </div>
            <div className="inx-resumo-kpi">
              <label>USD / BRL</label>
              <strong>
                {usdBrl?.preco_brl ? `R$ ${Number(usdBrl.preco_brl).toFixed(2)}` : '—'}
              </strong>
              <span className="sub">câmbio</span>
            </div>
            <div className="inx-resumo-kpi">
              <label>ICE NY</label>
              <strong>
                {iceUsdTon ? `US$ ${Math.round(iceUsdTon).toLocaleString('pt-BR')}` : '—'}
              </strong>
              <span className="sub">{iceBrlKg ? `≈ R$ ${iceBrlKg.toFixed(2)}/kg` : 'por tonelada'}</span>
            </div>
            <div className="inx-resumo-kpi">
              <label>Melhor moageira</label>
              <strong style={{ color: '#92400e' }}>
                {melhor ? `R$ ${Number(melhor.preco_brl).toFixed(2)}` : '—'}
              </strong>
              <span className="sub">
                {melhor ? NOME_MOAGEIRA[melhor.fonte] : 'sem oferta'}
              </span>
            </div>
          </div>

          <div className="inx-resumo-linha">
            <span style={{ color: '#6B7280' }}>Praticado (coop.)</span>
            <strong style={{ color: '#635BFF', fontWeight: 700 }}>
              {ultimasCotacoesOrg[0] ? `${fmt(ultimasCotacoesOrg[0].preco_cooperado)}/arr.` : '—'}
            </strong>
          </div>
          <div className="inx-resumo-linha" style={{ paddingTop: 0, borderTop: 'none', paddingBottom: 10 }}>
            <span style={{ color: '#6B7280' }}>Praticado (ext.)</span>
            <strong style={{ color: '#92400e', fontWeight: 700 }}>
              {ultimasCotacoesOrg[0] ? `${fmt(ultimasCotacoesOrg[0].preco_externo)}/arr.` : '—'}
            </strong>
          </div>

          {noticiaTopo && (
            <div style={{
              margin: '0 14px 12px',
              padding: '10px 12px',
              background: '#F8F7F4',
              borderRadius: 10,
              border: '1px solid #EDEBE6',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <ImpactoBadge impacto={noticiaTopo.impacto} />
                <span style={{ fontSize: 10, color: COM_C.txtSub }}>destaque</span>
              </div>
              <div style={{
                fontSize: 12, color: '#374151', lineHeight: 1.4,
                display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
              }}>
                {noticiaTopo.titulo}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => setMobileExpandido(v => !v)}
            style={{
              width: '100%',
              border: 'none',
              borderTop: '1px solid #f0eeea',
              background: '#FAFAF8',
              padding: '12px 14px',
              fontSize: 13,
              fontWeight: 600,
              color: '#92400e',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            {mobileExpandido ? 'Ocultar detalhes' : 'Ver detalhes completos'}
            <i className={`ti ti-chevron-${mobileExpandido ? 'up' : 'down'}`} style={{ fontSize: 16 }} aria-hidden />
          </button>
        </div>
      </div>

      {/* ═══════════════ LAYOUT COMPLETO (desktop ou mobile expandido) ═══════════════ */}
      <div className={`inx-full${mobileExpandido ? ' inx-full--open' : ''}`}>
        <div className="inx-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#92400e', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 500, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Índice Nex — mercado cacau
            </span>
          </div>
          <div className="inx-topbar-meta">
            <span style={{ fontSize: 11, color: COM_C.txtSub }}>
              {snapshot
                ? `Atualizado às ${new Date(snapshot.calculado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Nunca atualizado'}
            </span>
            <button
              type="button"
              onClick={handleAtualizar}
              disabled={isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12, fontWeight: 500, color: '#92400e', background: 'transparent', border: '1px solid #92400e', borderRadius: 8, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1 }}
            >
              <i className="ti ti-refresh" style={{ fontSize: 13 }} aria-hidden="true" />
              {isPending ? 'Atualizando…' : 'Atualizar'}
            </button>
          </div>
        </div>

        <div className="inx-grid">
          <div className="inx-card-indice">
            <div>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Índice Nex</div>
              <div className="inx-score">
                {snapshot?.score_final ?? '—'} <span style={{ fontSize: 14, color: '#185FA5', fontWeight: 400 }}>/ 100</span>
              </div>
              <div style={{ fontSize: 12, color: '#185FA5', marginTop: 2 }}>
                {snapshot ? FAIXA_LABEL[snapshot.faixa] : 'Clique em atualizar'}
              </div>
            </div>
            <div className="inx-metrics">
              <div style={{ background: 'rgba(24,95,165,0.1)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#185FA5', marginBottom: 2 }}>USD / BRL</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#042C53' }}>
                  {usdBrl?.preco_brl ? `R$ ${Number(usdBrl.preco_brl).toFixed(2)}` : '—'}
                </div>
              </div>
              <div style={{ background: 'rgba(24,95,165,0.1)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#185FA5', marginBottom: 2 }}>Mercado Bahia</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#042C53' }}>
                  {precoBahiaVal ? `R$ ${precoBahiaVal.toFixed(0)}` : '—'}
                </div>
              </div>
              <div style={{ gridColumn: '1 / -1', background: 'rgba(24,95,165,0.1)', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#185FA5', marginBottom: 2 }}>
                  ICE Nova York {iceNy?.data_referencia ? `· ${new Date(iceNy.data_referencia + 'T12:00:00').toLocaleDateString('pt-BR')}` : ''}
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: '#042C53' }}>
                    {iceUsdTon ? `US$ ${iceUsdTon.toLocaleString('pt-BR')} /t` : '—'}
                  </span>
                  {iceBrlKg && (
                    <span style={{ fontSize: 11, color: '#185FA5' }}>
                      ≈ R$ {iceBrlKg.toFixed(2)}/kg
                    </span>
                  )}
                </div>
              </div>
            </div>
            {snapshot && (
              <div>
                {([
                  { label: 'Forte alta', pct: snapshot.prob_forte_alta ?? 0, cor: '#0F6E56' },
                  { label: 'Alta',       pct: snapshot.prob_alta ?? 0,       cor: '#1D9E75' },
                  { label: 'Estável',    pct: snapshot.prob_estavel ?? 0,    cor: '#888' },
                  { label: 'Baixa',      pct: snapshot.prob_baixa ?? 0,      cor: '#D85A30' },
                ] as const).map(({ label, pct, cor }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                    <span style={{ fontSize: 11, color: '#185FA5', width: 58, flexShrink: 0 }}>{label}</span>
                    <div style={{ flex: 1, height: 5, background: 'rgba(24,95,165,0.15)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: cor }} />
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#042C53', width: 28, textAlign: 'right' }}>{pct}%</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="inx-card-precos" style={s.card}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              Mercado regional — Bahia
              <span style={{ background: '#E1F5EE', color: '#085041', fontSize: 9, fontWeight: 500, padding: '1px 5px', borderRadius: 3 }}>automático</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 500, color: '#1a1a1a' }}>
                  {precoBahiaVal ? `R$ ${precoBahiaVal.toFixed(2)}` : '—'}
                  <span style={{ fontSize: 12, fontWeight: 400, color: '#888' }}> /arroba</span>
                </div>
                {precoBahiaVal && (
                  <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                    <span style={{ fontSize: 11, color: '#888' }}>kg <span style={{ color: '#374151', fontWeight: 500 }}>R$ {(precoBahiaVal / 15).toFixed(2)}</span></span>
                    <span style={{ fontSize: 11, color: '#888' }}>saca <span style={{ color: '#374151', fontWeight: 500 }}>R$ {(precoBahiaVal * 4).toFixed(0)}</span></span>
                  </div>
                )}
              </div>
              <a href="https://precodocacau.com.br/" target="_blank" rel="noopener noreferrer" style={{ fontSize: 10, color: '#185FA5', textDecoration: 'none' }}>fonte →</a>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f0eeea', margin: '12px 0' }} />

            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              Oferta das moageiras
              <span style={{ background: '#FAEEDA', color: '#854F0B', fontSize: 9, fontWeight: 500, padding: '1px 5px', borderRadius: 3 }}>manual</span>
            </div>
            {['barry_callebaut', 'cargill', 'olam'].map(fonte => {
              const cot = cotacoes.find(c => c.fonte === fonte)
              const deságio = cot?.preco_brl ? calcDeságio(Number(cot.preco_brl)) : null
              return (
                <div key={fonte} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0eeea' }}>
                  <div>
                    <span style={{ fontSize: 12, fontWeight: 500, color: '#374151' }}>{NOME_MOAGEIRA[fonte]}</span>
                    <span style={{ fontSize: 10, color: COM_C.txtSub, display: 'block' }}>
                      {BANDEIRA[fonte]}{cot ? ` · ${new Date(cot.data_referencia).toLocaleDateString('pt-BR')}` : ''}
                    </span>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    {cot?.preco_brl ? (
                      <>
                        <span style={{ fontSize: 13, fontWeight: 500, color: '#92400e' }}>R$ {Number(cot.preco_brl).toFixed(2)}</span>
                        {deságio && <span style={{ fontSize: 10, color: '#993C1D', display: 'block' }}>{deságio}% vs. mercado</span>}
                      </>
                    ) : (
                      <span style={{ fontSize: 12, color: COM_C.txtSub }}>—</span>
                    )}
                  </div>
                </div>
              )
            })}
            <div className="inx-moag-form">
              <select value={moageiraSel} onChange={e => setMoageiraSel(e.target.value)}
                style={{ flex: 1, fontSize: 12, padding: '5px 8px', border: '1px solid #e5e3dc', borderRadius: 6, background: '#f8f7f4' }}>
                <option value="barry_callebaut">Barry Callebaut</option>
                <option value="cargill">Cargill</option>
                <option value="olam">Olam / OFI</option>
              </select>
              <input type="text" inputMode="decimal" placeholder="R$/arroba" value={precoInput} onChange={e => setPrecoInput(e.target.value)}
                style={{ width: 90, fontSize: 16, padding: '5px 8px', border: '1px solid #e5e3dc', borderRadius: 6, textAlign: 'right' }} />
              <button type="button" onClick={handleRegistrar} disabled={salvando || !precoInput}
                style={{ fontSize: 11, fontWeight: 500, padding: '5px 10px', border: '1px solid #92400e', borderRadius: 6, background: 'transparent', color: '#92400e', cursor: 'pointer', whiteSpace: 'nowrap', opacity: salvando ? 0.6 : 1 }}>
                {salvando ? '…' : 'Registrar'}
              </button>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid #f0eeea', margin: '12px 0' }} />

            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              Praticado pela cooperativa
              <span style={{ background: '#EEF0FF', color: '#4840CC', fontSize: 9, fontWeight: 500, padding: '1px 5px', borderRadius: 3 }}>cotações</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Último cooperado</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#635BFF' }}>
                  {ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_cooperado) : '—'}
                </div>
              </div>
              <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 10, color: '#888', marginBottom: 2 }}>Último externo</div>
                <div style={{ fontSize: 16, fontWeight: 500, color: '#92400e' }}>
                  {ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_externo) : '—'}
                </div>
              </div>
            </div>
            {ultimasCotacoesOrg.slice(0, 3).map((c, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderTop: '1px solid #f0eeea' }}>
                <span style={{ fontSize: 11, color: COM_C.txtSub, width: 48 }}>
                  {new Date(c.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                </span>
                <span style={{ fontSize: 11, color: '#374151', flex: 1, padding: '0 8px' }}>{c.obs ?? '—'}</span>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#635BFF' }}>{fmt(c.preco_cooperado)}</span>
                  <span style={{ fontSize: 10, color: '#888' }}> / {fmt(c.preco_externo)}</span>
                </div>
              </div>
            ))}
            {ultimasCotacoesOrg.length === 0 && (
              <p style={{ fontSize: 12, color: COM_C.txtSub, textAlign: 'center', padding: '8px 0' }}>Nenhuma cotação registrada.</p>
            )}
          </div>

          <div className="inx-card-news" style={s.card}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
              Notícias relevantes
            </div>
            {sinais.filter(x => x.titulo).slice(0, 4).map((sinal, i, arr) => (
              <div key={i} style={{ paddingBottom: 9, marginBottom: 9, borderBottom: i < arr.length - 1 ? '1px solid #f0eeea' : 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3, flexWrap: 'wrap' }}>
                  <ImpactoBadge impacto={sinal.impacto} />
                  <span style={{ fontSize: 10, color: COM_C.txtSub }}>{sinal.dimensao}</span>
                  <span style={{ fontSize: 10, color: COM_C.txtSub, marginLeft: 'auto' }}>
                    {new Date(sinal.coletado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.45, marginBottom: 3 }}>{sinal.titulo}</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontSize: 10, color: COM_C.txtSub, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{sinal.fonte}</span>
                  {sinal.url && (
                    <a href={sinal.url} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize: 10, color: '#185FA5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                      ler <i className="ti ti-external-link" style={{ fontSize: 10 }} aria-hidden="true" />
                    </a>
                  )}
                </div>
              </div>
            ))}
            {sinais.filter(x => x.titulo).length === 0 && (
              <p style={{ fontSize: 12, color: COM_C.txtSub, textAlign: 'center', padding: '1rem 0' }}>
                Sem notícias ainda. Clique em &quot;Atualizar&quot;.
              </p>
            )}
          </div>
        </div>

        <div className="inx-bottom">
          <div style={s.card}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Dimensões do índice</div>
            {snapshot && ([
              { nome: 'Oferta mundial',   score: snapshot.score_oferta,     peso: '40%' },
              { nome: 'Demanda mundial',  score: snapshot.score_demanda,    peso: '30%' },
              { nome: 'Merc. financeiro', score: snapshot.score_financeiro, peso: '20%' },
              { nome: 'Macroeconomia',    score: snapshot.score_macro,      peso: '10%' },
            ] as const).map(({ nome, score, peso }) => (
              <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9, minWidth: 0 }}>
                <span style={{ fontSize: 12, color: '#374151', width: 92, flexShrink: 0 }}>{nome}</span>
                <div style={{ flex: 1, height: 5, background: '#f0eeea', borderRadius: 3, overflow: 'hidden', minWidth: 0 }}>
                  <div style={{ width: `${score ?? 50}%`, height: '100%', borderRadius: 3, background: '#92400e' }} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, color: '#1a1a1a', width: 22, textAlign: 'right', flexShrink: 0 }}>{score ?? '—'}</span>
                <span style={{ fontSize: 10, color: COM_C.txtSub, width: 28, textAlign: 'right', flexShrink: 0 }}>{peso}</span>
              </div>
            ))}
            {!snapshot && <p style={{ fontSize: 12, color: COM_C.txtSub }}>Sem dados.</p>}
          </div>
          <div style={s.card}>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Contexto</div>
            {[
              { label: 'Deságio médio moageiras', valor: deságioMedio(), cor: '#993C1D' },
              { label: 'Melhor oferta hoje',       valor: melhorOferta(), cor: '#1a1a1a' },
              { label: 'Último praticado (coop.)', valor: ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_cooperado) + '/arr.' : '—', cor: '#635BFF' },
              { label: 'Último praticado (ext.)',  valor: ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_externo) + '/arr.' : '—', cor: '#92400e' },
            ].map(({ label, valor, cor }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 9 }}>
                <span style={{ fontSize: 12, color: '#374151', minWidth: 0 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: cor, textAlign: 'right', flexShrink: 0, maxWidth: '55%', wordBreak: 'break-word' }}>{valor}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ fontSize: 11, color: COM_C.txtSub, textAlign: 'center', marginTop: 8 }}>
          Mercado: precodocacau.com.br · Moageiras: cadastro manual · BCB · ICCO · NOAA · CFTC
        </div>
      </div>
    </div>
  )
}
