'use client'

import React, { useState, useEffect, useCallback } from 'react'
import type { TipoCota, StatusCota, CotaCooperado, GrupoColaborador } from '@/types/database'
import {
  buscarCotas, buscarGrupos, salvarCota, removerCota, criarGrupo
} from './cotas-actions'

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_COTA: Record<StatusCota, { label: string; cor: string; bg: string }> = {
  integralizada: { label: 'Integralizada', cor: '#166534', bg: '#dcfce7' },
  parcial:       { label: 'Parcial',       cor: '#92400e', bg: '#fef3c7' },
  pendente:      { label: 'Pendente',      cor: '#374151', bg: '#f3f4f6' },
}

function moeda(v: number | null | undefined) {
  if (v == null) return '—'
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function StatusBadge({ status }: { status: StatusCota }) {
  const s = STATUS_COTA[status] ?? STATUS_COTA.pendente
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 12, color: s.cor, background: s.bg }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: s.cor, flexShrink: 0 }} />
      {s.label}
    </span>
  )
}

// ── Tipos locais ──────────────────────────────────────────────────────────────
type CotaComGrupo = CotaCooperado & {
  grupo?: Pick<GrupoColaborador, 'id' | 'nome' | 'cnpj'> | null
}

type FormCota = {
  quantidade: string
  valor_cota: string
  status: StatusCota
  grupo_id: string
  grupo_nome: string
}

