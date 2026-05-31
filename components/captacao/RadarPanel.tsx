'use client'

import React, { useState, useEffect, useRef } from 'react'
import type { RadarFonte, RadarResultado } from '@/types/database'
import {
  salvarFonte, atualizarFonte, removerFonte, toggleFonteAtivo,
  executarRadar, adicionarAoPipeline, removerResultadoRadar,
} from '@/lib/captacao/actions'

interface Props {
  fontesIniciais: RadarFonte[]
  resultadosIniciais: RadarResultado[]
}

const TEAL = '#1D9E75'

const MSGS_STATUS = [
  'Varrendo fontes cadastradas...',
  'Analisando editais encontrados...',
  'Calculando compatibilidade com seu perfil...',
  'Quase lá...',
]

function formatData(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

function formatDataHora(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

function formatTimer(s: number): string {
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}

function formatValor(v: number | null | undefined) {
  if (v == null) return null
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toFixed(1)}M`
  if (v >= 1_000)     return `R$ ${(v / 1_000).toFixed(0)}K`
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function CompatBadge({ compatibilidade, score }: { compatibilidade: string; score: number }) {
  const map: Record<string, { label: string; cor: string; bg: string; icon: string }> = {
    compativel:    { label: 'Compatível',    cor: '#166534', bg: '#dcfce7', icon: '✅' },
    parcial:       { label: 'Parcial',       cor: '#92400e', bg: '#fef3c7', icon: '⚠️' },
    incompativel:  { label: 'Incompatível',  cor: '#991b1b', bg: '#fee2e2', icon: '❌' },
  }
  const s = map[compatibilidade] ?? map.parcial
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      fontSize: '11px', fontWeight: '600', padding: '2px 8px', borderRadius: '12px',
      color: s.cor, background: s.bg,
    }}>
      {s.icon} {s.label} · {score}/100
    </span>
  )
}

export default function RadarPanel({ fontesIniciais, resultadosIniciais }: Props) {
  const [fontes, setFontes]               = useState<RadarFonte[]>(fontesIniciais)
  const [resultados, setResultados]       = useState<RadarResultado[]>(resultadosIniciais)
  const [executando, setExecutando]       = useState(false)
  const [erroRadar, setErroRadar]         = useState('')
  const [warningsRadar, setWarningsRadar] = useState<string[]>([])
  const [showForm, setShowForm]           = useState(false)
  const [form, setForm]                   = useState({ nome: '', url: '', tipo: 'nacional' })
  const [salvandoFonte, setSalvandoFonte] = useState(false)
  const [editandoId, setEditandoId]       = useState<string | null>(null)
  const [editForm, setEditForm]           = useState({ nome: '', url: '', tipo: 'nacional' })
  const [salvandoEdicao, setSalvandoEdicao] = useState(false)
  const [timerSeg, setTimerSeg]           = useState(0)
  const [novosIds, setNovosIds]           = useState<Set<string>>(new Set())
  const [novosCount, setNovosCount]       = useState<number | null>(null)
  const [modoUltimaVarredura, setModoUltimaVarredura] = useState<'novidades' | 'completo' | null>(null)
  const [mensagemNovidades, setMensagemNovidades] = useState<string | null>(null)
  const [mostrarAnteriores, setMostrarAnteriores] = useState(false)
  const canceladoRef = useRef(false)

  const ultimaVarredura = resultados.length > 0
    ? resultados.reduce<string | null>((max, r) => (!max || r.varredura_em > max ? r.varredura_em : max), null)
    : null

  const fontesAtivas = fontes.filter(f => f.ativo).length
  const msgStatus = MSGS_STATUS[Math.floor(timerSeg / 5) % MSGS_STATUS.length]

  useEffect(() => {
    if (!executando) return
    const interval = setInterval(() => setTimerSeg(s => s + 1), 1000)
    return () => clearInterval(interval)
  }, [executando])

  useEffect(() => {
    if (!executando) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [executando])

  async function handleSalvarFonte() {
    if (!form.nome.trim() || !form.url.trim()) return
    setSalvandoFonte(true)
    const res = await salvarFonte(form)
    if (res.data) {
      setFontes(prev => [...prev, res.data!])
      setForm({ nome: '', url: '', tipo: 'nacional' })
      setShowForm(false)
    }
    setSalvandoFonte(false)
  }

  async function handleRemover(id: string) {
    await removerFonte(id)
    setFontes(prev => prev.filter(f => f.id !== id))
    setResultados(prev => prev.filter(r => r.fonte_id !== id))
  }

  async function handleToggle(fonte: RadarFonte) {
    await toggleFonteAtivo(fonte.id, !fonte.ativo)
    setFontes(prev => prev.map(f => f.id === fonte.id ? { ...f, ativo: !f.ativo } : f))
  }

  async function handleExecutar() {
    canceladoRef.current = false
    setExecutando(true)
    setErroRadar('')
    setWarningsRadar([])
    setTimerSeg(0)
    setNovosIds(new Set())
    setNovosCount(null)
    setMensagemNovidades(null)
    setMostrarAnteriores(false)

    const res = await executarRadar()

    if (canceladoRef.current) {
      if (res.data) setResultados(res.data)
      return
    }

    if (res.error) {
      setErroRadar(res.error)
    } else if (res.data) {
      setResultados(res.data)
      const ids = new Set(res.novosIds ?? [])
      setNovosIds(ids)
      setNovosCount(ids.size)
      setModoUltimaVarredura('novidades')
      setMensagemNovidades(res.mensagem ?? null)
      const agora = new Date().toISOString()
      setFontes(prev => prev.map(f => f.ativo ? { ...f, ultima_varredura: agora } : f))
      if (res.warnings?.length) setWarningsRadar(res.warnings)
    }
    setExecutando(false)
  }

  function handleCancelar() {
    canceladoRef.current = true
    setExecutando(false)
    setErroRadar('Varredura cancelada. Os resultados parciais já foram salvos.')
  }

  async function handleIgnorar(id: string) {
    setResultados(prev => prev.filter(r => r.id !== id))
    await removerResultadoRadar(id)
  }

  async function handleAdicionarPipeline(resultadoId: string) {
    const res = await adicionarAoPipeline(resultadoId)
    if (!res.error) {
      setResultados(prev => prev.map(r => r.id === resultadoId ? { ...r, adicionado_ao_pipeline: true } : r))
    }
  }

  function sugerirCAR() {
    setForm({ nome: 'CAR/Bahia', url: 'https://www.ba.gov.br/car/editais', tipo: 'nacional' })
    setShowForm(true)
  }

  function handleIniciarEditar(fonte: RadarFonte) {
    setEditandoId(fonte.id)
    setEditForm({ nome: fonte.nome, url: fonte.url, tipo: fonte.tipo })
    setShowForm(false)
  }

  async function handleSalvarEdicao() {
    if (!editandoId || !editForm.nome.trim() || !editForm.url.trim()) return
    setSalvandoEdicao(true)
    const res = await atualizarFonte(editandoId, editForm)
    if (res.data) {
      setFontes(prev => prev.map(f => f.id === editandoId ? res.data! : f))
      setEditandoId(null)
    }
    setSalvandoEdicao(false)
  }

  const resultadosNovos      = resultados.filter(r => novosIds.has(r.id))
  const resultadosAnteriores = resultados.filter(r => !novosIds.has(r.id))

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', minHeight: 'calc(100vh - 240px)' }}>
      <style>{`
        @keyframes radar-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Painel esquerdo — Fontes (30%) ─────────────────────────────────── */}
      <div style={{ width: '30%', minWidth: '240px', flexShrink: 0 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>Fontes cadastradas</span>
            <button
              onClick={() => setShowForm(v => !v)}
              style={{ fontSize: '12px', fontWeight: '600', padding: '4px 10px', background: TEAL, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
            >
              + Adicionar
            </button>
          </div>

          {showForm && (
            <div style={{ background: '#f8f7f4', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
              <input placeholder="Nome (ex: CAR/Bahia)" value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))} style={inputSm} />
              <input placeholder="URL" value={form.url}
                onChange={e => setForm(p => ({ ...p, url: e.target.value }))} style={{ ...inputSm, marginTop: '6px' }} />
              <select value={form.tipo} onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                style={{ ...inputSm, marginTop: '6px', cursor: 'pointer' }}>
                <option value="nacional">Nacional</option>
                <option value="internacional">Internacional</option>
              </select>
              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                <button onClick={handleSalvarFonte} disabled={salvandoFonte} style={btnSmPrimary}>
                  {salvandoFonte ? 'Salvando…' : 'Salvar'}
                </button>
                <button onClick={() => setShowForm(false)} style={btnSmSecondary}>Cancelar</button>
              </div>
            </div>
          )}

          {fontes.length === 0 && !showForm && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px' }}>Nenhuma fonte cadastrada ainda.</p>
              <button onClick={sugerirCAR} style={{ ...btnSmPrimary, fontSize: '11px' }}>Sugerir CAR/Bahia</button>
            </div>
          )}

          {fontes.map(fonte => (
            <div key={fonte.id} style={{
              border: '1px solid #e5e3dc', borderRadius: '8px', padding: '10px',
              marginBottom: '8px', opacity: fonte.ativo ? 1 : 0.55,
            }}>
              <div style={{ marginBottom: '8px' }}>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{fonte.nome}</div>
                <div style={{ fontSize: '11px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '180px' }}>
                  {fonte.url}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <TipoBadge tipo={fonte.tipo} />
                <button
                  onClick={() => handleToggle(fonte)}
                  style={{
                    fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '10px',
                    border: `1px solid ${fonte.ativo ? TEAL : '#d5d3cc'}`,
                    background: fonte.ativo ? '#E6F7F1' : '#f5f5f2',
                    color: fonte.ativo ? TEAL : '#888', cursor: 'pointer',
                  }}
                >
                  {fonte.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </div>

              {fonte.ultima_varredura && (
                <div style={{ fontSize: '10px', color: '#aaa', marginBottom: '8px' }}>
                  Varredura: {formatData(fonte.ultima_varredura)}
                </div>
              )}

              {editandoId !== fonte.id && (
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    onClick={() => handleIniciarEditar(fonte)}
                    style={{
                      fontSize: '12px', fontWeight: '500', padding: '4px 10px', borderRadius: '6px',
                      background: '#EEF0FF', color: '#4840CC', border: 'none', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    ✏ Editar
                  </button>
                  <button
                    onClick={() => handleRemover(fonte.id)}
                    style={{
                      fontSize: '12px', fontWeight: '500', padding: '4px 10px', borderRadius: '6px',
                      background: '#FEE2E2', color: '#991B1B', border: 'none', cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: '4px',
                    }}
                  >
                    × Excluir
                  </button>
                </div>
              )}

              {editandoId === fonte.id && (
                <div style={{ background: '#f8f7f4', borderRadius: '8px', padding: '10px', marginTop: '4px' }}>
                  <input placeholder="Nome" value={editForm.nome}
                    onChange={e => setEditForm(p => ({ ...p, nome: e.target.value }))} style={inputSm} />
                  <input placeholder="URL" value={editForm.url}
                    onChange={e => setEditForm(p => ({ ...p, url: e.target.value }))} style={{ ...inputSm, marginTop: '6px' }} />
                  <select value={editForm.tipo} onChange={e => setEditForm(p => ({ ...p, tipo: e.target.value }))}
                    style={{ ...inputSm, marginTop: '6px', cursor: 'pointer' }}>
                    <option value="nacional">Nacional</option>
                    <option value="internacional">Internacional</option>
                  </select>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button onClick={handleSalvarEdicao} disabled={salvandoEdicao} style={btnSmPrimary}>
                      {salvandoEdicao ? 'Salvando…' : 'Salvar'}
                    </button>
                    <button onClick={() => setEditandoId(null)} style={btnSmSecondary}>Cancelar</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Painel direito — Resultados (70%) ──────────────────────────────── */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>

          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>Resultados da varredura</div>
              {ultimaVarredura && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                  Última varredura: {formatDataHora(ultimaVarredura)}
                </div>
              )}
              {novosCount !== null && !executando && (
                <div style={{ fontSize: '11px', marginTop: '3px', color: novosCount > 0 ? TEAL : '#888' }}>
                  {novosCount > 0
                    ? `✓ ${novosCount} ${novosCount === 1 ? 'novo edital encontrado' : 'novos editais encontrados'}`
                    : '✓ Nenhuma novidade desde a última varredura'}
                </div>
              )}
            </div>

            {!executando && (
              <button
                onClick={handleExecutar}
                disabled={fontesAtivas === 0}
                style={{
                  padding: '8px 14px', fontSize: '13px', fontWeight: '600',
                  background: fontesAtivas === 0 ? '#e5e3dc' : TEAL,
                  color: '#fff', border: 'none', borderRadius: '8px',
                  cursor: fontesAtivas === 0 ? 'not-allowed' : 'pointer',
                  opacity: fontesAtivas === 0 ? 0.5 : 1, whiteSpace: 'nowrap',
                }}
              >
                🔔 Buscar novidades
              </button>
            )}
          </div>

          {/* Painel de status animado */}
          {executando && (
            <div style={{
              border: '1px solid #e5e3dc', borderRadius: '12px', padding: '28px 24px',
              marginBottom: '1rem', textAlign: 'center',
            }}>
              <div style={{
                width: '60px', height: '60px', margin: '0 auto 16px',
                border: '4px solid #e5e3dc',
                borderTop: `4px solid ${TEAL}`,
                borderRadius: '50%',
                animation: 'radar-spin 1s linear infinite',
              }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '12px' }}>
                Analisando fontes...
              </div>

              <div style={{ fontFamily: 'monospace', fontSize: '22px', fontWeight: '700', color: '#1a1a1a', marginBottom: '10px' }}>
                ⏱ {formatTimer(timerSeg)}
              </div>

              <div style={{ fontSize: '12px', color: '#888', marginBottom: '20px', minHeight: '18px' }}>
                {msgStatus}
              </div>

              <button
                onClick={handleCancelar}
                style={{
                  padding: '8px 20px', fontSize: '13px', fontWeight: '500',
                  background: '#fff', border: '1px solid #e5e3dc', borderRadius: '8px',
                  color: '#666', cursor: 'pointer',
                }}
              >
                ✕ Cancelar varredura
              </button>
            </div>
          )}

          {erroRadar && (
            <div style={{ background: '#fee2e2', border: '1px solid #fca5a5', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#991b1b', marginBottom: '1rem' }}>
              {erroRadar}
            </div>
          )}

          {warningsRadar.length > 0 && (
            <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '8px', padding: '10px 14px', fontSize: '12px', color: '#92400e', marginBottom: '1rem' }}>
              <div style={{ fontWeight: '600', marginBottom: '4px' }}>Erros em algumas fontes:</div>
              {warningsRadar.map((w, i) => <div key={i} style={{ marginTop: '2px' }}>• {w}</div>)}
            </div>
          )}

          {/* Estado vazio inicial */}
          {!executando && resultados.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '6px' }}>Nenhuma varredura executada ainda</div>
              <div style={{ fontSize: '13px', color: '#888' }}>
                {fontesAtivas === 0
                  ? 'Cadastre pelo menos uma fonte ativa para executar a varredura.'
                  : 'Clique em "Buscar novidades" para buscar editais nas fontes cadastradas.'}
              </div>
            </div>
          )}

          {/* Resultados modo novidades com novos editais */}
          {!executando && modoUltimaVarredura === 'novidades' && novosCount !== null && novosCount > 0 && (
            <>
              <div style={{ marginBottom: '10px' }}>
                <span style={{
                  fontSize: '12px', fontWeight: '600', color: '#166534',
                  background: '#dcfce7', padding: '4px 12px', borderRadius: '12px',
                }}>
                  ✓ {novosCount} {novosCount === 1 ? 'novo edital encontrado' : 'novos editais encontrados'}
                </span>
              </div>
              {resultadosNovos.map(r => (
                <ResultadoCard key={r.id} resultado={r} isNovo onAdicionarPipeline={() => handleAdicionarPipeline(r.id)} onIgnorar={() => handleIgnorar(r.id)} />
              ))}
              {resultadosAnteriores.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <button
                    onClick={() => setMostrarAnteriores(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#888', padding: '4px 0' }}
                  >
                    {mostrarAnteriores ? '▲ Ocultar anteriores' : `▼ Ver todos os ${resultadosAnteriores.length} resultados anteriores`}
                  </button>
                  {mostrarAnteriores && resultadosAnteriores.map(r => (
                    <ResultadoCard key={r.id} resultado={r} onAdicionarPipeline={() => handleAdicionarPipeline(r.id)} onIgnorar={() => handleIgnorar(r.id)} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Resultado: nenhuma novidade */}
          {!executando && modoUltimaVarredura === 'novidades' && novosCount === 0 && (
            <>
              <div style={{ textAlign: 'center', padding: '2rem', marginBottom: '8px', background: '#f8f7f4', borderRadius: '10px' }}>
                <div style={{ fontSize: '28px', marginBottom: '8px', color: TEAL }}>✓</div>
                <div style={{ fontSize: '14px', fontWeight: '600', color: TEAL, marginBottom: '4px' }}>
                  Nenhuma novidade desde a última varredura
                </div>
                <div style={{ fontSize: '13px', color: '#888', marginBottom: resultados.length > 0 ? '12px' : '0' }}>
                  Todos os editais disponíveis já estão no seu radar
                </div>
                {resultados.length > 0 && (
                  <button
                    onClick={() => setMostrarAnteriores(v => !v)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: '#888' }}
                  >
                    {mostrarAnteriores ? '▲ Ocultar' : `▼ Ver resultados anteriores (${resultados.length})`}
                  </button>
                )}
              </div>
              {mostrarAnteriores && resultados.map(r => (
                <ResultadoCard key={r.id} resultado={r} onAdicionarPipeline={() => handleAdicionarPipeline(r.id)} onIgnorar={() => handleIgnorar(r.id)} />
              ))}
            </>
          )}

          {/* Resultados modo completo ou inicial (sem classificação) */}
          {!executando && modoUltimaVarredura !== 'novidades' && resultados.length > 0 && (
            <>
              {modoUltimaVarredura === 'completo' && novosCount !== null && (
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '10px' }}>
                  {resultados.length} {resultados.length === 1 ? 'edital encontrado no total' : 'editais encontrados no total'}
                </div>
              )}
              {resultados.map(r => (
                <ResultadoCard key={r.id} resultado={r} onAdicionarPipeline={() => handleAdicionarPipeline(r.id)} onIgnorar={() => handleIgnorar(r.id)} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function TipoBadge({ tipo }: { tipo: string }) {
  const map: Record<string, { label: string; cor: string; bg: string }> = {
    internacional: { label: 'Internacional', cor: '#185FA5', bg: '#E6F1FB' },
    nacional:      { label: 'Nacional',      cor: '#1D9E75', bg: '#E6F7F1' },
  }
  const s = map[tipo] ?? map.nacional
  return (
    <span style={{ fontSize: '10px', fontWeight: '600', color: s.cor, background: s.bg, padding: '2px 7px', borderRadius: '10px' }}>
      {s.label}
    </span>
  )
}

function ResultadoCard({ resultado: r, onAdicionarPipeline, onIgnorar, isNovo }: {
  resultado: RadarResultado
  onAdicionarPipeline: () => void
  onIgnorar: () => void
  isNovo?: boolean
}) {
  const [adicionando, setAdicionando] = useState(false)

  async function handleClick() {
    setAdicionando(true)
    await onAdicionarPipeline()
    setAdicionando(false)
  }

  return (
    <div style={{
      border: `1px solid ${isNovo ? '#a7f3d0' : '#e5e3dc'}`,
      borderRadius: '10px', padding: '14px', marginBottom: '10px',
      background: isNovo ? '#f0fdf9' : '#fafaf8',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <CompatBadge compatibilidade={r.compatibilidade} score={r.score} />
            {isNovo && (
              <span style={{ fontSize: '10px', fontWeight: '600', color: '#166534', background: '#dcfce7', padding: '2px 7px', borderRadius: '10px' }}>
                Novo
              </span>
            )}
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>{r.titulo}</div>
          {r.financiador && (
            <div style={{ fontSize: '12px', color: '#555', marginBottom: '4px' }}>{r.financiador}</div>
          )}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '6px' }}>
            {formatValor(r.valor_estimado) && (
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#1D9E75' }}>{formatValor(r.valor_estimado)}</span>
            )}
            {r.prazo_submissao && (
              <span style={{ fontSize: '12px', color: '#888' }}>Prazo: {formatData(r.prazo_submissao)}</span>
            )}
            {r.url_edital && (
              <a href={r.url_edital} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#635BFF' }}>
                Ver edital ↗
              </a>
            )}
          </div>
          {r.motivo && (
            <div style={{ fontSize: '12px', color: '#666', background: '#f0eeea', borderRadius: '6px', padding: '6px 10px', marginTop: '6px' }}>
              {r.motivo}
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'stretch' }}>
          {r.adicionado_ao_pipeline ? (
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1D9E75', textAlign: 'center', padding: '8px 0' }}>✓ No pipeline</span>
          ) : (
            <button
              onClick={handleClick}
              disabled={adicionando || r.compatibilidade === 'incompativel'}
              style={{
                width: '120px', padding: '8px 16px', fontSize: '13px', fontWeight: '600',
                background: adicionando ? '#57C4A3' : '#1D9E75',
                color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer',
                opacity: r.compatibilidade === 'incompativel' ? 0.45 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {adicionando ? '…' : '+ Pipeline'}
            </button>
          )}
          <button
            onClick={onIgnorar}
            style={{
              width: '120px', padding: '8px 16px', fontSize: '13px', fontWeight: '600',
              background: '#FEE2E2', color: '#991B1B',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            ✕ Ignorar
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Estilos ───────────────────────────────────────────────────────────────────

const inputSm: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: '12px',
  border: '1px solid #d5d3cc', borderRadius: '7px',
  background: '#fff', color: '#1a1a1a', outline: 'none',
  boxSizing: 'border-box',
}

const btnSmPrimary: React.CSSProperties = {
  padding: '5px 12px', fontSize: '12px', fontWeight: '600',
  background: TEAL, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
}

const btnSmSecondary: React.CSSProperties = {
  padding: '5px 12px', fontSize: '12px', fontWeight: '400',
  background: 'transparent', color: '#555', border: '1px solid #d5d3cc',
  borderRadius: '6px', cursor: 'pointer',
}
