'use client'

import React, { useEffect, useState } from 'react'
import { useForm, type SubmitHandler } from 'react-hook-form'
import type { Oportunidade, Usuario } from '@/types/database'
import type { OportunidadeLogComUsuario, DadosContato, DadosProposta } from '@/lib/captacao/actions'
import { criarOportunidade, atualizarOportunidade, registrarContato, registrarProposta } from '@/lib/captacao/actions'
import LogTimeline from './LogTimeline'

const TEAL = '#1D9E75'

const AREAS_TEMATICAS = [
  'agrofloresta', 'cacau', 'café', 'pecuária', 'pesca', 'mel',
  'plantas medicinais', 'clima', 'cooperativismo',
  'agricultura familiar', 'biodiversidade', 'outro',
]

const STATUS_LABEL: Record<string, string> = {
  identificado: 'Identificado', contatado: 'Contatado', proposta: 'Proposta',
  aguardando: 'Aguardando', aprovado: 'Aprovado', reprovado: 'Reprovado', arquivado: 'Arquivado',
}

const FONTE_BADGE: Record<string, { label: string; cor: string; bg: string }> = {
  internacional: { label: 'Internacional', cor: '#185FA5', bg: '#E6F1FB' },
  nacional:      { label: 'Nacional',      cor: '#1D9E75', bg: '#E6F7F1' },
  manual:        { label: 'Manual',        cor: '#555',    bg: '#f5f5f2' },
  agregador:     { label: 'Agregador',     cor: '#7C3AED', bg: '#EDE9FE' },
}

const CANAL_LABEL: Record<string, string> = {
  email: 'E-mail', reuniao: 'Reunião', ligacao: 'Ligação',
  whatsapp: 'WhatsApp', outro: 'Outro',
}

type FonteOp   = 'internacional' | 'nacional' | 'manual' | 'agregador'
type AbaModal  = 'identificacao' | 'contatos' | 'proposta' | 'resultado' | 'historico'

interface FormValues {
  titulo:          string
  financiador:     string
  fonte:           FonteOp
  fonte_detalhe:   string
  fonte_url:       string
  area_tematica:   string[]
  valor_estimado:  string
  moeda:           string
  prazo_submissao: string
  prazo_resultado: string
  responsavel_id:  string
  observacoes:     string
}

function formatData(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')
}

function formatValor(v: number | null | undefined, moeda = 'BRL') {
  if (v == null) return '—'
  return v.toLocaleString('pt-BR', { style: 'currency', currency: moeda })
}

function parseJson(s: string | null): Record<string, string> {
  try { return s ? JSON.parse(s) : {} } catch { return {} }
}

function parseBRValor(v: string): number | null {
  if (!v?.trim()) return null
  const clean = v.replace(/\./g, '').replace(',', '.')
  const n = parseFloat(clean)
  return isNaN(n) ? null : n
}

function formatMoeda(n: number | null | undefined, moeda = 'BRL'): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: moeda }).format(n)
}

const CANAL_CORES: Record<string, { bg: string; cor: string }> = {
  email:    { bg: '#DBEAFE', cor: '#1E40AF' },
  reuniao:  { bg: '#EDE9FE', cor: '#6D28D9' },
  ligacao:  { bg: '#E6F7F1', cor: '#1D9E75' },
  whatsapp: { bg: '#D1FAE5', cor: '#065F46' },
  outro:    { bg: '#f0eeea', cor: '#555' },
}

const STATUS_PROPOSTA_CORES: Record<string, { bg: string; cor: string }> = {
  'Em elaboração':      { bg: '#fef9c3', cor: '#854d0e' },
  'Enviada':            { bg: '#dcfce7', cor: '#166534' },
  'Revisão solicitada': { bg: '#ffedd5', cor: '#9a3412' },
}

interface Props {
  mode: 'create' | 'view' | 'edit'
  oportunidade?: Oportunidade
  logs?: OportunidadeLogComUsuario[]
  carregando?: boolean
  responsaveis: Pick<Usuario, 'id' | 'nome_completo'>[]
  usuarioAtual: Pick<Usuario, 'id' | 'nome_completo'>
  onClose: () => void
  onSalvo: () => void
  onEditar?: () => void
}

