'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Assembleia, TipoAssembleia, StatusAssembleia } from '@/types/database'

// ─── Configurações ───────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoAssembleia, { sigla: string; label: string; cor: string; bg: string; border: string }> = {
  AGO:        { sigla: 'AGO', label: 'Assembleia Geral Ordinária',           cor: '#185FA5', bg: '#E6F1FB', border: '#93c5fd' },
  AGE:        { sigla: 'AGE', label: 'Assembleia Geral Extraordinária',      cor: '#6366f1', bg: '#ede9fe', border: '#a5b4fc' },
  reuniao_CA: { sigla: 'CA',  label: 'Reunião do Conselho de Administração', cor: '#4840CC', bg: '#EEF0FF', border: '#6ee7b7' },
  reuniao_CF: { sigla: 'CF',  label: 'Reunião do Conselho Fiscal',           cor: '#854F0B', bg: '#FAEEDA', border: '#fcd34d' },
}

const STATUS_CONFIG: Record<StatusAssembleia, { label: string; cor: string; bg: string; border: string }> = {
  agendada:  { label: 'Agendada',  cor: '#185FA5', bg: '#E6F1FB', border: '#93c5fd' },
  realizada: { label: 'Realizada', cor: '#4840CC', bg: '#EEF0FF', border: '#6ee7b7' },
  cancelada: { label: 'Cancelada', cor: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
}

const TODOS_STATUS: StatusAssembleia[] = ['agendada', 'realizada', 'cancelada']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatarDataCurta(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function diasAte(data: string) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  const alvo = new Date(data + 'T00:00:00')
  return Math.round((alvo.getTime() - hoje.getTime()) / 86_400_000)
}

function InfoLinha({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f3ef' }}>
      <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#1a1a1a', textAlign: 'right', maxWidth: '60%' }}>{valor ?? '—'}</span>
    </div>
  )
}

function Secao({ titulo, icone, children, acao }: {
  titulo: string; icone: string; children: React.ReactNode; acao?: React.ReactNode
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '10px',
      }}>
        <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{icone}</span> {titulo}
        </div>
        {acao}
      </div>
      {children}
    </div>
  )
}

// ─── Toggle de campo booleano ─────────────────────────────────────────────────