interface Props {
  cooperadoId: string
  orgId: string
  onCotaAtualizada?: () => void
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function CotasSection({ cooperadoId, orgId, onCotaAtualizada }: Props) {
  const [cotas, setCotas]           = useState<CotaComGrupo[]>([])
  const [grupos, setGrupos]         = useState<GrupoColaborador[]>([])
  const [carregando, setCarregando] = useState(true)
  const [editando, setEditando]     = useState<TipoCota | null>(null)
  const [salvando, setSalvando]     = useState(false)
  const [removendo, setRemovendo]   = useState<string | null>(null)
  const [alerta, setAlerta]         = useState<string | null>(null)
  const [erro, setErro]             = useState<string | null>(null)
  const [novoGrupo, setNovoGrupo]   = useState(false)
  const [novoGrupoNome, setNovoGrupoNome] = useState('')
  const [novoGrupoCnpj, setNovoGrupoCnpj] = useState('')
  const [criandoGrupo, setCriandoGrupo]   = useState(false)
  const [buscaGrupo, setBuscaGrupo]       = useState('')

  const [formPlena, setFormPlena] = useState<FormCota>({
    quantidade: '1', valor_cota: '1500', status: 'pendente', grupo_id: '', grupo_nome: ''
  })
  const [formColab, setFormColab] = useState<FormCota>({
    quantidade: '1', valor_cota: '150', status: 'pendente', grupo_id: '', grupo_nome: ''
  })

  const cotaPlena = cotas.find(c => c.tipo_cota === 'plena')
  const cotaColab = cotas.find(c => c.tipo_cota === 'colaboradora')

  const capitalTotal = cotas.reduce((s, c) => s + Number(c.quantidade) * Number(c.valor_cota), 0)
  const temPlena     = !!cotaPlena
  const temColab     = !!cotaColab
  const pctSobras    = (temPlena ? 100 : 0) + (temColab ? 10 : 0)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const [c, g] = await Promise.all([buscarCotas(cooperadoId), buscarGrupos(orgId)])
    setCotas(c as unknown as CotaComGrupo[])
    setGrupos(g as unknown as GrupoColaborador[])
    setCarregando(false)
  }, [cooperadoId, orgId])

  useEffect(() => { carregar() }, [carregar])

  function iniciarEditar(tipo: TipoCota) {
    setErro(null)
    setAlerta(null)
    setNovoGrupo(false)
    setBuscaGrupo('')
    if (tipo === 'plena') {
      setFormPlena(cotaPlena
        ? { quantidade: String(cotaPlena.quantidade), valor_cota: String(cotaPlena.valor_cota), status: cotaPlena.status, grupo_id: '', grupo_nome: '' }
        : { quantidade: '1', valor_cota: '1500', status: 'pendente', grupo_id: '', grupo_nome: '' }
      )
    } else {
      setFormColab(cotaColab
        ? { quantidade: '1', valor_cota: String(cotaColab.valor_cota), status: cotaColab.status, grupo_id: cotaColab.grupo_id ?? '', grupo_nome: cotaColab.grupo?.nome ?? '' }
        : { quantidade: '1', valor_cota: '150', status: 'pendente', grupo_id: '', grupo_nome: '' }
      )
    }
    setEditando(tipo)
  }

  async function handleCriarGrupo() {
    if (!novoGrupoNome.trim()) return
    setCriandoGrupo(true)
    try {
      const g = await criarGrupo(orgId, { nome: novoGrupoNome.trim(), cnpj: novoGrupoCnpj.trim() || undefined })
      setGrupos(prev => [...prev, g as GrupoColaborador])
      setFormColab(p => ({ ...p, grupo_id: g.id, grupo_nome: g.nome }))
      setNovoGrupo(false)
      setNovoGrupoNome('')
      setNovoGrupoCnpj('')
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao criar grupo')
    }
    setCriandoGrupo(false)
  }

  async function handleSalvar(tipo: TipoCota) {
    setSalvando(true)
    setErro(null)
    const form = tipo === 'plena' ? formPlena : formColab
    try {
      const { alertaRepresentante } = await salvarCota(cooperadoId, orgId, tipo, {
        quantidade: parseInt(form.quantidade, 10) || 1,
        valor_cota: parseFloat(form.valor_cota.replace(',', '.')) || 0,
        status:     form.status,
        grupo_id:   tipo === 'colaboradora' ? form.grupo_id || null : null,
      })
      await carregar()
      onCotaAtualizada?.()
      setEditando(null)
      if (alertaRepresentante) setAlerta(alertaRepresentante)
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao salvar')
    }
    setSalvando(false)
  }

  async function handleRemover(cotaId: string) {
    if (!confirm('Remover esta cota? A ação é irreversível.')) return
    setRemovendo(cotaId)
    try {
      await removerCota(cotaId, cooperadoId)
      await carregar()
      onCotaAtualizada?.()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao remover')
    }
    setRemovendo(null)
  }

  const gruposFiltrados = grupos.filter(g =>
    g.nome.toLowerCase().includes(buscaGrupo.toLowerCase())
  )

  if (carregando) {
    return (
      <div style={cardStyle}>
        <div style={{ fontSize: 12, color: '#aaa' }}>Carregando cotas…</div>
      </div>
    )
  }

  return (
    <div style={cardStyle}>

      {/* Header */}
      <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 16 }}>
        💰 Cotas de Participação
      </div>

      {/* Alerta representante */}
      {alerta && (
        <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <span>⚠️ {alerta}</span>
          <button onClick={() => setAlerta(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#92400e', fontSize: 16, lineHeight: 1, flexShrink: 0 }}>×</button>
        </div>
      )}

      {/* Erro */}
      {erro && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 12 }}>
          {erro}
        </div>
      )}

      {/* Resumo capital */}
      {(temPlena || temColab) && editando === null && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 18 }}>
          <div style={summaryCard}>
            <div style={summaryLabel}>Capital social</div>
            <div style={{ ...summaryValue, color: '#166534' }}>{moeda(capitalTotal)}</div>
          </div>
          <div style={summaryCard}>
            <div style={summaryLabel}>Participação em sobras</div>
            <div style={{ ...summaryValue, color: '#1D9E75' }}>{pctSobras}%</div>
          </div>
          <div style={summaryCard}>
            <div style={summaryLabel}>Direito a voto</div>
            <div style={{ ...summaryValue, fontSize: 14 }}>
              {temPlena ? '✓ Individual' : temColab ? '↗ Via grupo' : '—'}
            </div>
          </div>
        </div>
      )}

      {/* ── COTA PLENA ───────────────────────────────────────────────────── */}
      <BlocoTipoCota
        titulo="Cota Plena"
        descricao="Direito a voto individual · 100% nas sobras"
        cor="#635BFF"
        cota={cotaPlena ?? null}
        editando={editando === 'plena'}
        onEditar={() => iniciarEditar('plena')}
        onCancelar={() => { setEditando(null); setErro(null) }}
        onRemover={cotaPlena ? () => handleRemover(cotaPlena.id) : undefined}
        removendo={removendo === (cotaPlena?.id ?? '')}
        salvando={salvando}
        onSalvar={() => handleSalvar('plena')}
        form={formPlena}
        onFormChange={setFormPlena}
        tipo="plena"
      />

      <div style={{ borderTop: '1px solid #f0eeea', margin: '14px 0' }} />

      {/* ── COTA COLABORADORA ────────────────────────────────────────────── */}
      <BlocoTipoCota
        titulo="Cota Colaboradora"
        descricao="Voto via representante do grupo · 10% nas sobras"
        cor="#E07B30"
        cota={cotaColab ?? null}
        editando={editando === 'colaboradora'}
        onEditar={() => iniciarEditar('colaboradora')}
        onCancelar={() => { setEditando(null); setErro(null); setNovoGrupo(false) }}
        onRemover={cotaColab ? () => handleRemover(cotaColab.id) : undefined}
        removendo={removendo === (cotaColab?.id ?? '')}
        salvando={salvando}
        onSalvar={() => handleSalvar('colaboradora')}
        form={formColab}
        onFormChange={setFormColab}
        tipo="colaboradora"
        grupos={gruposFiltrados}
        buscaGrupo={buscaGrupo}
        onBuscaGrupo={setBuscaGrupo}
        novoGrupo={novoGrupo}
        onToggleNovoGrupo={() => setNovoGrupo(p => !p)}
        novoGrupoNome={novoGrupoNome}
        onNovoGrupoNome={setNovoGrupoNome}
        novoGrupoCnpj={novoGrupoCnpj}
        onNovoGrupoCnpj={setNovoGrupoCnpj}
        onCriarGrupo={handleCriarGrupo}
        criandoGrupo={criandoGrupo}
      />

    </div>
  )
}

