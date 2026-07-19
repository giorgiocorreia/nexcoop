'use client'

import React, { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import type { CotaCooperado, CotaPagamento } from '@/types/database'
import { buscarCotas } from './cotas-actions'
import { updateCooperadoStatus } from './cotas-actions'
import { buscarPagamentos, registrarPagamentos, quitarParcela } from './pagamentos-actions'
import { gerarReciboCota } from './recibo-cota-actions'
import { ContentCard } from '@/components/nexcoop/ui'

type FormaPag = 'dinheiro' | 'pix' | 'cartao' | 'promessa'

type ParcelaForm = {
  valor_pago:      string
  forma_pagamento: FormaPag
  data_pagamento:  string
  data_vencimento: string
}

type QuitarForm = {
  forma_pagamento: 'dinheiro' | 'pix' | 'cartao'
  data_pagamento:  string
}

const HOJE = new Date().toISOString().split('T')[0]

function fmtBRL(v: number) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function downloadBase64Pdf(base64: string, filename: string) {
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const blob  = new Blob([bytes], { type: 'application/pdf' })
  const url   = URL.createObjectURL(blob)
  const a     = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const STATUS_BADGE: Record<string, { label: string; bg: string; cor: string }> = {
  pago:     { label: 'Pago',     bg: '#dcfce7', cor: '#166534' },
  pendente: { label: 'Pendente', bg: '#fef3c7', cor: '#92400e' },
  vencido:  { label: 'Vencido',  bg: '#fee2e2', cor: '#dc2626' },
}

const FORMA_LABEL: Record<string, string> = {
  dinheiro: 'Dinheiro', pix: 'PIX', cartao: 'Cartão', promessa: 'Promessa',
}

const TIPO_LABEL: Record<string, string> = {
  plena: 'Cota Plena', colaboradora: 'Cota Colaboradora',
}

interface Props {
  cooperadoId: string
  orgId:       string
  usuarioId:   string
}

const PagamentosSection = forwardRef<{ carregar: () => void }, Props>(
function PagamentosSection({ cooperadoId, orgId, usuarioId }, ref) {
  const [cotas, setCotas]                     = useState<CotaCooperado[]>([])
  const [pagsPorCota, setPagsPorCota]         = useState<Record<string, CotaPagamento[]>>({})
  const [carregando, setCarregando]           = useState(true)
  const [showForm, setShowForm]               = useState<Record<string, boolean>>({})
  const [formPorCota, setFormPorCota]         = useState<Record<string, ParcelaForm[]>>({})
  const [salvando, setSalvando]               = useState<string | null>(null)
  const [erroPorCota, setErroPorCota]         = useState<Record<string, string>>({})
  const [quitarState, setQuitarState]         = useState<Record<string, QuitarForm>>({})
  const [quitandoPag, setQuitandoPag]         = useState<string | null>(null)
  const [quitouModal, setQuitouModal]         = useState<{ tipoCota: string } | null>(null)
  const [definindoAtivo, setDefinindoAtivo]   = useState(false)
  const [reimprimindo, setReimprimindo]       = useState<string | null>(null)

  const novaParcelaForm = (): ParcelaForm => ({
    valor_pago: '', forma_pagamento: 'dinheiro', data_pagamento: HOJE, data_vencimento: '',
  })

  const carregar = useCallback(async () => {
    setCarregando(true)
    try {
      const cotasData = await buscarCotas(cooperadoId)
      const cotas = (cotasData as unknown as CotaCooperado[])
      setCotas(cotas)
      const pags: Record<string, CotaPagamento[]> = {}
      await Promise.all(cotas.map(async c => {
        const d = await buscarPagamentos(c.id)
        pags[c.id] = d as unknown as CotaPagamento[]
      }))
      setPagsPorCota(pags)
    } catch { /* silently fail */ }
    setCarregando(false)
  }, [cooperadoId])

  useEffect(() => { carregar() }, [carregar])

  useImperativeHandle(ref, () => ({ carregar }))

  function iniciarForm(cotaId: string) {
    setFormPorCota(prev => ({ ...prev, [cotaId]: [novaParcelaForm()] }))
    setShowForm(prev => ({ ...prev, [cotaId]: true }))
    setErroPorCota(prev => ({ ...prev, [cotaId]: '' }))
  }

  function addParcela(cotaId: string) {
    setFormPorCota(prev => ({
      ...prev,
      [cotaId]: [...(prev[cotaId] ?? []), novaParcelaForm()],
    }))
  }

  function updateParcela(cotaId: string, idx: number, field: keyof ParcelaForm, value: string) {
    setFormPorCota(prev => {
      const arr = [...(prev[cotaId] ?? [])]
      arr[idx] = { ...arr[idx], [field]: value }
      return { ...prev, [cotaId]: arr }
    })
  }

  function removeParcela(cotaId: string, idx: number) {
    setFormPorCota(prev => {
      const arr = [...(prev[cotaId] ?? [])]
      arr.splice(idx, 1)
      return { ...prev, [cotaId]: arr.length > 0 ? arr : [novaParcelaForm()] }
    })
  }

  function calcPreview(cotaId: string, cota: CotaCooperado) {
    const parcelas        = formPorCota[cotaId] ?? []
    const valorTotalCota  = Number(cota.quantidade) * Number(cota.valor_cota)
    const pagoAntes       = (pagsPorCota[cotaId] ?? [])
      .filter(p => p.status === 'pago')
      .reduce((s, p) => s + Number(p.valor_pago), 0)
    const pagoAgora       = parcelas
      .filter(p => p.forma_pagamento !== 'promessa')
      .reduce((s, p) => s + (parseFloat(p.valor_pago.replace(',', '.')) || 0), 0)
    const prometido       = parcelas
      .filter(p => p.forma_pagamento === 'promessa')
      .reduce((s, p) => s + (parseFloat(p.valor_pago.replace(',', '.')) || 0), 0)
    const restante        = Math.max(0, valorTotalCota - pagoAntes - pagoAgora - prometido)
    return { pagoAgora, prometido, restante }
  }

  async function handleSalvar(cotaId: string, cota: CotaCooperado) {
    const parcelas = formPorCota[cotaId] ?? []
    for (const p of parcelas) {
      const v = parseFloat(p.valor_pago.replace(',', '.')) || 0
      if (v <= 0) {
        setErroPorCota(prev => ({ ...prev, [cotaId]: 'Informe o valor de cada parcela.' }))
        return
      }
      if (p.forma_pagamento === 'promessa' && !p.data_vencimento) {
        setErroPorCota(prev => ({ ...prev, [cotaId]: 'Informe a data de vencimento para promessas.' }))
        return
      }
      if (p.forma_pagamento !== 'promessa' && !p.data_pagamento) {
        setErroPorCota(prev => ({ ...prev, [cotaId]: 'Informe a data do pagamento.' }))
        return
      }
    }

    setSalvando(cotaId)
    setErroPorCota(prev => ({ ...prev, [cotaId]: '' }))

    try {
      const rows = parcelas.map((p, i) => ({
        valor_pago:      parseFloat(p.valor_pago.replace(',', '.')) || 0,
        forma_pagamento: p.forma_pagamento,
        data_pagamento:  p.forma_pagamento !== 'promessa' ? p.data_pagamento : null,
        data_vencimento: p.forma_pagamento === 'promessa' ? p.data_vencimento : null,
        numero_parcela:  i + 1,
        total_parcelas:  parcelas.length,
      }))

      const result = await registrarPagamentos(cotaId, cooperadoId, orgId, usuarioId, rows)

      await carregar()
      setShowForm(prev => ({ ...prev, [cotaId]: false }))

      if (result.avisoCaixa) {
        setErroPorCota(prev => ({ ...prev, [cotaId]: `⚠️ ${result.avisoCaixa}` }))
      }

      if (result.quitou) {
        setQuitouModal({ tipoCota: cota.tipo_cota })
      }

      if (result.pagamentos && result.pagamentos.length > 0) {
        const pdfRows = (result.pagamentos as unknown as CotaPagamento[]).map(p => ({
          numero_parcela:  p.numero_parcela,
          total_parcelas:  p.total_parcelas,
          forma_pagamento: p.forma_pagamento,
          valor_pago:      Number(p.valor_pago),
          data_pagamento:  p.data_pagamento,
          data_vencimento: p.data_vencimento,
          status:          p.status,
          registrado_por:  p.registrado_por,
        }))
        const base64 = await gerarReciboCota(cooperadoId, cotaId, pdfRows)
        downloadBase64Pdf(base64, `recibo-cota-${cota.tipo_cota}-${HOJE}.pdf`)
      }
    } catch (e) {
      setErroPorCota(prev => ({ ...prev, [cotaId]: e instanceof Error ? e.message : 'Erro ao salvar.' }))
    } finally {
      setSalvando(null)
    }
  }

  async function handleQuitar(pagId: string, cotaId: string, cota: CotaCooperado) {
    const form = quitarState[pagId]
    if (!form?.data_pagamento) return
    setQuitandoPag(pagId)
    try {
      const result = await quitarParcela(pagId, cooperadoId, cotaId, form.forma_pagamento, form.data_pagamento)
      await carregar()
      setQuitarState(prev => { const n = { ...prev }; delete n[pagId]; return n })
      if (result.avisoCaixa) alert(`⚠️ ${result.avisoCaixa}`)
      if (result.quitou) setQuitouModal({ tipoCota: cota.tipo_cota })
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao quitar.')
    }
    setQuitandoPag(null)
  }

  async function handleReimprimir(cota: CotaCooperado) {
    setReimprimindo(cota.id)
    try {
      const pags = pagsPorCota[cota.id] ?? []
      const pdfRows = pags.map(p => ({
        numero_parcela:  p.numero_parcela,
        total_parcelas:  p.total_parcelas,
        forma_pagamento: p.forma_pagamento,
        valor_pago:      Number(p.valor_pago),
        data_pagamento:  p.data_pagamento,
        data_vencimento: p.data_vencimento,
        status:          p.status,
        registrado_por:  p.registrado_por,
      }))
      const base64 = await gerarReciboCota(cooperadoId, cota.id, pdfRows)
      downloadBase64Pdf(base64, `recibo-cota-${cota.tipo_cota}-${HOJE}.pdf`)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao gerar recibo.')
    }
    setReimprimindo(null)
  }

  async function handleDefinirAtivo() {
    setDefinindoAtivo(true)
    try {
      await updateCooperadoStatus(cooperadoId, 'ativo')
      setQuitouModal(null)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Erro ao atualizar status.')
    }
    setDefinindoAtivo(false)
  }

  if (carregando) {
    return (
      <div style={{ marginTop: 12 }}>
        <ContentCard title="Pagamentos de Cotas">
          <div style={{ fontSize: 12, color: '#aaa' }}>Carregando pagamentos…</div>
        </ContentCard>
      </div>
    )
  }

  if (cotas.length === 0) return null

  return (
    <>
      <div style={{ marginTop: 12 }}>
      <ContentCard title="Pagamentos de Cotas">

        {cotas.map((cota, cotaIdx) => {
          const pags      = pagsPorCota[cota.id] ?? []
          const isOpen    = showForm[cota.id] ?? false
          const parcelas  = formPorCota[cota.id] ?? [novaParcelaForm()]
          const preview   = calcPreview(cota.id, cota)
          const erro      = erroPorCota[cota.id] ?? ''
          const totalCota = Number(cota.quantidade) * Number(cota.valor_cota)

          return (
            <div key={cota.id} style={{ marginBottom: cotaIdx < cotas.length - 1 ? 0 : undefined }}>
              {/* Cabeçalho da cota */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: cota.tipo_cota === 'plena' ? '#635BFF' : '#E07B30', flexShrink: 0 }} />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1a1a1a' }}>{TIPO_LABEL[cota.tipo_cota]}</span>
                  <span style={{ fontSize: 12, color: '#aaa' }}>— {fmtBRL(totalCota)}</span>
                </div>
                {!isOpen && (
                  <div style={{ display: 'flex', gap: 8 }}>
                    {pags.length > 0 && (
                      <button
                        onClick={() => handleReimprimir(cota)}
                        disabled={reimprimindo === cota.id}
                        style={{
                          padding: '7px 14px', fontSize: 12, fontWeight: 500,
                          background: '#f5f5f2', color: '#444',
                          border: '1px solid #d5d3cc', borderRadius: 8, cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: 5,
                        }}
                      >
                        {reimprimindo === cota.id ? 'Gerando…' : '🖨 Recibo'}
                      </button>
                    )}
                    <button onClick={() => iniciarForm(cota.id)} style={btnPrimary}>
                      + Registrar pagamento
                    </button>
                  </div>
                )}
              </div>

              {/* Histórico */}
              {pags.length > 0 && (
                <div style={{ marginBottom: 14, overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #e5e3dc' }}>
                        {['Parcela', 'Forma', 'Valor', 'Data / Vencimento', 'Status', ''].map(h => (
                          <th key={h} style={th}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pags.map(p => {
                        const sb    = STATUS_BADGE[p.status] ?? STATUS_BADGE.pendente
                        const qForm = quitarState[p.id]
                        return (
                          <React.Fragment key={p.id}>
                            <tr style={{ borderBottom: '1px solid #f5f3ef' }}>
                              <td style={td}>{p.numero_parcela}/{p.total_parcelas}</td>
                              <td style={td}>{FORMA_LABEL[p.forma_pagamento] ?? p.forma_pagamento}</td>
                              <td style={{ ...td, fontWeight: 600 }}>{fmtBRL(Number(p.valor_pago))}</td>
                              <td style={td}>
                                {p.forma_pagamento === 'promessa' && p.data_vencimento
                                  ? `Vence ${fmtData(p.data_vencimento)}`
                                  : fmtData(p.data_pagamento)}
                              </td>
                              <td style={td}>
                                <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: sb.bg, color: sb.cor }}>
                                  {sb.label}
                                </span>
                              </td>
                              <td style={td}>
                                {(p.status === 'pendente' || p.status === 'vencido') && (
                                  <button
                                    onClick={() => {
                                      if (quitarState[p.id]) {
                                        setQuitarState(prev => { const n = { ...prev }; delete n[p.id]; return n })
                                      } else {
                                        setQuitarState(prev => ({ ...prev, [p.id]: { forma_pagamento: 'dinheiro', data_pagamento: HOJE } }))
                                      }
                                    }}
                                    style={{ fontSize: 11, padding: '3px 10px', background: '#E6F1FB', color: '#185FA5', border: '1px solid #93c5fd', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}
                                  >
                                    Quitar
                                  </button>
                                )}
                              </td>
                            </tr>
                            {qForm && (
                              <tr style={{ background: '#f8f7f4' }}>
                                <td colSpan={6} style={{ padding: '10px 14px' }}>
                                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
                                    <div>
                                      <label style={labelStyle}>Forma de pagamento</label>
                                      <select
                                        value={qForm.forma_pagamento}
                                        onChange={e => setQuitarState(prev => ({ ...prev, [p.id]: { ...prev[p.id], forma_pagamento: e.target.value as 'dinheiro' | 'pix' | 'cartao' } }))}
                                        style={{ ...inputStyle, width: 130 }}
                                      >
                                        <option value="dinheiro">Dinheiro</option>
                                        <option value="pix">PIX</option>
                                        <option value="cartao">Cartão</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label style={labelStyle}>Data do pagamento</label>
                                      <input
                                        type="date"
                                        value={qForm.data_pagamento}
                                        onChange={e => setQuitarState(prev => ({ ...prev, [p.id]: { ...prev[p.id], data_pagamento: e.target.value } }))}
                                        style={{ ...inputStyle, width: 140 }}
                                      />
                                    </div>
                                    <button
                                      onClick={() => handleQuitar(p.id, cota.id, cota)}
                                      disabled={quitandoPag === p.id}
                                      style={btnPrimary}
                                    >
                                      {quitandoPag === p.id ? 'Quitando…' : 'Confirmar quitação'}
                                    </button>
                                    <button
                                      onClick={() => setQuitarState(prev => { const n = { ...prev }; delete n[p.id]; return n })}
                                      style={btnSecondary}
                                    >
                                      Cancelar
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {pags.length === 0 && !isOpen && (
                <p style={{ fontSize: 12, color: '#bbb', paddingLeft: 18, marginBottom: 10 }}>
                  Nenhum pagamento registrado.
                </p>
              )}

              {/* Formulário novo pagamento */}
              {isOpen && (
                <div style={{ background: '#f8f7f4', border: '1px solid #e5e3dc', borderRadius: 10, padding: '14px 16px', marginTop: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 12 }}>
                    Novo pagamento
                  </div>

                  {parcelas.map((p, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr)) auto', gap: 10, marginBottom: 10, alignItems: 'flex-end' }}>
                      <div>
                        <label style={labelStyle}>Valor (R$)</label>
                        <input
                          type="text" inputMode="decimal" placeholder="0,00"
                          value={p.valor_pago}
                          onChange={e => updateParcela(cota.id, idx, 'valor_pago', e.target.value)}
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Forma</label>
                        <select
                          value={p.forma_pagamento}
                          onChange={e => updateParcela(cota.id, idx, 'forma_pagamento', e.target.value)}
                          style={{ ...inputStyle, cursor: 'pointer' }}
                        >
                          <option value="dinheiro">Dinheiro</option>
                          <option value="pix">PIX</option>
                          <option value="cartao">Cartão</option>
                          <option value="promessa">Promessa</option>
                        </select>
                      </div>
                      <div>
                        {p.forma_pagamento === 'promessa' ? (
                          <>
                            <label style={labelStyle}>Data de vencimento</label>
                            <input
                              type="date"
                              value={p.data_vencimento}
                              onChange={e => updateParcela(cota.id, idx, 'data_vencimento', e.target.value)}
                              style={inputStyle}
                            />
                          </>
                        ) : (
                          <>
                            <label style={labelStyle}>Data do pagamento</label>
                            <input
                              type="date"
                              value={p.data_pagamento}
                              onChange={e => updateParcela(cota.id, idx, 'data_pagamento', e.target.value)}
                              style={inputStyle}
                            />
                          </>
                        )}
                      </div>
                      <div style={{ paddingBottom: 1 }}>
                        {parcelas.length > 1 && (
                          <button
                            onClick={() => removeParcela(cota.id, idx)}
                            style={{ padding: '7px 10px', background: 'none', border: '1px solid #fca5a5', borderRadius: 6, color: '#dc2626', cursor: 'pointer', fontSize: 14, lineHeight: 1 }}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => addParcela(cota.id)}
                    style={{ fontSize: 12, color: '#635BFF', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginBottom: 12, display: 'block' }}
                  >
                    + Adicionar outra parcela
                  </button>

                  {/* Preview */}
                  <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 8, padding: '10px 14px', marginBottom: 12, fontSize: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                    <span>Pago agora: <strong style={{ color: '#166534' }}>{fmtBRL(preview.pagoAgora)}</strong></span>
                    {preview.prometido > 0 && (
                      <span>Prometido: <strong style={{ color: '#92400e' }}>{fmtBRL(preview.prometido)}</strong></span>
                    )}
                    <span>Total: <strong>{fmtBRL(preview.pagoAgora + preview.prometido)}</strong></span>
                    <span>Restante: <strong style={{ color: preview.restante <= 0 ? '#166534' : '#dc2626' }}>{fmtBRL(preview.restante)}</strong></span>
                  </div>

                  {erro && (
                    <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 10 }}>
                      {erro}
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => handleSalvar(cota.id, cota)}
                      disabled={salvando === cota.id}
                      style={btnPrimary}
                    >
                      {salvando === cota.id ? 'Salvando…' : '💾 Salvar e emitir recibo'}
                    </button>
                    <button
                      onClick={() => setShowForm(prev => ({ ...prev, [cota.id]: false }))}
                      style={btnSecondary}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {cotaIdx < cotas.length - 1 && (
                <div style={{ borderTop: '1px solid #f0eeea', margin: '16px 0' }} />
              )}
            </div>
          )
        })}
      </ContentCard>
      </div>

      {/* Modal de quitação total */}
      {quitouModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '2rem', maxWidth: 420, width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>✅</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1a1a1a', margin: '0 0 10px' }}>
              Cota integralizada!
            </h3>
            <p style={{ fontSize: 14, color: '#666', margin: '0 0 22px', lineHeight: 1.6 }}>
              O cooperado integralizou a última parcela da <strong>{TIPO_LABEL[quitouModal.tipoCota] ?? quitouModal.tipoCota}</strong>.{' '}
              Deseja definir o status do cooperado como <strong>Ativo</strong>?
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button
                onClick={handleDefinirAtivo}
                disabled={definindoAtivo}
                style={{ ...btnPrimary, padding: '10px 22px', fontSize: 14 }}
              >
                {definindoAtivo ? 'Atualizando…' : 'Sim, definir como Ativo'}
              </button>
              <button
                onClick={() => setQuitouModal(null)}
                style={{ ...btnSecondary, padding: '10px 22px', fontSize: 14 }}
              >
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
})
export default PagamentosSection

// ── Estilos ────────────────────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '7px 10px',
  fontSize: 13,
  border: '1px solid #d5d3cc',
  borderRadius: 7,
  background: '#fff',
  color: '#1a1a1a',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 11,
  fontWeight: 600,
  color: '#888',
  marginBottom: 5,
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 600,
  background: '#1D9E75',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '7px 16px',
  fontSize: 13,
  fontWeight: 400,
  background: 'transparent',
  color: '#555',
  border: '1px solid #d5d3cc',
  borderRadius: 8,
  cursor: 'pointer',
}

const th: React.CSSProperties = {
  textAlign: 'left',
  padding: '6px 8px',
  fontSize: 11,
  fontWeight: 600,
  color: '#888',
  whiteSpace: 'nowrap',
}

const td: React.CSSProperties = {
  padding: '8px 8px',
  fontSize: 12,
  color: '#1a1a1a',
  verticalAlign: 'middle',
}