function Toggle({ ativo, label, labelAtivo, onChange, disabled }: {
  ativo: boolean; label: string; labelAtivo: string; onChange: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '7px 14px', borderRadius: '8px', border: 'none', cursor: disabled ? 'wait' : 'pointer',
        background: ativo ? '#EEF0FF' : '#f5f5f2',
        color: ativo ? '#4840CC' : '#666',
        fontSize: '12px', fontWeight: '600', transition: 'all 0.15s',
      }}
      onMouseEnter={e => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.opacity = '0.8' }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = '1' }}
    >
      <span style={{
        width: '14px', height: '14px', borderRadius: '3px', border: `2px solid ${ativo ? '#635BFF' : '#d5d3cc'}`,
        background: ativo ? '#635BFF' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {ativo && <span style={{ color: '#fff', fontSize: '9px', fontWeight: '900' }}>✓</span>}
      </span>
      {ativo ? labelAtivo : label}
    </button>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props { assembleia: Assembleia }

export default function AssembleiaDetalhe({ assembleia: initial }: Props) {
  const router = useRouter()
  const [asm, setAsm]                   = useState(initial)
  const [showStatusMenu, setShowStatus] = useState(false)
  const [salvandoStatus, setSalvandoStatus] = useState(false)
  const [mensagem, setMensagem]         = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [presencaInput, setPresenca]    = useState(String(initial.total_presentes))
  const [salvandoPresenca, setSalvPresenca] = useState(false)
  const [salvandoFlag, setSalvandoFlag] = useState<string | null>(null)
  const [confirmExclusao, setConfirmExclusao] = useState(false)
  const [excluindo, setExcluindo]       = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowStatus(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  // ── Utilitário de patch ───────────────────────────────────────────────────

  async function patch(payload: Partial<Assembleia>, feedbackMsg: string, flagKey?: string) {
    if (flagKey) setSalvandoFlag(flagKey)
    const supabase = createClient()
    const { data, error } = await supabase
      .from('assembleias')
      .update({ ...payload, atualizado_em: new Date().toISOString() })
      .eq('id', asm.id)
      .select()
      .single()

    if (error) {
      setMensagem({ tipo: 'erro', texto: `Erro: ${error.message}` })
    } else {
      setAsm(data as Assembleia)
      setMensagem({ tipo: 'ok', texto: feedbackMsg })
    }
    if (flagKey) setSalvandoFlag(null)
    setTimeout(() => setMensagem(null), 4000)
  }

  // ── Alterar status ────────────────────────────────────────────────────────

  async function alterarStatus(novoStatus: StatusAssembleia) {
    if (novoStatus === asm.status) { setShowStatus(false); return }
    setSalvandoStatus(true)
    setShowStatus(false)
    await patch({ status: novoStatus }, `Status alterado para "${STATUS_CONFIG[novoStatus].label}".`)
    setSalvandoStatus(false)
  }

  // ── Salvar presença ───────────────────────────────────────────────────────

  async function salvarPresenca() {
    const n = parseInt(presencaInput, 10)
    if (isNaN(n) || n < 0) { setMensagem({ tipo: 'erro', texto: 'Número inválido.' }); return }
    setSalvPresenca(true)
    const quorum_atingido = asm.quorum_minimo != null ? n >= asm.quorum_minimo : false
    await patch(
      { total_presentes: n, quorum_atingido },
      `Presença registrada: ${n} cooperado${n !== 1 ? 's' : ''}. Quórum ${quorum_atingido ? 'atingido ✓' : 'não atingido ✗'}.`,
    )
    setSalvPresenca(false)
  }

  // ── Toggle booleano ───────────────────────────────────────────────────────

  async function toggleFlag(campo: 'convocacao_enviada' | 'ata_gerada' | 'ata_assinada') {
    const novoValor = !asm[campo]
    const labels: Record<typeof campo, [string, string]> = {
      convocacao_enviada: ['Convocação marcada como enviada.', 'Convocação desmarcada.'],
      ata_gerada:         ['ATA marcada como gerada.', 'ATA desmarcada como gerada.'],
      ata_assinada:       ['ATA marcada como assinada.', 'ATA desmarcada como assinada.'],
    }
    await patch({ [campo]: novoValor }, labels[campo][novoValor ? 0 : 1], campo)
  }

  // ── Excluir ───────────────────────────────────────────────────────────────

  async function excluir() {
    setExcluindo(true)
    const supabase = createClient()
    const { error } = await supabase.from('assembleias').delete().eq('id', asm.id)
    if (error) {
      setMensagem({ tipo: 'erro', texto: `Erro ao excluir: ${error.message}` })
      setExcluindo(false)
      setConfirmExclusao(false)
    } else {
      router.push('/assembleias')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const tipo = TIPO_CONFIG[asm.tipo]
  const st   = STATUS_CONFIG[asm.status]
  const dias = diasAte(asm.data_realizacao)
  const proxima = asm.status === 'agendada' && dias >= 0 && dias <= 7
  const hoje    = asm.status === 'agendada' && dias === 0

  return (
    <div style={{ maxWidth: '960px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontSize: '13px', color: '#888' }}>
        <button onClick={() => router.push('/assembleias')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#635BFF', fontSize: '13px', padding: 0 }}>
          ← Assembleias
        </button>
        <span>/</span>
        <span style={{ color: '#1a1a1a', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '300px' }}>
          {asm.titulo}
        </span>
      </div>

      {/* Feedback */}
      {mensagem && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem',
          background: mensagem.tipo === 'ok' ? '#EEF0FF' : '#fef2f2',
          border: `1px solid ${mensagem.tipo === 'ok' ? '#6ee7b7' : '#fca5a5'}`,
          color: mensagem.tipo === 'ok' ? '#4840CC' : '#dc2626',
        }}>
          {mensagem.tipo === 'ok' ? '✓' : '⚠'} {mensagem.texto}
        </div>
      )}

      {/* Banner: assembleia próxima ou hoje */}
      {proxima && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '1rem',
          background: hoje ? '#fef3c7' : '#E6F1FB',
          border: `1px solid ${hoje ? '#fbbf24' : '#93c5fd'}`,
          fontSize: '13px', fontWeight: '600',
          color: hoje ? '#92400e' : '#185FA5',
          display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span>{hoje ? '🗓 Esta assembleia é hoje!' : `📅 Acontece em ${dias} dia${dias !== 1 ? 's' : ''}.`}</span>
        </div>
      )}

      {/* ── Cabeçalho do card ─────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
        padding: '1.5rem', marginBottom: '1rem',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem', flexWrap: 'wrap' }}>

          {/* Tipo + Título */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: tipo.bg, border: `1.5px solid ${tipo.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', fontWeight: '800', color: tipo.cor, flexShrink: 0, letterSpacing: '0.5px',
            }}>
              {tipo.sigla}
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: tipo.cor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {tipo.label}
              </div>
              <h1 style={{ fontSize: '20px', fontWeight: '700', color: '#1a1a1a', margin: '3px 0 0' }}>
                {asm.titulo}
              </h1>
              <div style={{ fontSize: '13px', color: '#888', marginTop: '4px' }}>
                {formatarData(asm.data_realizacao)}
                {asm.local && <> · 📍 {asm.local}</>}
              </div>
            </div>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Dropdown status */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowStatus(p => !p)}
                disabled={salvandoStatus}
                style={{
                  padding: '6px 14px 6px 10px', borderRadius: '20px',
                  border: `1.5px solid ${st.border}`, background: st.bg,
                  color: st.cor, fontSize: '12px', fontWeight: '700',
                  cursor: salvandoStatus ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.cor, display: 'inline-block' }} />
                {salvandoStatus ? 'Alterando…' : st.label}
                <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
              </button>

              {showStatusMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: '#fff', border: '1px solid #e5e3dc', borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden', minWidth: '160px',
                }}>
                  {TODOS_STATUS.map(s => {
                    const cfg = STATUS_CONFIG[s]
                    const ativo = s === asm.status
                    return (
                      <button key={s} onClick={() => alterarStatus(s)}
                        style={{
                          width: '100%', padding: '9px 14px', border: 'none',
                          background: ativo ? cfg.bg : 'transparent',
                          color: ativo ? cfg.cor : '#444',
                          fontSize: '13px', textAlign: 'left', cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '8px',
                          fontWeight: ativo ? '600' : '400',
                        }}
                        onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = '#f8f7f4' }}
                        onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: cfg.cor, flexShrink: 0 }} />
                        {cfg.label}
                        {ativo && <span style={{ marginLeft: 'auto', fontSize: '11px' }}>✓</span>}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            <button onClick={() => router.push(`/assembleias/${asm.id}/editar`)}
              style={{ padding: '7px 16px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#444', cursor: 'pointer', fontWeight: '500' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8f7f4' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
            >
              ✏️ Editar
            </button>

            <button onClick={() => setConfirmExclusao(true)}
              style={{ padding: '7px 14px', border: '1px solid #fca5a5', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#dc2626', cursor: 'pointer' }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
            >
              🗑
            </button>
          </div>
        </div>

        {/* Badges extras */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
            background: '#f5f5f2', color: '#555',
          }}>
            {asm.modalidade === 'presencial' ? '🏛 Presencial' : asm.modalidade === 'remota' ? '💻 Remota' : '🔀 Híbrida'}
          </span>
          {asm.quorum_minimo && (
            <span style={{
              padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600',
              background: '#f5f5f2', color: '#555',
            }}>
              👥 Quórum mínimo: {asm.quorum_minimo}
            </span>
          )}
          {asm.ata_gerada && (
            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: '#EEF0FF', color: '#4840CC' }}>
              📄 ATA gerada
            </span>
          )}
          {asm.ata_assinada && (
            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: '#EEF0FF', color: '#4840CC' }}>
              ✅ ATA assinada
            </span>
          )}
        </div>
      </div>

      {/* Modal de exclusão */}
      {confirmExclusao && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.75rem', maxWidth: '400px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>Excluir assembleia?</h2>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 1.5rem' }}>
              A assembleia <strong>{asm.titulo}</strong> será removida permanentemente.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmExclusao(false)}
                style={{ padding: '8px 18px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={excluir} disabled={excluindo}
                style={{ padding: '8px 18px', border: 'none', borderRadius: '8px', background: excluindo ? '#f87171' : '#dc2626', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: excluindo ? 'not-allowed' : 'pointer' }}>
                {excluindo ? 'Excluindo…' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Grid de seções ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* Dados gerais */}
        <Secao titulo="Datas" icone="📅">
          <InfoLinha label="Realização"    valor={formatarDataCurta(asm.data_realizacao)} />
          <InfoLinha label="Convocação"    valor={formatarDataCurta(asm.data_convocacao)} />
          <InfoLinha label="Criado em"     valor={formatarDataCurta(asm.criado_em)} />
          <InfoLinha label="Atualizado em" valor={formatarDataCurta(asm.atualizado_em)} />
        </Secao>

        {/* Convocação */}
        <Secao
          titulo="Convocação"
          icone="📢"
          acao={
            <Toggle
              ativo={asm.convocacao_enviada}
              label="Marcar como enviada"
              labelAtivo="Enviada ✓"
              disabled={salvandoFlag === 'convocacao_enviada'}
              onChange={() => toggleFlag('convocacao_enviada')}
            />
          }
        >
          <InfoLinha label="Status convocação" valor={asm.convocacao_enviada ? 'Enviada' : 'Não enviada'} />
          {asm.edital_url ? (
            <div style={{ paddingTop: '8px' }}>
              <a href={asm.edital_url} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', background: '#E6F1FB', border: '1px solid #93c5fd',
                  borderRadius: '8px', fontSize: '12px', color: '#185FA5',
                  textDecoration: 'none', fontWeight: '600',
                }}>
                📎 Ver edital
              </a>
            </div>
          ) : (
            <InfoLinha label="Edital" valor={null} />
          )}
        </Secao>

        {/* Quórum / Presença */}
        <Secao titulo="Quórum e Presença" icone="👥">
          <InfoLinha label="Quórum mínimo"  valor={asm.quorum_minimo ?? '—'} />
          <InfoLinha
            label="Quórum atingido"
            valor={asm.status === 'realizada' ? (asm.quorum_atingido ? 'Sim ✓' : 'Não ✗') : '—'}
          />
          <div style={{ marginTop: '10px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <input
              type="number" min="0" value={presencaInput}
              onChange={e => setPresenca(e.target.value)}
              placeholder="Nº presentes"
              style={{
                flex: 1, padding: '8px 12px', border: '1px solid #d5d3cc',
                borderRadius: '8px', fontSize: '13px', outline: 'none',
              }}
              onFocus={e => (e.target.style.borderColor = '#635BFF')}
              onBlur={e => (e.target.style.borderColor = '#d5d3cc')}
            />
            <button
              onClick={salvarPresenca}
              disabled={salvandoPresenca}
              style={{
                padding: '8px 14px', border: 'none', borderRadius: '8px',
                background: salvandoPresenca ? '#9F9BFF' : '#635BFF',
                color: '#fff', fontSize: '12px', fontWeight: '600',
                cursor: salvandoPresenca ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
              }}
            >
              {salvandoPresenca ? '…' : 'Registrar'}
            </button>
          </div>
          <p style={{ fontSize: '11px', color: '#aaa', marginTop: '4px' }}>
            Total atual: <strong>{asm.total_presentes}</strong> presente{asm.total_presentes !== 1 ? 's' : ''}
          </p>
        </Secao>

        {/* ATA */}
        <Secao titulo="Ata" icone="📄">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '10px' }}>
            <Toggle
              ativo={asm.ata_gerada}
              label="ATA não gerada"
              labelAtivo="ATA gerada"
              disabled={salvandoFlag === 'ata_gerada'}
              onChange={() => toggleFlag('ata_gerada')}
            />
            <Toggle
              ativo={asm.ata_assinada}
              label="ATA não assinada"
              labelAtivo="ATA assinada"
              disabled={salvandoFlag === 'ata_assinada' || !asm.ata_gerada}
              onChange={() => { if (asm.ata_gerada) toggleFlag('ata_assinada') }}
            />
          </div>
          {asm.ata_url ? (
            <a href={asm.ata_url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '7px 14px', background: '#EEF0FF', border: '1px solid #6ee7b7',
                borderRadius: '8px', fontSize: '12px', color: '#4840CC',
                textDecoration: 'none', fontWeight: '600',
              }}>
              📎 Ver ATA
            </a>
          ) : (
            <p style={{ fontSize: '12px', color: '#aaa', margin: 0 }}>Nenhuma ATA anexada.</p>
          )}
        </Secao>

        {/* Pauta */}
        {asm.pauta && (
          <div style={{
            gridColumn: '1 / -1',
            background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📋 Pauta
            </div>
            <pre style={{ fontSize: '13px', color: '#444', margin: 0, lineHeight: '1.7', whiteSpace: 'pre-wrap', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
              {asm.pauta}
            </pre>
          </div>
        )}

        {/* Observações */}
        {asm.observacoes && (
          <div style={{
            gridColumn: '1 / -1',
            background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📝 Observações
            </div>
            <p style={{ fontSize: '13px', color: '#444', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {asm.observacoes}
            </p>
          </div>
        )}
      </div>

      <p style={{ fontSize: '11px', color: '#bbb', marginTop: '1rem', textAlign: 'right' }}>
        ID: {asm.id}
      </p>
    </div>
  )
}