// ── Bloco por tipo de cota ────────────────────────────────────────────────────
interface BlocoProps {
  titulo: string
  descricao: string
  cor: string
  cota: CotaComGrupo | null
  editando: boolean
  onEditar: () => void
  onCancelar: () => void
  onRemover?: () => void
  removendo: boolean
  salvando: boolean
  onSalvar: () => void
  form: FormCota
  onFormChange: (f: FormCota) => void
  tipo: TipoCota
  grupos?: GrupoColaborador[]
  buscaGrupo?: string
  onBuscaGrupo?: (v: string) => void
  novoGrupo?: boolean
  onToggleNovoGrupo?: () => void
  novoGrupoNome?: string
  onNovoGrupoNome?: (v: string) => void
  novoGrupoCnpj?: string
  onNovoGrupoCnpj?: (v: string) => void
  onCriarGrupo?: () => void
  criandoGrupo?: boolean
}

function BlocoTipoCota({
  titulo, descricao, cor, cota, editando,
  onEditar, onCancelar, onRemover, removendo, salvando, onSalvar,
  form, onFormChange, tipo,
  grupos, buscaGrupo, onBuscaGrupo, novoGrupo, onToggleNovoGrupo,
  novoGrupoNome, onNovoGrupoNome, novoGrupoCnpj, onNovoGrupoCnpj,
  onCriarGrupo, criandoGrupo,
}: BlocoProps) {

  const previewCapital = (parseInt(form.quantidade, 10) || 0) *
    (parseFloat(form.valor_cota.replace(',', '.')) || 0)

  return (
    <div>
      {/* Cabeçalho do bloco */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: cor, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{titulo}</span>
          </div>
          <div style={{ fontSize: 11, color: '#999', paddingLeft: 17 }}>{descricao}</div>
        </div>
        {!editando && (
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={onEditar} style={btnEditar}>
              {cota ? '✏ Editar' : '+ Configurar'}
            </button>
            {cota && onRemover && (
              <button onClick={onRemover} disabled={removendo} style={{ ...btnEditar, color: '#dc2626', borderColor: '#fca5a5' }}>
                {removendo ? '…' : '✕'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Visualização */}
      {!editando && cota && (
        <div style={{ paddingLeft: 17 }}>
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', marginBottom: 8 }}>
            <div>
              <div style={summaryLabel}>Cotas</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                {Number(cota.quantidade).toLocaleString('pt-BR')}
              </div>
            </div>
            <div>
              <div style={summaryLabel}>Valor por cota</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#1a1a1a' }}>
                {moeda(Number(cota.valor_cota))}
              </div>
            </div>
            <div>
              <div style={summaryLabel}>Capital</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: '#166534' }}>
                {moeda(Number(cota.quantidade) * Number(cota.valor_cota))}
              </div>
            </div>
            {tipo === 'colaboradora' && cota.grupo && (
              <div>
                <div style={summaryLabel}>Grupo</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>{cota.grupo.nome}</div>
              </div>
            )}
          </div>
          <StatusBadge status={cota.status as StatusCota} />
        </div>
      )}

      {!editando && !cota && (
        <div style={{ paddingLeft: 17, fontSize: 12, color: '#bbb' }}>
          Não configurada
        </div>
      )}

      {/* Formulário de edição */}
      {editando && (
        <div style={{ paddingLeft: 17 }}>
          <div style={{ display: 'grid', gridTemplateColumns: tipo === 'plena' ? '1fr 1fr 1fr' : '1fr 1fr', gap: 12, marginBottom: 10 }}>
            {tipo === 'plena' && (
              <div>
                <label style={labelStyle}>Quantidade de cotas</label>
                <input
                  type="number" min="1"
                  value={form.quantidade}
                  onChange={e => onFormChange({ ...form, quantidade: e.target.value })}
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label style={labelStyle}>Valor por cota (R$)</label>
              <input
                type="text" inputMode="decimal" placeholder="0,00"
                value={form.valor_cota}
                onChange={e => onFormChange({ ...form, valor_cota: e.target.value })}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Status</label>
              <select
                value={form.status}
                onChange={e => onFormChange({ ...form, status: e.target.value as StatusCota })}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="pendente">Pendente</option>
                <option value="parcial">Parcial</option>
                <option value="integralizada">Integralizada</option>
              </select>
            </div>
          </div>

          {/* Campo de grupo (só colaboradora) */}
          {tipo === 'colaboradora' && (
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>Grupo vinculado *</label>

              {form.grupo_id ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #a7f3d0', borderRadius: 7, padding: '7px 10px' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#166534', flex: 1 }}>{form.grupo_nome}</span>
                  <button
                    onClick={() => onFormChange({ ...form, grupo_id: '', grupo_nome: '' })}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 16, lineHeight: 1 }}
                  >×</button>
                </div>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="Buscar grupo…"
                    value={buscaGrupo ?? ''}
                    onChange={e => onBuscaGrupo?.(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 6 }}
                  />
                  {(grupos ?? []).length > 0 && !novoGrupo && (
                    <div style={{ border: '1px solid #e5e3dc', borderRadius: 7, maxHeight: 140, overflowY: 'auto', background: '#fff' }}>
                      {(grupos ?? []).map(g => (
                        <button
                          key={g.id}
                          onClick={() => onFormChange({ ...form, grupo_id: g.id, grupo_nome: g.nome })}
                          style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f5f3ef' }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8f7f4' }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'none' }}
                        >
                          <span style={{ fontWeight: 600 }}>{g.nome}</span>
                          {g.cnpj && <span style={{ fontSize: 11, color: '#999', marginLeft: 6 }}>{g.cnpj}</span>}
                        </button>
                      ))}
                    </div>
                  )}
                  <button
                    onClick={onToggleNovoGrupo}
                    style={{ fontSize: 12, color: '#635BFF', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0', marginTop: 4 }}
                  >
                    {novoGrupo ? '← Voltar à busca' : '+ Cadastrar novo grupo'}
                  </button>
                </>
              )}

              {/* Mini-form novo grupo */}
              {novoGrupo && !form.grupo_id && (
                <div style={{ background: '#f8f7f4', borderRadius: 8, padding: 12, marginTop: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
                    <div>
                      <label style={labelStyle}>Nome do grupo *</label>
                      <input
                        type="text" placeholder="Ex: Meeiros da Fazenda Santa Maria"
                        value={novoGrupoNome ?? ''}
                        onChange={e => onNovoGrupoNome?.(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>CNPJ (opcional)</label>
                      <input
                        type="text" placeholder="00.000.000/0000-00"
                        value={novoGrupoCnpj ?? ''}
                        onChange={e => onNovoGrupoCnpj?.(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                  </div>
                  <button
                    onClick={onCriarGrupo}
                    disabled={criandoGrupo || !novoGrupoNome?.trim()}
                    style={btnPrimary}
                  >
                    {criandoGrupo ? 'Criando…' : 'Criar grupo'}
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={{ fontSize: 12, color: '#888', marginBottom: 12 }}>
            Capital desta cota: <strong style={{ color: '#1a1a1a' }}>{moeda(previewCapital)}</strong>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onSalvar} disabled={salvando} style={btnPrimary}>
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
            <button onClick={onCancelar} style={btnSecondary}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
  marginTop: 12, background: '#fff', border: '1px solid #e5e3dc',
  borderRadius: 12, padding: '1.25rem',
  fontFamily: 'system-ui, -apple-system, sans-serif',
}
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13,
  border: '1px solid #d5d3cc', borderRadius: 7,
  background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5,
}
const summaryCard: React.CSSProperties = {
  background: '#f8f7f4', border: '1px solid #e5e3dc', borderRadius: 8, padding: '10px 14px',
}
const summaryLabel: React.CSSProperties = {
  fontSize: 11, color: '#888', fontWeight: 500, marginBottom: 4,
}
const summaryValue: React.CSSProperties = {
  fontSize: 18, fontWeight: 700, color: '#1a1a1a',
}
const btnPrimary: React.CSSProperties = {
  padding: '7px 16px', fontSize: 13, fontWeight: 600,
  background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer',
}
const btnSecondary: React.CSSProperties = {
  padding: '7px 16px', fontSize: 13, fontWeight: 400,
  background: 'transparent', color: '#555', border: '1px solid #d5d3cc', borderRadius: 8, cursor: 'pointer',
}
const btnEditar: React.CSSProperties = {
  fontSize: 12, fontWeight: 500, padding: '4px 12px',
  borderRadius: 6, background: '#f5f5f2', color: '#444',
  border: '1px solid #d5d3cc', cursor: 'pointer',
}
