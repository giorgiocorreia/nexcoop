'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { CotaCooperado, CotaIntegralizacao, StatusCota } from '@/types/database'

const STATUS_COTA: Record<StatusCota, { label: string; cor: string; bg: string }> = {
  integralizada: { label: 'Integralizada', cor: '#166534', bg: '#dcfce7' },
  parcial:       { label: 'Parcial',       cor: '#92400e', bg: '#fef3c7' },
  pendente:      { label: 'Pendente',      cor: '#374151', bg: '#f3f4f6' },
}

function formatarMoeda(v: number | null | undefined) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatarData(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR')
}

function StatusBadge({ status }: { status: StatusCota }) {
  const s = STATUS_COTA[status] ?? STATUS_COTA.pendente
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      fontSize: '12px', fontWeight: '600', padding: '3px 10px', borderRadius: '12px',
      color: s.cor, background: s.bg,
    }}>
      <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: s.cor, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

interface Props {
  cooperadoId: string
  orgId:       string
}

export default function CotasSection({ cooperadoId, orgId }: Props) {
  const [cota, setCota]               = useState<CotaCooperado | null>(null)
  const [hist, setHist]               = useState<CotaIntegralizacao[]>([])
  const [capitalTotal, setCapitalTotal] = useState(0)
  const [carregando, setCarregando]   = useState(true)
  const [editando, setEditando]       = useState(false)
  const [form, setForm]               = useState({ quantidade: '0', valor_cota: '', status: 'pendente' as StatusCota })
  const [salvando, setSalvando]       = useState(false)
  const [showFormInt, setShowFormInt] = useState(false)
  const [formInt, setFormInt]         = useState({ data: '', quantidade: '1', valor_pago: '' })
  const [salvandoInt, setSalvandoInt] = useState(false)
  const [removendoId, setRemovendoId] = useState<string | null>(null)
  const [erro, setErro]               = useState<string | null>(null)

  const carregarDados = useCallback(async () => {
    setCarregando(true)
    const supabase = createClient()
    const [{ data: cotaData }, { data: histData }, { data: totaisData }] = await Promise.all([
      supabase.from('cotas_cooperado').select('*').eq('cooperado_id', cooperadoId).maybeSingle(),
      supabase.from('cotas_integralizacao').select('*').eq('cooperado_id', cooperadoId).order('data', { ascending: false }),
      supabase.from('cotas_cooperado').select('quantidade, valor_cota').eq('organizacao_id', orgId),
    ])
    setCota(cotaData ?? null)
    setHist(histData ?? [])
    if (cotaData) {
      setForm({
        quantidade: String(cotaData.quantidade),
        valor_cota: String(cotaData.valor_cota),
        status:     cotaData.status as StatusCota,
      })
    }
    const total = (totaisData ?? []).reduce(
      (sum, c) => sum + Number(c.quantidade) * Number(c.valor_cota), 0
    )
    setCapitalTotal(total)
    setCarregando(false)
  }, [cooperadoId, orgId])

  useEffect(() => { carregarDados() }, [carregarDados])

  function iniciarEditar() {
    if (cota) {
      setForm({ quantidade: String(cota.quantidade), valor_cota: String(cota.valor_cota), status: cota.status as StatusCota })
    } else {
      setForm({ quantidade: '0', valor_cota: '', status: 'pendente' })
    }
    setEditando(true)
    setErro(null)
  }

  async function salvarCotas() {
    setSalvando(true)
    setErro(null)
    const supabase = createClient()
    const payload = {
      quantidade:    parseInt(form.quantidade, 10)               || 0,
      valor_cota:    parseFloat(form.valor_cota.replace(',', '.')) || 0,
      status:        form.status,
      atualizado_em: new Date().toISOString(),
    }
    const { error } = cota
      ? await supabase.from('cotas_cooperado').update(payload).eq('id', cota.id)
      : await supabase.from('cotas_cooperado').insert({ ...payload, cooperado_id: cooperadoId, organizacao_id: orgId })
    if (error) {
      setErro(error.message)
    } else {
      await carregarDados()
      setEditando(false)
    }
    setSalvando(false)
  }

  async function adicionarIntegralizacao() {
    if (!cota || !formInt.data) return
    setSalvandoInt(true)
    setErro(null)
    const supabase = createClient()
    const { error } = await supabase.from('cotas_integralizacao').insert({
      cota_id:       cota.id,
      cooperado_id:  cooperadoId,
      organizacao_id: orgId,
      data:          formInt.data,
      quantidade:    parseInt(formInt.quantidade, 10) || 1,
      valor_pago:    parseFloat(String(formInt.valor_pago).replace(',', '.')) || 0,
    })
    if (error) {
      setErro(error.message)
    } else {
      setFormInt({ data: '', quantidade: '1', valor_pago: '' })
      setShowFormInt(false)
      await carregarDados()
    }
    setSalvandoInt(false)
  }

  async function removerIntegralizacao(id: string) {
    setRemovendoId(id)
    const supabase = createClient()
    await supabase.from('cotas_integralizacao').delete().eq('id', id)
    setHist(prev => prev.filter(i => i.id !== id))
    setRemovendoId(null)
  }

  const previewCapital = (parseInt(form.quantidade, 10) || 0) *
    (parseFloat(form.valor_cota.replace(',', '.')) || 0)

  const capitalSocial = cota
    ? Number(cota.quantidade) * Number(cota.valor_cota)
    : 0

  if (carregando) {
    return (
      <div style={{ marginTop: '12px', background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
        <div style={{ fontSize: '12px', color: '#aaa' }}>Carregando cotas…</div>
      </div>
    )
  }

  return (
    <div style={{ marginTop: '12px', background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          💰 Cotas de Participação
        </div>
        {!editando && cota && (
          <button onClick={iniciarEditar} style={btnEditar}>✏ Editar</button>
        )}
      </div>

      {/* Erro */}
      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#dc2626', marginBottom: '12px' }}>
          {erro}
        </div>
      )}

      {/* ── Formulário de edição ────────────────────────────────────────── */}
      {editando && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '8px' }}>
            <div>
              <label style={labelStyle}>Quantidade de cotas</label>
              <input
                type="number" min="0"
                value={form.quantidade}
                onChange={e => setForm(p => ({ ...p, quantidade: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Valor por cota (R$)</label>
              <input
                type="text" inputMode="decimal" placeholder="0,00"
                value={form.valor_cota}
                onChange={e => setForm(p => ({ ...p, valor_cota: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={form.status}
                onChange={e => setForm(p => ({ ...p, status: e.target.value as StatusCota }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="pendente">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="integralizada">Integralizada</option>
              </select>
            </div>
          </div>
          <div style={{ fontSize: '12px', color: '#888', marginBottom: '14px' }}>
            Capital social: <strong style={{ color: '#1a1a1a' }}>{formatarMoeda(previewCapital)}</strong>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={salvarCotas} disabled={salvando} style={btnPrimary}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            <button onClick={() => { setEditando(false); setErro(null) }} style={btnSecondary}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Estado vazio ────────────────────────────────────────────────── */}
      {!editando && !cota && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#888', fontSize: '13px' }}>
          <div style={{ marginBottom: '10px' }}>Nenhuma cota registrada para este cooperado.</div>
          <button onClick={iniciarEditar} style={btnPrimary}>+ Configurar cotas</button>
        </div>
      )}

      {/* ── Visualização ────────────────────────────────────────────────── */}
      {!editando && cota && (
        <>
          {/* Cards de resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '14px' }}>
            <div style={summaryCard}>
              <div style={summaryLabel}>Cotas</div>
              <div style={summaryValue}>{Number(cota.quantidade).toLocaleString('pt-BR')}</div>
            </div>
            <div style={summaryCard}>
              <div style={summaryLabel}>Valor por cota</div>
              <div style={summaryValue}>{formatarMoeda(Number(cota.valor_cota))}</div>
            </div>
            <div style={{ ...summaryCard, background: '#f0fdf9', border: '1px solid #a7f3d0' }}>
              <div style={summaryLabel}>Capital social</div>
              <div style={{ ...summaryValue, color: '#166534' }}>{formatarMoeda(capitalSocial)}</div>
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <StatusBadge status={cota.status as StatusCota} />
          </div>

          {/* ── Histórico de integralização ─────────────────────────────── */}
          <div style={{ borderTop: '1px solid #f0eeea', paddingTop: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <span style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Histórico de Integralização
              </span>
              {!showFormInt && (
                <button
                  onClick={() => { setShowFormInt(true); setFormInt({ data: '', quantidade: '1', valor_pago: '' }); setErro(null) }}
                  style={{ fontSize: '12px', fontWeight: '500', padding: '3px 10px', borderRadius: '6px', background: '#EEF0FF', color: '#4840CC', border: 'none', cursor: 'pointer' }}
                >
                  + Registrar
                </button>
              )}
            </div>

            {/* Formulário de nova integralização */}
            {showFormInt && (
              <div style={{ background: '#f8f7f4', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  <div>
                    <label style={labelStyle}>Data</label>
                    <input
                      type="date"
                      value={formInt.data}
                      onChange={e => setFormInt(p => ({ ...p, data: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Qtd. de cotas</label>
                    <input
                      type="number" min="1"
                      value={formInt.quantidade}
                      onChange={e => setFormInt(p => ({ ...p, quantidade: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Valor pago (R$)</label>
                    <input
                      type="text" inputMode="decimal" placeholder="0,00"
                      value={formInt.valor_pago}
                      onChange={e => setFormInt(p => ({ ...p, valor_pago: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={adicionarIntegralizacao} disabled={salvandoInt || !formInt.data} style={btnPrimary}>
                    {salvandoInt ? 'Salvando…' : 'Salvar'}
                  </button>
                  <button onClick={() => setShowFormInt(false)} style={btnSecondary}>Cancelar</button>
                </div>
              </div>
            )}

            {/* Lista */}
            {hist.length === 0 && !showFormInt && (
              <div style={{ fontSize: '12px', color: '#aaa' }}>Nenhuma integralização registrada.</div>
            )}
            {hist.map(item => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f5f3ef' }}>
                <div style={{ display: 'flex', gap: '20px', fontSize: '13px' }}>
                  <span style={{ color: '#888', minWidth: '86px' }}>{formatarData(item.data)}</span>
                  <span style={{ color: '#1a1a1a' }}>
                    {Number(item.quantidade)} {Number(item.quantidade) === 1 ? 'cota' : 'cotas'}
                  </span>
                  <span style={{ fontWeight: '600', color: '#166534' }}>{formatarMoeda(Number(item.valor_pago))}</span>
                </div>
                <button
                  onClick={() => removerIntegralizacao(item.id)}
                  disabled={removendoId === item.id}
                  title="Remover"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#ccc', padding: '2px 6px', borderRadius: '4px', lineHeight: 1 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = '#991b1b' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = '#ccc' }}
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Capital total da cooperativa */}
          {capitalTotal > 0 && (
            <div style={{ marginTop: '14px', paddingTop: '12px', borderTop: '1px solid #f0eeea', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '12px', color: '#888' }}>Capital social total da cooperativa:</span>
              <span style={{ fontSize: '15px', fontWeight: '700', color: '#166534' }}>{formatarMoeda(capitalTotal)}</span>
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: '13px',
  border: '1px solid #d5d3cc', borderRadius: '7px',
  background: '#fff', color: '#1a1a1a', outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: '11px', fontWeight: '600',
  color: '#888', marginBottom: '5px',
}

const summaryCard: React.CSSProperties = {
  background: '#f8f7f4', border: '1px solid #e5e3dc',
  borderRadius: '8px', padding: '10px 14px',
}

const summaryLabel: React.CSSProperties = {
  fontSize: '11px', color: '#888', fontWeight: '500', marginBottom: '4px',
}

const summaryValue: React.CSSProperties = {
  fontSize: '18px', fontWeight: '700', color: '#1a1a1a',
}

const btnPrimary: React.CSSProperties = {
  padding: '7px 16px', fontSize: '13px', fontWeight: '600',
  background: '#1D9E75', color: '#fff', border: 'none',
  borderRadius: '8px', cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '7px 16px', fontSize: '13px', fontWeight: '400',
  background: 'transparent', color: '#555',
  border: '1px solid #d5d3cc', borderRadius: '8px', cursor: 'pointer',
}

const btnEditar: React.CSSProperties = {
  fontSize: '12px', fontWeight: '500', padding: '4px 12px',
  borderRadius: '6px', background: '#f5f5f2', color: '#444',
  border: '1px solid #d5d3cc', cursor: 'pointer',
}
