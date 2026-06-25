'use client'

import { useTransition, useState } from 'react'
import { atualizarIndiceNex, registrarCotacaoMoageira } from '@/lib/dashboard/indice-nex.actions'

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

export function IndiceNex({ snapshot, sinais, cotacoes, ultimasCotacoesOrg, precoBahia, usdBrl }: Props) {
  const [isPending, startTransition] = useTransition()
  const [moageiraSel, setMoageiraSel] = useState('barry_callebaut')
  const [precoInput, setPrecoInput] = useState('')
  const [salvando, setSalvando] = useState(false)

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
        await registrarCotacaoMoageira({ moageira: moageiraSel as 'barry_callebaut' | 'cargill' | 'olam', preco_brl: preco })
        setPrecoInput('')
      } finally {
        setSalvando(false)
      }
    })
  }

  const s = { card: { background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1.25rem' } }

  return (
    <div style={{ marginTop: 4 }}>
      {/* Topbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#92400e' }} />
          <span style={{ fontSize: 13, fontWeight: 500, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Índice Nex — mercado cacau
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, color: '#aaa' }}>
            {snapshot
              ? `Atualizado às ${new Date(snapshot.calculado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`
              : 'Nunca atualizado'}
          </span>
          <button
            onClick={() => startTransition(async () => { await atualizarIndiceNex() })}
            disabled={isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', fontSize: 12, fontWeight: 500, color: '#92400e', background: 'transparent', border: '1px solid #92400e', borderRadius: 8, cursor: isPending ? 'not-allowed' : 'pointer', opacity: isPending ? 0.6 : 1 }}
          >
            <i className="ti ti-refresh" style={{ fontSize: 13 }} aria-hidden="true" />
            {isPending ? 'Atualizando…' : 'Atualizar agora'}
          </button>
          <a href="/comercializacao/painel" style={{ fontSize: 11, color: '#92400e', textDecoration: 'none' }}>
            ver painel completo →
          </a>
        </div>
      </div>

      {/* Grid 3 colunas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,0.85fr) minmax(0,1.3fr) minmax(0,0.85fr)', gap: 12 }}>

        {/* Card Índice */}
        <div style={{ background: '#E6F1FB', border: '1px solid #B5D4F4', borderRadius: 12, padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 500, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Índice Nex</div>
            <div style={{ fontSize: 36, fontWeight: 500, color: '#042C53', lineHeight: 1 }}>
              {snapshot?.score_final ?? '—'} <span style={{ fontSize: 14, color: '#185FA5', fontWeight: 400 }}>/ 100</span>
            </div>
            <div style={{ fontSize: 12, color: '#185FA5', marginTop: 2 }}>
              {snapshot ? FAIXA_LABEL[snapshot.faixa] : 'Clique em atualizar'}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
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

        {/* Card Preços */}
        <div style={s.card}>
          {/* Mercado público */}
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

          {/* Moageiras */}
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
                  <span style={{ fontSize: 10, color: '#aaa', display: 'block' }}>
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
                    <span style={{ fontSize: 12, color: '#aaa' }}>—</span>
                  )}
                </div>
              </div>
            )
          })}
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <select value={moageiraSel} onChange={e => setMoageiraSel(e.target.value)}
              style={{ flex: 1, fontSize: 12, padding: '5px 8px', border: '1px solid #e5e3dc', borderRadius: 6, background: '#f8f7f4' }}>
              <option value="barry_callebaut">Barry Callebaut</option>
              <option value="cargill">Cargill</option>
              <option value="olam">Olam / OFI</option>
            </select>
            <input type="text" placeholder="R$/arroba" value={precoInput} onChange={e => setPrecoInput(e.target.value)}
              style={{ width: 90, fontSize: 12, padding: '5px 8px', border: '1px solid #e5e3dc', borderRadius: 6, textAlign: 'right' }} />
            <button onClick={handleRegistrar} disabled={salvando || !precoInput}
              style={{ fontSize: 11, fontWeight: 500, padding: '5px 10px', border: '1px solid #92400e', borderRadius: 6, background: 'transparent', color: '#92400e', cursor: 'pointer', whiteSpace: 'nowrap', opacity: salvando ? 0.6 : 1 }}>
              {salvando ? '…' : 'Registrar'}
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f0eeea', margin: '12px 0' }} />

          {/* Preços org */}
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
              <span style={{ fontSize: 11, color: '#aaa', width: 48 }}>
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
            <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: '8px 0' }}>Nenhuma cotação registrada.</p>
          )}
        </div>

        {/* Card Notícias */}
        <div style={s.card}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
            Notícias relevantes
          </div>
          {sinais.filter(s => s.titulo).slice(0, 4).map((sinal, i, arr) => (
            <div key={i} style={{ paddingBottom: 9, marginBottom: 9, borderBottom: i < arr.length - 1 ? '1px solid #f0eeea' : 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 3 }}>
                <ImpactoBadge impacto={sinal.impacto} />
                <span style={{ fontSize: 10, color: '#aaa' }}>{sinal.dimensao}</span>
                <span style={{ fontSize: 10, color: '#aaa', marginLeft: 'auto' }}>
                  {new Date(sinal.coletado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
              <div style={{ fontSize: 12, color: '#374151', lineHeight: 1.45, marginBottom: 3 }}>{sinal.titulo}</div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 10, color: '#aaa' }}>{sinal.fonte}</span>
                {sinal.url && (
                  <a href={sinal.url} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 10, color: '#185FA5', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 2 }}>
                    ler <i className="ti ti-external-link" style={{ fontSize: 10 }} aria-hidden="true" />
                  </a>
                )}
              </div>
            </div>
          ))}
          {sinais.filter(s => s.titulo).length === 0 && (
            <p style={{ fontSize: 12, color: '#aaa', textAlign: 'center', padding: '1rem 0' }}>
              Sem notícias ainda. Clique em &quot;Atualizar agora&quot;.
            </p>
          )}
        </div>
      </div>

      {/* Bottom: Dimensões + Contexto */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
        <div style={s.card}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Dimensões do índice</div>
          {snapshot && ([
            { nome: 'Oferta mundial',   score: snapshot.score_oferta,     peso: '40%' },
            { nome: 'Demanda mundial',  score: snapshot.score_demanda,    peso: '30%' },
            { nome: 'Merc. financeiro', score: snapshot.score_financeiro, peso: '20%' },
            { nome: 'Macroeconomia',    score: snapshot.score_macro,      peso: '10%' },
          ] as const).map(({ nome, score, peso }) => (
            <div key={nome} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 9 }}>
              <span style={{ fontSize: 12, color: '#374151', width: 92, flexShrink: 0 }}>{nome}</span>
              <div style={{ flex: 1, height: 5, background: '#f0eeea', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${score ?? 50}%`, height: '100%', borderRadius: 3, background: '#92400e' }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 500, color: '#1a1a1a', width: 22, textAlign: 'right' }}>{score ?? '—'}</span>
              <span style={{ fontSize: 10, color: '#aaa', width: 28, textAlign: 'right' }}>{peso}</span>
            </div>
          ))}
          {!snapshot && <p style={{ fontSize: 12, color: '#aaa' }}>Sem dados.</p>}
        </div>
        <div style={s.card}>
          <div style={{ fontSize: 11, fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Contexto</div>
          {[
            { label: 'Deságio médio moageiras', valor: deságioMedio(), cor: '#993C1D' },
            { label: 'Melhor oferta hoje',       valor: melhorOferta(), cor: '#1a1a1a' },
            { label: 'Último praticado (coop.)', valor: ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_cooperado) + '/arr.' : '—', cor: '#635BFF' },
            { label: 'Último praticado (ext.)',  valor: ultimasCotacoesOrg[0] ? fmt(ultimasCotacoesOrg[0].preco_externo) + '/arr.' : '—', cor: '#92400e' },
          ].map(({ label, valor, cor }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 9 }}>
              <span style={{ fontSize: 12, color: '#374151' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: cor }}>{valor}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ fontSize: 11, color: '#bbb', textAlign: 'center', marginTop: 8 }}>
        Mercado: precodocacau.com.br · Moageiras: cadastro manual · BCB · ICCO · NOAA · CFTC
      </div>
    </div>
  )
}
