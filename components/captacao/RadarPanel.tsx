'use client'

import React, { useState } from 'react'
import type { RadarFonte, RadarResultado } from '@/types/database'
import {
  salvarFonte, removerFonte, toggleFonteAtivo,
  executarRadar, adicionarAoPipeline,
} from '@/lib/captacao/actions'

interface Props {
  fontesIniciais: RadarFonte[]
  resultadosIniciais: RadarResultado[]
}

const TEAL = '#1D9E75'

function formatData(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
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
  const [fontes, setFontes]       = useState<RadarFonte[]>(fontesIniciais)
  const [resultados, setResultados] = useState<RadarResultado[]>(resultadosIniciais)
  const [executando, setExecutando] = useState(false)
  const [erroRadar,    setErroRadar]    = useState('')
  const [warningsRadar, setWarningsRadar] = useState<string[]>([])
  const [showForm, setShowForm]     = useState(false)
  const [form, setForm]             = useState({ nome: '', url: '', tipo: 'nacional' })
  const [salvandoFonte, setSalvandoFonte] = useState(false)

  const ultimaVarredura = resultados.length > 0
    ? resultados.reduce<string | null>((max, r) => (!max || r.varredura_em > max ? r.varredura_em : max), null)
    : null

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
    setExecutando(true)
    setErroRadar('')
    setWarningsRadar([])
    const res = await executarRadar()
    if (res.error) {
      setErroRadar(res.error)
    } else if (res.data) {
      setResultados(res.data)
      const agora = new Date().toISOString()
      setFontes(prev => prev.map(f => f.ativo ? { ...f, ultima_varredura: agora } : f))
      if (res.warnings?.length) setWarningsRadar(res.warnings)
    }
    setExecutando(false)
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

  return (
    <div style={{ display: 'flex', gap: '20px', alignItems: 'flex-start', minHeight: 'calc(100vh - 240px)' }}>

      {/* Painel esquerdo — Fontes (30%) */}
      <div style={{ width: '30%', minWidth: '240px', flexShrink: 0 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>Fontes cadastradas</span>
            <button
              onClick={() => setShowForm(v => !v)}
              style={{
                fontSize: '12px', fontWeight: '600', padding: '4px 10px',
                background: TEAL, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer',
              }}
            >
              + Adicionar
            </button>
          </div>

          {/* Form inline */}
          {showForm && (
            <div style={{ background: '#f8f7f4', borderRadius: '8px', padding: '10px', marginBottom: '12px' }}>
              <input
                placeholder="Nome (ex: CAR/Bahia)"
                value={form.nome}
                onChange={e => setForm(p => ({ ...p, nome: e.target.value }))}
                style={inputSm}
              />
              <input
                placeholder="URL"
                value={form.url}
                onChange={e => setForm(p => ({ ...p, url: e.target.value }))}
                style={{ ...inputSm, marginTop: '6px' }}
              />
              <select
                value={form.tipo}
                onChange={e => setForm(p => ({ ...p, tipo: e.target.value }))}
                style={{ ...inputSm, marginTop: '6px', cursor: 'pointer' }}
              >
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

          {/* Lista de fontes */}
          {fontes.length === 0 && !showForm && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <p style={{ fontSize: '12px', color: '#888', margin: '0 0 10px' }}>Nenhuma fonte cadastrada ainda.</p>
              <button onClick={sugerirCAR} style={{ ...btnSmPrimary, fontSize: '11px' }}>
                Sugerir CAR/Bahia
              </button>
            </div>
          )}

          {fontes.map(fonte => (
            <div key={fonte.id} style={{
              border: '1px solid #e5e3dc', borderRadius: '8px', padding: '10px',
              marginBottom: '8px', opacity: fonte.ativo ? 1 : 0.55,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>{fonte.nome}</div>
                  <div style={{ fontSize: '11px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                    {fonte.url}
                  </div>
                </div>
                <button
                  onClick={() => handleRemover(fonte.id)}
                  title="Remover"
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: '14px', padding: '0 2px', flexShrink: 0 }}
                  onMouseEnter={e => (e.currentTarget.style.color = '#dc2626')}
                  onMouseLeave={e => (e.currentTarget.style.color = '#ccc')}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px' }}>
                <TipoBadge tipo={fonte.tipo} />
                <button
                  onClick={() => handleToggle(fonte)}
                  style={{
                    fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '10px',
                    border: `1px solid ${fonte.ativo ? TEAL : '#d5d3cc'}`,
                    background: fonte.ativo ? '#E6F7F1' : '#f5f5f2',
                    color: fonte.ativo ? TEAL : '#888',
                    cursor: 'pointer',
                  }}
                >
                  {fonte.ativo ? 'Ativo' : 'Inativo'}
                </button>
              </div>

              {fonte.ultima_varredura && (
                <div style={{ fontSize: '10px', color: '#aaa', marginTop: '4px' }}>
                  Varredura: {formatData(fonte.ultima_varredura)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Painel direito — Resultados (70%) */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>

          {/* Header resultados */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a1a1a' }}>Resultados da varredura</div>
              {ultimaVarredura && (
                <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                  Última varredura: {new Date(ultimaVarredura).toLocaleString('pt-BR')}
                </div>
              )}
            </div>
            <button
              onClick={handleExecutar}
              disabled={executando || fontes.filter(f => f.ativo).length === 0}
              style={{
                padding: '8px 16px', fontSize: '13px', fontWeight: '600',
                background: executando ? '#9F9BFF' : '#635BFF',
                color: '#fff', border: 'none', borderRadius: '8px',
                cursor: executando || fontes.filter(f => f.ativo).length === 0 ? 'not-allowed' : 'pointer',
                opacity: fontes.filter(f => f.ativo).length === 0 ? 0.5 : 1,
              }}
            >
              {executando ? '⏳ Executando…' : ultimaVarredura ? '🔄 Executar novamente' : '🔍 Executar varredura agora'}
            </button>
          </div>

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

          {executando && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#888', fontSize: '13px' }}>
              Analisando fontes com Claude… pode levar alguns instantes.
            </div>
          )}

          {!executando && resultados.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem' }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔍</div>
              <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '6px' }}>Nenhuma varredura executada ainda</div>
              <div style={{ fontSize: '13px', color: '#888' }}>
                {fontes.filter(f => f.ativo).length === 0
                  ? 'Cadastre pelo menos uma fonte ativa para executar a varredura.'
                  : 'Clique em "Executar varredura agora" para buscar editais nas fontes cadastradas.'}
              </div>
            </div>
          )}

          {!executando && resultados.map(r => (
            <ResultadoCard
              key={r.id}
              resultado={r}
              onAdicionarPipeline={() => handleAdicionarPipeline(r.id)}
            />
          ))}
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

function ResultadoCard({ resultado: r, onAdicionarPipeline }: { resultado: RadarResultado; onAdicionarPipeline: () => void }) {
  const [adicionando, setAdicionando] = useState(false)

  async function handleClick() {
    setAdicionando(true)
    await onAdicionarPipeline()
    setAdicionando(false)
  }

  return (
    <div style={{
      border: '1px solid #e5e3dc', borderRadius: '10px', padding: '14px',
      marginBottom: '10px', background: '#fafaf8',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: '6px' }}>
            <CompatBadge compatibilidade={r.compatibilidade} score={r.score} />
          </div>
          <div style={{ fontSize: '14px', fontWeight: '600', color: '#1a1a1a', marginBottom: '4px' }}>
            {r.titulo}
          </div>
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

        <div style={{ flexShrink: 0 }}>
          {r.adicionado_ao_pipeline ? (
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#1D9E75' }}>✓ No pipeline</span>
          ) : (
            <button
              onClick={handleClick}
              disabled={adicionando || r.compatibilidade === 'incompativel'}
              style={{
                fontSize: '12px', fontWeight: '600', padding: '6px 12px',
                background: adicionando ? '#9F9BFF' : '#635BFF',
                color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer',
                opacity: r.compatibilidade === 'incompativel' ? 0.45 : 1,
                whiteSpace: 'nowrap',
              }}
            >
              {adicionando ? '…' : '+ Pipeline'}
            </button>
          )}
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