export default function OportunidadeModal({
  mode, oportunidade, logs = [], carregando = false,
  responsaveis, usuarioAtual, onClose, onSalvo, onEditar,
}: Props) {
  // ── Form state (create/edit) ───────────────────────────────────────────────
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro]         = useState('')

  const defaultValues: FormValues = {
    titulo:          oportunidade?.titulo          ?? '',
    financiador:     oportunidade?.financiador     ?? '',
    fonte:           (oportunidade?.fonte          ?? 'nacional') as FonteOp,
    fonte_detalhe:   oportunidade?.fonte_detalhe   ?? '',
    fonte_url:       oportunidade?.fonte_url       ?? '',
    area_tematica:   oportunidade?.area_tematica   ?? [],
    valor_estimado:  oportunidade?.valor_estimado != null
      ? oportunidade.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      : '',
    moeda:           oportunidade?.moeda           ?? 'BRL',
    prazo_submissao: oportunidade?.prazo_submissao ?? '',
    prazo_resultado: oportunidade?.prazo_resultado ?? '',
    responsavel_id:  oportunidade?.responsavel_id  ?? '',
    observacoes:     oportunidade?.observacoes     ?? '',
  }

  const { register, handleSubmit, watch, setValue, setError, formState: { errors } } = useForm<FormValues>({ defaultValues })
  const areasTematicas = watch('area_tematica') ?? []

  function toggleArea(area: string) {
    setValue('area_tematica', areasTematicas.includes(area)
      ? areasTematicas.filter(a => a !== area)
      : [...areasTematicas, area])
  }

  const onSubmit: SubmitHandler<FormValues> = async (values) => {
    if (!values.titulo.trim())      { setError('titulo',      { message: 'Obrigatório' }); return }
    if (!values.financiador.trim()) { setError('financiador', { message: 'Obrigatório' }); return }

    setSalvando(true); setErro('')
    const valorNum = values.valor_estimado ? parseBRValor(values.valor_estimado) : null
    const dados: Partial<Oportunidade> = {
      titulo: values.titulo, financiador: values.financiador, fonte: values.fonte,
      fonte_detalhe: values.fonte_detalhe || null, fonte_url: values.fonte_url || null,
      area_tematica: values.area_tematica,
      valor_estimado: valorNum != null && !isNaN(valorNum) ? valorNum : null,
      moeda: values.moeda,
      prazo_submissao: values.prazo_submissao || null, prazo_resultado: values.prazo_resultado || null,
      responsavel_id: values.responsavel_id || null, observacoes: values.observacoes || null,
    }
    const res = mode === 'create'
      ? await criarOportunidade(dados)
      : await atualizarOportunidade(oportunidade!.id, dados)
    setSalvando(false)
    if (res.error) { setErro(res.error); return }
    onSalvo()
  }

  // ── View state (abas) ──────────────────────────────────────────────────────
  const [abaAtiva, setAbaAtiva] = useState<AbaModal>('identificacao')
  const [logsState, setLogsState] = useState<OportunidadeLogComUsuario[]>(logs)

  useEffect(() => { setLogsState(logs) }, [logs])

  const contatos  = logsState.filter(l => l.acao === 'contato')
  const propostas = logsState.filter(l => l.acao === 'proposta')
  const isResultadoFinal = oportunidade && ['aprovado', 'reprovado'].includes(oportunidade.status)

  // ── Contato form ───────────────────────────────────────────────────────────
  const [showContato, setShowContato] = useState(false)
  const [contato, setContato] = useState<DadosContato>({
    data: new Date().toISOString().split('T')[0],
    canal: 'email', responsavel_id: '', descricao: '', proximo_passo: '',
  })
  const [salvandoContato, setSalvandoContato] = useState(false)
  const [erroContato, setErroContato] = useState('')

  async function handleSalvarContato() {
    if (!contato.descricao.trim()) { setErroContato('Descreva o que foi tratado.'); return }
    setSalvandoContato(true); setErroContato('')
    const res = await registrarContato(oportunidade!.id, contato)
    setSalvandoContato(false)
    if (res.error) { setErroContato(res.error); return }
    const novoLog: OportunidadeLogComUsuario = {
      id: String(Date.now()), oportunidade_id: oportunidade!.id,
      usuario_id: usuarioAtual.id, acao: 'contato', status_anterior: null, status_novo: null,
      descricao: JSON.stringify(contato), criado_em: new Date().toISOString(),
      usuario: { nome_completo: usuarioAtual.nome_completo },
    }
    setLogsState(prev => [novoLog, ...prev])
    setContato({ data: new Date().toISOString().split('T')[0], canal: 'email', responsavel_id: '', descricao: '', proximo_passo: '' })
    setShowContato(false)
  }

  // ── Proposta form ──────────────────────────────────────────────────────────
  const [showProposta, setShowProposta] = useState(false)
  const [proposta, setProposta] = useState<DadosProposta>({
    data_envio: new Date().toISOString().split('T')[0],
    valor_solicitado: '', status_proposta: 'Em elaboração',
    documento_url: '', observacoes: '',
  })
  const [salvandoProposta, setSalvandoProposta] = useState(false)
  const [erroProposta, setErroProposta] = useState('')

  async function handleSalvarProposta() {
    setSalvandoProposta(true); setErroProposta('')
    const res = await registrarProposta(oportunidade!.id, proposta)
    setSalvandoProposta(false)
    if (res.error) { setErroProposta(res.error); return }
    const novoLog: OportunidadeLogComUsuario = {
      id: String(Date.now()), oportunidade_id: oportunidade!.id,
      usuario_id: usuarioAtual.id, acao: 'proposta', status_anterior: null, status_novo: null,
      descricao: JSON.stringify(proposta), criado_em: new Date().toISOString(),
      usuario: { nome_completo: usuarioAtual.nome_completo },
    }
    setLogsState(prev => [novoLog, ...prev])
    setProposta({ data_envio: new Date().toISOString().split('T')[0], valor_solicitado: '', status_proposta: 'Em elaboração', documento_url: '', observacoes: '' })
    setShowProposta(false)
  }

  const isForm = mode === 'create' || mode === 'edit'

  const ABAS: Array<{ id: AbaModal; label: string }> = [
    { id: 'identificacao', label: 'Identificação' },
    { id: 'contatos',      label: `Contatos${contatos.length ? ` (${contatos.length})` : ''}` },
    { id: 'proposta',      label: `Proposta${propostas.length ? ` (${propostas.length})` : ''}` },
    ...(isResultadoFinal ? [{ id: 'resultado' as AbaModal, label: 'Resultado' }] : []),
    { id: 'historico',     label: 'Histórico' },
  ]

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '720px', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Header fixo */}
        <div style={{ padding: '1.25rem 1.5rem 0', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
                {mode === 'create' ? 'Nova oportunidade' : isForm ? 'Editar oportunidade' : oportunidade?.titulo}
              </h2>
              {mode === 'view' && oportunidade && (
                <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                  {(() => { const f = FONTE_BADGE[oportunidade.fonte] ?? FONTE_BADGE.manual; return (
                    <span style={{ fontSize: '11px', fontWeight: '600', color: f.cor, background: f.bg, padding: '2px 8px', borderRadius: '12px' }}>{f.label}</span>
                  )})()}
                  <span style={{ fontSize: '11px', fontWeight: '600', color: '#635BFF', background: '#EEEDFE', padding: '2px 8px', borderRadius: '12px' }}>
                    {STATUS_LABEL[oportunidade.status] || oportunidade.status}
                  </span>
                </div>
              )}
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#888', lineHeight: 1, padding: '0 4px' }}>×</button>
          </div>

          {/* Abas — só em view */}
          {mode === 'view' && !carregando && (
            <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #e5e3dc' }}>
              {ABAS.map(aba => (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  style={{
                    padding: '8px 14px', fontSize: '12px', fontWeight: abaAtiva === aba.id ? '600' : '400',
                    color: abaAtiva === aba.id ? TEAL : '#888',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: abaAtiva === aba.id ? `2px solid ${TEAL}` : '2px solid transparent',
                    marginBottom: '-1px', whiteSpace: 'nowrap',
                  }}
                >
                  {aba.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Corpo com scroll */}
        <div style={{ overflowY: 'auto', padding: '1.25rem 1.5rem', flex: 1 }}>

          {/* ── VIEW MODE ────────────────────────────────────────────────── */}
          {mode === 'view' && oportunidade && (
            carregando ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#aaa', fontSize: '13px' }}>Carregando…</div>
            ) : (
              <>
                {/* ── Aba: Identificação ─────────────────────────────────── */}
                {abaAtiva === 'identificacao' && (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
                      <Campo label="Financiador"     valor={oportunidade.financiador} />
                      <Campo label="Fonte detalhe"   valor={oportunidade.fonte_detalhe || '—'} />
                      <Campo label="Valor estimado"  valor={formatValor(oportunidade.valor_estimado, oportunidade.moeda)} />
                      <Campo label="Prazo submissão" valor={formatData(oportunidade.prazo_submissao)} />
                      <Campo label="Prazo resultado" valor={formatData(oportunidade.prazo_resultado)} />
                      <Campo label="Responsável"     valor={responsaveis.find(r => r.id === oportunidade.responsavel_id)?.nome_completo || '—'} />
                    </div>

                    {oportunidade.fonte_url && (
                      <div style={{ marginBottom: '12px' }}>
                        <FieldLabel text="URL do edital" />
                        <a href={oportunidade.fonte_url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#635BFF', wordBreak: 'break-all' }}>
                          {oportunidade.fonte_url}
                        </a>
                      </div>
                    )}

                    {(oportunidade.area_tematica?.length ?? 0) > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <FieldLabel text="Áreas temáticas" />
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                          {oportunidade.area_tematica.map(a => (
                            <span key={a} style={{ fontSize: '11px', background: '#f0eeea', color: '#555', padding: '3px 8px', borderRadius: '12px' }}>{a}</span>
                          ))}
                        </div>
                      </div>
                    )}

                    {oportunidade.observacoes && (
                      <div style={{ marginBottom: '12px' }}>
                        <FieldLabel text="Observações" />
                        <p style={{ fontSize: '13px', color: '#444', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{oportunidade.observacoes}</p>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e5e3dc', gap: '8px' }}>
                      <button onClick={onClose} style={btnSecondary}>Fechar</button>
                      {onEditar && <button onClick={onEditar} style={btnPrimary}>Editar</button>}
                    </div>
                  </>
                )}

                {/* ── Aba: Contatos ──────────────────────────────────────── */}
                {abaAtiva === 'contatos' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                      <button
                        onClick={() => { setShowContato(v => !v); setErroContato('') }}
                        style={showContato ? btnSecondary : btnPrimary}
                      >
                        {showContato ? 'Cancelar' : '+ Registrar contato'}
                      </button>
                    </div>

                    {showContato && (
                      <div style={{ background: '#f8f7f4', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <FormLabel text="Data" />
                            <input type="date" value={contato.data}
                              onChange={e => setContato(p => ({ ...p, data: e.target.value }))}
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <FormLabel text="Canal" />
                            <select value={contato.canal}
                              onChange={e => setContato(p => ({ ...p, canal: e.target.value }))}
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                              <option value="email">E-mail</option>
                              <option value="reuniao">Reunião</option>
                              <option value="ligacao">Ligação</option>
                              <option value="whatsapp">WhatsApp</option>
                              <option value="outro">Outro</option>
                            </select>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <FormLabel text="Responsável" />
                            <select value={contato.responsavel_id}
                              onChange={e => setContato(p => ({ ...p, responsavel_id: e.target.value }))}
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                              <option value="">Selecionar...</option>
                              {responsaveis.map(u => <option key={u.id} value={u.id}>{u.nome_completo}</option>)}
                            </select>
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <FormLabel text="O que foi tratado *" />
                            <textarea value={contato.descricao}
                              onChange={e => setContato(p => ({ ...p, descricao: e.target.value }))}
                              rows={3} placeholder="Descreva o contato realizado…"
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <FormLabel text="Próximo passo" />
                            <textarea value={contato.proximo_passo}
                              onChange={e => setContato(p => ({ ...p, proximo_passo: e.target.value }))}
                              rows={2} placeholder="O que precisa acontecer a seguir…"
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                          </div>
                        </div>
                        {erroContato && <p style={{ fontSize: '12px', color: '#dc2626', margin: '0 0 8px' }}>{erroContato}</p>}
                        <button onClick={handleSalvarContato} disabled={salvandoContato} style={{ ...btnPrimary, opacity: salvandoContato ? 0.7 : 1 }}>
                          {salvandoContato ? 'Salvando…' : 'Salvar contato'}
                        </button>
                      </div>
                    )}

                    {contatos.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '2rem 0' }}>
                        Nenhum contato registrado ainda.
                      </p>
                    ) : contatos.map(log => {
                      const d = parseJson(log.descricao)
                      const canalCor = CANAL_CORES[d.canal] ?? CANAL_CORES.outro
                      return (
                        <div key={log.id} style={{ border: '1px solid #e5e3dc', borderRadius: '10px', padding: '12px', marginBottom: '8px', background: '#fafaf8' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', fontWeight: '600', background: canalCor.bg, color: canalCor.cor, padding: '2px 8px', borderRadius: '10px' }}>
                                {CANAL_LABEL[d.canal] ?? d.canal ?? 'Contato'}
                              </span>
                              {d.data && <span style={{ fontSize: '11px', color: '#888' }}>{formatData(d.data)}</span>}
                            </div>
                            {d.responsavel_id && (
                              <span style={{ fontSize: '11px', color: '#888' }}>
                                {responsaveis.find(r => r.id === d.responsavel_id)?.nome_completo ?? ''}
                              </span>
                            )}
                          </div>
                          {d.descricao && <p style={{ fontSize: '13px', color: '#444', margin: '0 0 4px', whiteSpace: 'pre-wrap' }}>{d.descricao}</p>}
                          {d.proximo_passo && (
                            <div style={{ fontSize: '12px', color: '#1D9E75', marginTop: '6px', padding: '6px 10px', background: '#E6F7F1', borderRadius: '6px', display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                              <span style={{ flexShrink: 0, fontWeight: '700' }}>→</span>
                              <span>{d.proximo_passo}</span>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </>
                )}

                {/* ── Aba: Proposta ──────────────────────────────────────── */}
                {abaAtiva === 'proposta' && (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                      <button
                        onClick={() => { setShowProposta(v => !v); setErroProposta('') }}
                        style={showProposta ? btnSecondary : btnPrimary}
                      >
                        {showProposta ? 'Cancelar' : '+ Registrar envio de proposta'}
                      </button>
                    </div>

                    {showProposta && (
                      <div style={{ background: '#f8f7f4', borderRadius: '10px', padding: '1rem', marginBottom: '1rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                          <div>
                            <FormLabel text="Data de envio" />
                            <input type="date" value={proposta.data_envio}
                              onChange={e => setProposta(p => ({ ...p, data_envio: e.target.value }))}
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                          </div>
                          <div>
                            <FormLabel text="Status" />
                            <select value={proposta.status_proposta}
                              onChange={e => setProposta(p => ({ ...p, status_proposta: e.target.value }))}
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                              <option>Em elaboração</option>
                              <option>Enviada</option>
                              <option>Revisão solicitada</option>
                            </select>
                          </div>
                          <div>
                            <FormLabel text="Valor solicitado (R$)" />
                            <input
                              type="text"
                              value={proposta.valor_solicitado}
                              onChange={e => setProposta(p => ({ ...p, valor_solicitado: e.target.value.replace(/[^0-9.,]/g, '') }))}
                              placeholder="0,00"
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div>
                            <FormLabel text="Link do documento" />
                            <input type="url" value={proposta.documento_url}
                              onChange={e => setProposta(p => ({ ...p, documento_url: e.target.value }))}
                              placeholder="https://..."
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <FormLabel text="Observações" />
                            <textarea value={proposta.observacoes}
                              onChange={e => setProposta(p => ({ ...p, observacoes: e.target.value }))}
                              rows={3} placeholder="Notas sobre a proposta…"
                              style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
                          </div>
                        </div>
                        {erroProposta && <p style={{ fontSize: '12px', color: '#dc2626', margin: '0 0 8px' }}>{erroProposta}</p>}
                        <button onClick={handleSalvarProposta} disabled={salvandoProposta} style={{ ...btnPrimary, opacity: salvandoProposta ? 0.7 : 1 }}>
                          {salvandoProposta ? 'Salvando…' : 'Registrar proposta'}
                        </button>
                      </div>
                    )}

                    {propostas.length === 0 ? (
                      <p style={{ fontSize: '13px', color: '#aaa', textAlign: 'center', padding: '2rem 0' }}>
                        Nenhuma proposta registrada ainda.
                      </p>
                    ) : propostas.map(log => {
                      const d = parseJson(log.descricao)
                      const statusCor = STATUS_PROPOSTA_CORES[d.status_proposta ?? ''] ?? { bg: '#f0eeea', cor: '#555' }
                      return (
                        <div key={log.id} style={{ border: '1px solid #e5e3dc', borderRadius: '10px', padding: '12px', marginBottom: '8px', background: '#fafaf8' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '11px', fontWeight: '600', background: statusCor.bg, color: statusCor.cor, padding: '2px 8px', borderRadius: '10px' }}>
                              {d.status_proposta ?? 'Proposta'}
                            </span>
                            {d.data_envio && <span style={{ fontSize: '11px', color: '#888' }}>{formatData(d.data_envio)}</span>}
                          </div>
                          {d.valor_solicitado && (
                            <div style={{ fontSize: '13px', fontWeight: '600', color: TEAL, marginBottom: '6px' }}>
                              {formatMoeda(parseBRValor(d.valor_solicitado), oportunidade.moeda)}
                            </div>
                          )}
                          {d.documento_url && (
                            <a href={d.documento_url} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: '#635BFF', display: 'inline-flex', alignItems: 'center', gap: '3px', marginBottom: '6px' }}>
                              Ver documento ↗
                            </a>
                          )}
                          {d.observacoes && <p style={{ fontSize: '12px', color: '#555', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{d.observacoes}</p>}
                        </div>
                      )
                    })}
                  </>
                )}

                {/* ── Aba: Resultado ─────────────────────────────────────── */}
                {abaAtiva === 'resultado' && isResultadoFinal && (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
                      <span style={{
                        fontSize: '14px', fontWeight: '700', padding: '6px 16px', borderRadius: '12px',
                        background: oportunidade.status === 'aprovado' ? '#dcfce7' : '#fee2e2',
                        color:      oportunidade.status === 'aprovado' ? '#166534' : '#991b1b',
                      }}>
                        {oportunidade.status === 'aprovado' ? '✓ Aprovado' : '✗ Reprovado'}
                      </span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
                      <Campo label="Valor aprovado"   valor={formatValor(oportunidade.valor_estimado, oportunidade.moeda)} />
                      <Campo label="Prazo resultado"  valor={formatData(oportunidade.prazo_resultado)} />
                    </div>
                    {oportunidade.observacoes && (
                      <div style={{ marginBottom: '12px' }}>
                        <FieldLabel text="Observações / Feedback" />
                        <p style={{ fontSize: '13px', color: '#444', margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{oportunidade.observacoes}</p>
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid #e5e3dc' }}>
                      {onEditar && <button onClick={onEditar} style={btnPrimary}>Editar dados</button>}
                    </div>
                  </>
                )}

                {/* ── Aba: Histórico ─────────────────────────────────────── */}
                {abaAtiva === 'historico' && (
                  <LogTimeline logs={logsState} />
                )}
              </>
            )
          )}

          {/* ── FORM MODE (create / edit) — inalterado ───────────────── */}
          {isForm && (
            <form onSubmit={handleSubmit(onSubmit)}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

                <div style={{ gridColumn: '1 / -1' }}>
                  <FormLabel text="Título *" error={errors.titulo?.message} />
                  <input {...register('titulo')} placeholder="Nome da oportunidade" style={{ ...inputStyle, borderColor: errors.titulo ? '#dc2626' : '#d5d3cc', width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <FormLabel text="Financiador *" error={errors.financiador?.message} />
                  <input {...register('financiador')} placeholder="ex: GIZ, CAR, BNDES" style={{ ...inputStyle, borderColor: errors.financiador ? '#dc2626' : '#d5d3cc', width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <FormLabel text="Fonte" />
                  <select {...register('fonte')} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                    <option value="nacional">Nacional</option>
                    <option value="internacional">Internacional</option>
                    <option value="manual">Manual</option>
                    <option value="agregador">Agregador</option>
                  </select>
                </div>

                <div>
                  <FormLabel text="Detalhe da fonte" />
                  <input {...register('fonte_detalhe')} placeholder="ex: NORAD, Petrobras" style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <FormLabel text="URL do edital" />
                  <input {...register('fonte_url')} placeholder="https://..." style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <FormLabel text="Valor estimado" />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select {...register('moeda')} style={{ ...inputStyle, width: '80px', flexShrink: 0, cursor: 'pointer' }}>
                      <option value="BRL">BRL</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                    <input
                      {...register('valor_estimado')}
                      type="text"
                      placeholder="0,00"
                      style={{ ...inputStyle, flex: 1 }}
                      onKeyDown={e => {
                        const ok = /[\d,.]/.test(e.key) || ['Backspace','Delete','ArrowLeft','ArrowRight','Tab','Home','End'].includes(e.key) || e.ctrlKey || e.metaKey
                        if (!ok) e.preventDefault()
                      }}
                    />
                  </div>
                </div>

                <div>
                  <FormLabel text="Prazo de submissão" />
                  <input type="date" {...register('prazo_submissao')} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <FormLabel text="Prazo de resultado" />
                  <input type="date" {...register('prazo_resultado')} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box' }} />
                </div>

                <div>
                  <FormLabel text="Responsável" />
                  <select {...register('responsavel_id')} style={{ ...inputStyle, width: '100%', boxSizing: 'border-box', cursor: 'pointer' }}>
                    <option value="">Nenhum</option>
                    {responsaveis.map(u => (
                      <option key={u.id} value={u.id}>{u.nome_completo}</option>
                    ))}
                  </select>
                </div>

              </div>

              <div style={{ marginTop: '14px' }}>
                <FormLabel text="Áreas temáticas" />
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {AREAS_TEMATICAS.map(area => {
                    const sel = areasTematicas.includes(area)
                    return (
                      <button key={area} type="button" onClick={() => toggleArea(area)}
                        style={{ fontSize: '12px', padding: '4px 10px', borderRadius: '12px', border: `1px solid ${sel ? TEAL : '#d5d3cc'}`, background: sel ? '#E6F7F1' : '#fff', color: sel ? TEAL : '#555', cursor: 'pointer', fontWeight: sel ? '600' : '400' }}>
                        {area}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div style={{ marginTop: '14px' }}>
                <FormLabel text="Observações" />
                <textarea {...register('observacoes')} rows={3}
                  style={{ ...inputStyle, resize: 'vertical', width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' }}
                  placeholder="Informações adicionais…" />
              </div>

              {erro && <p style={{ fontSize: '13px', color: '#dc2626', marginTop: '8px' }}>{erro}</p>}

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '1.25rem', borderTop: '1px solid #e5e3dc', paddingTop: '1rem' }}>
                <button type="button" onClick={onClose} style={btnSecondary}>Cancelar</button>
                <button type="submit" disabled={salvando} style={{ ...btnPrimary, opacity: salvando ? 0.7 : 1 }}>
                  {salvando ? 'Salvando…' : mode === 'create' ? 'Criar oportunidade' : 'Salvar alterações'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

// ── UI helpers ────────────────────────────────────────────────────────────────

function Campo({ label, valor }: { label: string; valor: string }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '2px' }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#1a1a1a' }}>{valor}</div>
    </div>
  )
}

function FieldLabel({ text }: { text: string }) {
  return <div style={{ fontSize: '11px', color: '#888', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '4px' }}>{text}</div>
}

function FormLabel({ text, error }: { text: string; error?: string }) {
  return (
    <div style={{ fontSize: '12px', fontWeight: '500', color: error ? '#dc2626' : '#555', marginBottom: '4px' }}>
      {text}{error && <span style={{ fontWeight: '400', marginLeft: '6px' }}>{error}</span>}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  padding: '8px 10px', fontSize: '13px', borderRadius: '8px',
  border: '1px solid #d5d3cc', outline: 'none', background: '#fff',
  color: '#1a1a1a', display: 'block',
}

const btnPrimary: React.CSSProperties = {
  padding: '8px 18px', background: '#1D9E75', color: '#fff',
  border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
}

const btnSecondary: React.CSSProperties = {
  padding: '8px 18px', background: 'transparent', color: '#555',
  border: '1px solid #d5d3cc', borderRadius: '8px', fontSize: '13px', cursor: 'pointer',
}
