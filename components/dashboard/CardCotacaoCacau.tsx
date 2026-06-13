'use client'

import { useState, useTransition } from 'react'
import { Btn } from '@/components/ui/Btn'
import {
  salvarConfigPrecosSugeridos,
  aplicarCotacaoSugerida,
} from '@/lib/dashboard/cotacoes-mercado-actions'
import { TradingViewMiniWidget } from '@/components/dashboard/TradingViewMiniWidget'
import type { CotacaoMercadoExterno, ConfigPrecosSugeridos } from '@/types/database'

interface Props {
  cepea: CotacaoMercadoExterno | null
  iceNy: CotacaoMercadoExterno | null
  tendencia: CotacaoMercadoExterno[]
  config: (ConfigPrecosSugeridos & { produto: { id: string; nome: string } }) | null
}

export function CardCotacaoCacau({ cepea, iceNy, tendencia, config }: Props) {
  const [pctCooperado, setPctCooperado] = useState(
    config?.percentual_cooperado ?? 95
  )
  const [pctExterno, setPctExterno] = useState(config?.percentual_externo ?? 90)
  const [isPending, startTransition] = useTransition()
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  // Base de cálculo: CEPEA (BRL/arroba ÷ 15 = BRL/kg) ou ICE convertido
  const baseKg = cepea?.preco_brl
    ? cepea.preco_brl / 15
    : iceNy?.preco_usd && iceNy?.cambio_usd_brl
    ? (iceNy.preco_usd / 1000) * iceNy.cambio_usd_brl
    : null

  const precoCooperado = baseKg != null ? Math.round(baseKg * (pctCooperado / 100) * 100) / 100 : null
  const precoExterno   = baseKg != null ? Math.round(baseKg * (pctExterno   / 100) * 100) / 100 : null

  // Tendência CEPEA vs 7 dias atrás
  const cepeaHist   = tendencia.filter(t => t.fonte === 'cepea')
  const cepeaAntigo = cepeaHist[0]?.preco_brl
  const tendPct =
    cepeaAntigo && cepea?.preco_brl
      ? ((cepea.preco_brl - cepeaAntigo) / cepeaAntigo) * 100
      : null

  const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  const fmtData = (iso: string) =>
    new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

  function handleAplicar() {
    if (!config || precoCooperado == null || precoExterno == null) return
    setErro('')
    setSucesso(false)
    startTransition(async () => {
      try {
        await salvarConfigPrecosSugeridos({
          produto_id: config.produto.id,
          percentual_cooperado: pctCooperado,
          percentual_externo: pctExterno,
        })
        await aplicarCotacaoSugerida({
          produto_id: config.produto.id,
          preco_cooperado: precoCooperado,
          preco_externo: precoExterno,
        })
        setSucesso(true)
        setTimeout(() => setSucesso(false), 4000)
      } catch {
        setErro('Erro ao aplicar cotação. Tente novamente.')
      }
    })
  }

  const semDados = !cepea && !iceNy

  if (!config) {
    return (
      <div style={cardStyle}>
        <div style={headerStyle}>
          <span style={{ fontSize: '16px' }}>🍫</span>
          <span style={tituloStyle}>Cotação do Cacau</span>
        </div>
        <p style={{ fontSize: '13px', color: '#888', marginTop: '8px' }}>
          Nenhum produto com "cacau" no nome encontrado.
          Cadastre um produto para ativar este card.
        </p>
      </div>
    )
  }

  return (
    <div style={cardStyle}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🍫</span>
          <span style={tituloStyle}>Cotação do Cacau</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#999', background: '#f5f4f0', padding: '2px 8px', borderRadius: '99px' }}>
            {config.produto.nome}
          </span>
          {cepea?.coletado_em && (
            <span style={{ fontSize: '11px', color: '#bbb' }}>
              atualizado {new Date(cepea.coletado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {/* 1. Referência de mercado em Tempo Real */}
      <div style={{ marginBottom: '14px', paddingBottom: '14px', borderBottom: '1px solid #f0eeea' }}>
        <div style={{ fontSize: '10px', fontWeight: '600', color: '#bbb', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}>
          Referência de mercado em Tempo Real
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <div style={azulCardStyle}>
            <TradingViewMiniWidget symbol="COCOA" />
          </div>
          <div style={azulCardStyle}>
            <TradingViewMiniWidget symbol="FX_IDC:USDBRL" />
          </div>
        </div>
      </div>

      {semDados ? (
        <div style={{ padding: '16px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#aaa' }}>
            Nenhuma cotação coletada ainda. O cron roda a cada 6 horas.
          </p>
        </div>
      ) : (
        <>
          {/* 2. Preços de mercado */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
            {/* Cacau Bahia */}
            <div style={azulCardStyle}>
              <div style={cardLabelStyle}>Cacau Bahia (BRL/arroba)</div>
              {cepea?.preco_brl ? (
                <>
                  <div style={cardValueStyle}>R$ {fmtBRL(cepea.preco_brl)}</div>
                  <div style={cardSecondaryStyle}>
                    R$ {fmtBRL(cepea.preco_brl / 15)}/kg
                    {cepea.data_referencia && ` · ${fmtData(cepea.data_referencia)}`}
                  </div>
                  {tendPct != null && (
                    <div style={{ fontSize: '11px', marginTop: '4px', color: tendPct >= 0 ? '#1D9E75' : '#993C1D', fontWeight: '600' }}>
                      {tendPct >= 0 ? '↑' : '↓'} {Math.abs(tendPct).toFixed(1)}% vs 7 dias
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: '13px', color: '#aaa' }}>—</div>
              )}
            </div>

            {/* ICE NY */}
            <div style={azulCardStyle}>
              <div style={cardLabelStyle}>ICE NY (USD/ton)</div>
              {iceNy?.preco_usd ? (
                <>
                  <div style={cardValueStyle}>
                    $ {Math.round(iceNy.preco_usd).toLocaleString('pt-BR')}
                  </div>
                  <div style={cardSecondaryStyle}>
                    {iceNy.cambio_usd_brl
                      ? `Câmbio: R$ ${fmtBRL(iceNy.cambio_usd_brl)}/USD`
                      : 'câmbio indisponível'}
                    {iceNy.data_referencia && ` · ${fmtData(iceNy.data_referencia)}`}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: '13px', color: '#aaa' }}>—</div>
              )}
            </div>
          </div>

          {/* Linha separadora */}
          <div style={{ borderTop: '1px solid #f0eeea', marginBottom: '14px' }} />

          {/* 3. Sugestão de preços */}
          <div style={{ fontSize: '12px', fontWeight: '600', color: '#555', marginBottom: '10px' }}>
            Sugestão de preços
            {baseKg != null && (
              <span style={{ fontWeight: '400', color: '#999', marginLeft: '6px' }}>
                base: R$ {fmtBRL(baseKg)}/kg {cepea?.preco_brl ? '(Cacau Bahia)' : '(ICE convertido)'}
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={labelStyle}>Cooperado (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min={1}
                  max={200}
                  step={0.5}
                  value={pctCooperado}
                  onChange={e => setPctCooperado(Number(e.target.value))}
                  style={inputStyle}
                />
                {precoCooperado != null && (
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#1D9E75', whiteSpace: 'nowrap' }}>
                    R$ {fmtBRL(precoCooperado)}/kg
                  </span>
                )}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Externo (%)</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="number"
                  min={1}
                  max={200}
                  step={0.5}
                  value={pctExterno}
                  onChange={e => setPctExterno(Number(e.target.value))}
                  style={inputStyle}
                />
                {precoExterno != null && (
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#92400e', whiteSpace: 'nowrap' }}>
                    R$ {fmtBRL(precoExterno)}/kg
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
            {sucesso && (
              <span style={{ fontSize: '12px', color: '#1D9E75', fontWeight: '500' }}>
                ✓ Cotação aplicada com sucesso
              </span>
            )}
            {erro && (
              <span style={{ fontSize: '12px', color: '#993C1D' }}>{erro}</span>
            )}
            <Btn
              variante="cinza"
              tamanho="md"
              icone="ti-refresh"
              onClick={handleAplicar}
              disabled={isPending || baseKg == null}
            >
              {isPending ? 'Aplicando…' : 'Aplicar cotação'}
            </Btn>
          </div>
        </>
      )}
    </div>
  )
}

// ── Estilos locais ───────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: '#fff',
  border: '1px solid #e5e3dc',
  borderRadius: '12px',
  padding: '1.25rem',
  marginTop: '16px',
}

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  marginBottom: '12px',
}

const tituloStyle: React.CSSProperties = {
  fontSize: '15px',
  fontWeight: '600',
  color: '#1a1a1a',
}

const azulCardStyle: React.CSSProperties = {
  background: '#E6F1FB',
  borderRadius: '12px',
  padding: '1rem',
}

const cardLabelStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: '500',
  color: '#185FA5',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBottom: '4px',
}

const cardValueStyle: React.CSSProperties = {
  fontSize: '24px',
  fontWeight: '500',
  color: '#042C53',
}

const cardSecondaryStyle: React.CSSProperties = {
  fontSize: '12px',
  color: '#185FA5',
  marginTop: '2px',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  color: '#888',
  marginBottom: '4px',
  fontWeight: '500',
}

const inputStyle: React.CSSProperties = {
  width: '70px',
  padding: '5px 8px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: 'inherit',
  color: '#374151',
}
