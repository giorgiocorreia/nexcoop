'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Mensalidade, StatusMensalidade } from '@/types/database'
import type { CooperadoDetalhe, HistoricoItem } from './page'

// ─── Configurações ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusMensalidade, { label: string; cor: string; bg: string; border: string }> = {
  pendente: { label: 'Pendente', cor: '#854F0B', bg: '#FAEEDA', border: '#fcd34d' },
  pago:     { label: 'Pago',     cor: '#4840CC', bg: '#EEF0FF', border: '#6ee7b7' },
  vencido:  { label: 'Vencido',  cor: '#993C1D', bg: '#FAECE7', border: '#fca5a5' },
}

const STATUS_COOPERADO: Record<string, { label: string; cor: string; bg: string }> = {
  ativo:        { label: 'Ativo',       cor: '#4840CC', bg: '#EEF0FF' },
  probatorio:   { label: 'Probatório',  cor: '#185FA5', bg: '#E6F1FB' },
  inadimplente: { label: 'Inadimplente',cor: '#854F0B', bg: '#FAEEDA' },
  suspenso:     { label: 'Suspenso',    cor: '#993C1D', bg: '#FAECE7' },
  proposta:     { label: 'Proposta',    cor: '#6366f1', bg: '#ede9fe' },
  demitido:     { label: 'Demitido',    cor: '#7f1d1d', bg: '#fee2e2' },
  excluido:     { label: 'Excluído',    cor: '#374151', bg: '#f3f4f6' },
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function formatarMes(data: string) {
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}

function formatarMesCurto(data: string) {
  return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}

function formatarCPF(cpf: string | null) {
  if (!cpf) return null
  const s = cpf.replace(/\D/g, '')
  if (s.length !== 11) return cpf
  return `${s.slice(0,3)}.${s.slice(3,6)}.${s.slice(6,9)}-${s.slice(9)}`
}

function calcStatusEfetivo(m: Mensalidade | HistoricoItem): StatusMensalidade {
  if (m.status === 'pago') return 'pago'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  if (new Date(m.data_vencimento + 'T00:00:00') < hoje) return 'vencido'
  return 'pendente'
}

function InfoLinha({ label, valor }: { label: string; valor?: string | number | null }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f5f3ef' }}>
      <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>{label}</span>
      <span style={{ fontSize: '13px', color: '#1a1a1a', textAlign: 'right', maxWidth: '65%' }}>{valor ?? '—'}</span>
    </div>
  )
}

function Secao({ titulo, icone, children }: { titulo: string; icone: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <span>{icone}</span> {titulo}
      </div>
      {children}
    </div>
  )
}

const inpStyle: React.CSSProperties = {
  width: '100%', padding: '8px 12px', border: '1px solid #d5d3cc',
  borderRadius: '8px', fontSize: '13px', background: '#fafaf8',
  color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const fo = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = '#635BFF')
const bl = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => (e.target.style.borderColor = '#d5d3cc')

function CampoEdit({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '4px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  mensalidade: Mensalidade
  cooperado: CooperadoDetalhe | null
  historico: HistoricoItem[]
}

// ─── Modos de interação ───────────────────────────────────────────────────────

type Modo = 'view' | 'pagamento' | 'editar'

// ─── Componente ──────────────────────────────────────────────────────────────

export default function MensalidadeDetalhe({ mensalidade: initial, cooperado, historico }: Props) {
  const router = useRouter()

  const [mens, setMens]         = useState(initial)
  const [modo, setModo]         = useState<Modo>('view')
  const [salvando, setSalvando] = useState(false)
  const [excluindo, setExcluindo]       = useState(false)
  const [confirmarExclusao, setConfirmarExclusao] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  // Formulário de pagamento
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().split('T')[0])
  const [obsPagamento, setObsPagamento]   = useState('')

  // Formulário de edição
  const [editValor, setEditValor]   = useState(String(mens.valor))
  const [editVenc, setEditVenc]     = useState(mens.data_vencimento)
  const [editObs, setEditObs]       = useState(mens.observacoes ?? '')

  const sv  = calcStatusEfetivo(mens)
  const stc = STATUS_CONFIG[sv]

  function feedback(tipo: 'ok' | 'erro', texto: string) {
    setMensagem({ tipo, texto })
    setTimeout(() => setMensagem(null), 4500)
  }

  // ── Registrar pagamento ───────────────────────────────────────────────────
  async function handlePagar() {
    setSalvando(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const { data, error } = await supabase
      .from('mensalidades')
      .update({ status: 'pago', data_pagamento: dataPagamento, observacoes: obsPagamento.trim() || null, atualizado_em: new Date().toISOString(), usuario_id: user?.id ?? null })
      .eq('id', mens.id)
      .select()
      .single<Mensalidade>()

    setSalvando(false)
    if (error) { feedback('erro', `Erro: ${error.message}`); return }
    setMens(data)
    setModo('view')
    feedback('ok', 'Pagamento registrado com sucesso.')
  }

  // ── Salvar edição ─────────────────────────────────────────────────────────
  async function handleSalvar() {
    if (!editValor || Number(editValor) < 0) { feedback('erro', 'Informe um valor válido.'); return }
    if (!editVenc) { feedback('erro', 'Informe a data de vencimento.'); return }

    setSalvando(true)
    const { data, error } = await createClient()
      .from('mensalidades')
      .update({ valor: Number(editValor), data_vencimento: editVenc, observacoes: editObs.trim() || null, atualizado_em: new Date().toISOString() })
      .eq('id', mens.id)
      .select()
      .single<Mensalidade>()

    setSalvando(false)
    if (error) { feedback('erro', `Erro: ${error.message}`); return }
    setMens(data)
    setEditValor(String(data.valor))
    setEditVenc(data.data_vencimento)
    setEditObs(data.observacoes ?? '')
    setModo('view')
    feedback('ok', 'Alterações salvas.')
  }

  // ── Excluir ───────────────────────────────────────────────────────────────
  async function handleExcluir() {
    setExcluindo(true)
    const { error } = await createClient().from('mensalidades').delete().eq('id', mens.id)
    if (error) { feedback('erro', `Erro: ${error.message}`); setExcluindo(false); setConfirmarExclusao(false); return }
    router.push('/mensalidades')
  }

  const diasVenc = mens.data_vencimento
    ? Math.round((new Date(mens.data_vencimento + 'T00:00:00').getTime() - new Date(new Date().setHours(0,0,0,0)).getTime()) / 86_400_000)
    : null

  return (
    <div style={{ maxWidth: '820px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontSize: '13px', color: '#888' }}>
        <button onClick={() => router.push('/mensalidades')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#635BFF', fontSize: '13px', padding: 0 }}>
          ← Mensalidades
        </button>
        <span>/</span>
        <span style={{ color: '#1a1a1a', fontWeight: '500', textTransform: 'capitalize' }}>
          {cooperado?.nome_completo ?? 'Filiado'} — {formatarMes(mens.mes_referencia)}
        </span>
      </div>

      {/* Feedback */}
      {mensagem && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem', background: mensagem.tipo === 'ok' ? '#EEF0FF' : '#fef2f2', border: `1px solid ${mensagem.tipo === 'ok' ? '#6ee7b7' : '#fca5a5'}`, color: mensagem.tipo === 'ok' ? '#4840CC' : '#dc2626' }}>
          {mensagem.tipo === 'ok' ? '✓' : '⚠'} {mensagem.texto}
        </div>
      )}

      {/* ── Card cabeçalho ─────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', fontWeight: '700', color: '#4840CC', flexShrink: 0 }}>
              {cooperado?.nome_completo.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Mensalidade</div>
              <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '2px 0 0', textTransform: 'capitalize' }}>
                {cooperado?.nome_completo ?? '—'} — {formatarMes(mens.mes_referencia)}
              </h1>
            </div>
          </div>

          {modo === 'view' && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
              <span style={{ padding: '5px 14px', borderRadius: '20px', border: `1.5px solid ${stc.border}`, background: stc.bg, color: stc.cor, fontSize: '12px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: stc.cor, display: 'inline-block' }} />
                {stc.label}
              </span>
              {sv !== 'pago' && (
                <button onClick={() => { setModo('pagamento'); setDataPagamento(new Date().toISOString().split('T')[0]); setObsPagamento('') }}
                  style={{ padding: '7px 16px', background: '#635BFF', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
                  ✓ Registrar pagamento
                </button>
              )}
              <button onClick={() => { setModo('editar'); setEditValor(String(mens.valor)); setEditVenc(mens.data_vencimento); setEditObs(mens.observacoes ?? '') }}
                style={{ padding: '7px 14px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#444', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8f7f4' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}>
                ✏️ Editar
              </button>
              <button onClick={() => setConfirmarExclusao(true)}
                style={{ padding: '7px 12px', border: '1px solid #fca5a5', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#dc2626', cursor: 'pointer' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}>
                🗑
              </button>
            </div>
          )}
        </div>

        {/* Valor em destaque */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '1rem' }}>
          <div style={{ fontSize: '32px', fontWeight: '800', color: sv === 'pago' ? '#4840CC' : '#1a1a1a', letterSpacing: '-1px' }}>
            {BRL(Number(mens.valor))}
          </div>
          {sv === 'vencido' && diasVenc !== null && (
            <span style={{ padding: '4px 10px', background: '#FAECE7', border: '1px solid #fca5a5', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#993C1D' }}>
              ⚠ Vencido há {Math.abs(diasVenc)} dia{Math.abs(diasVenc) !== 1 ? 's' : ''}
            </span>
          )}
          {sv === 'pendente' && diasVenc !== null && diasVenc <= 7 && diasVenc >= 0 && (
            <span style={{ padding: '4px 10px', background: '#FAEEDA', border: '1px solid #fcd34d', borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#854F0B' }}>
              ⏰ Vence {diasVenc === 0 ? 'hoje' : `em ${diasVenc} dia${diasVenc !== 1 ? 's' : ''}`}
            </span>
          )}
        </div>
      </div>

      {/* ── Formulário de pagamento ───────────────────────────────────────── */}
      {modo === 'pagamento' && (
        <div style={{ background: '#EEF0FF', border: '1px solid #6ee7b7', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#4840CC', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 1rem' }}>
            ✓ Registrar pagamento
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>
            <CampoEdit label="Data do pagamento *">
              <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)}
                style={inpStyle} onFocus={fo} onBlur={bl}
              />
            </CampoEdit>
            <CampoEdit label="Observações">
              <input type="text" value={obsPagamento} onChange={e => setObsPagamento(e.target.value)}
                placeholder="Ex.: PIX, boleto…"
                style={inpStyle} onFocus={fo} onBlur={bl}
              />
            </CampoEdit>
          </div>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setModo('view')} disabled={salvando}
              style={{ padding: '8px 18px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handlePagar} disabled={salvando}
              style={{ padding: '8px 22px', border: 'none', borderRadius: '8px', background: salvando ? '#9F9BFF' : '#4840CC', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: salvando ? 'not-allowed' : 'pointer' }}>
              {salvando ? 'Salvando…' : '✓ Confirmar pagamento'}
            </button>
          </div>
        </div>
      )}

      {/* ── Grid de seções (visualização) ────────────────────────────────── */}
      {modo !== 'editar' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '1rem' }}>

          {/* Cooperado */}
          <Secao titulo="Filiado" icone="👤">
            {cooperado ? (
              <button onClick={() => router.push(`/cooperados/${cooperado.id}`)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', background: '#f8fdf9', border: '1px solid #c4e9dc', borderRadius: '8px', cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#EEF0FF' }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fdf9' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#EEEDFE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#4840CC', flexShrink: 0 }}>
                  {cooperado.nome_completo.charAt(0).toUpperCase()}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#4840CC', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cooperado.nome_completo}</div>
                  {cooperado.cpf && <div style={{ fontSize: '11px', color: '#888' }}>{formatarCPF(cooperado.cpf)}</div>}
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#888' }}>Ver perfil →</span>
              </button>
            ) : (
              <p style={{ fontSize: '13px', color: '#aaa', margin: 0 }}>Filiado removido</p>
            )}
            {cooperado && (
              <div style={{ marginTop: '8px' }}>
                <InfoLinha label="Status" valor={STATUS_COOPERADO[cooperado.status]?.label ?? cooperado.status} />
                {cooperado.numero_matricula && <InfoLinha label="Matrícula" valor={cooperado.numero_matricula} />}
                <InfoLinha label="Quota-parte" valor={cooperado.quota_parte && Number(cooperado.quota_parte) > 0 ? BRL(Number(cooperado.quota_parte)) : '—'} />
              </div>
            )}
          </Secao>

          {/* Detalhes da mensalidade */}
          <Secao titulo="Mensalidade" icone="💳">
            <InfoLinha label="Mês de referência" valor={formatarMes(mens.mes_referencia)} />
            <InfoLinha label="Valor" valor={BRL(Number(mens.valor))} />
            <InfoLinha label="Vencimento" valor={formatarData(mens.data_vencimento)} />
            <InfoLinha label="Pagamento" valor={formatarData(mens.data_pagamento)} />
            {mens.observacoes && (
              <div style={{ padding: '8px 0', borderBottom: '1px solid #f5f3ef' }}>
                <div style={{ fontSize: '12px', color: '#888', fontWeight: '500', marginBottom: '3px' }}>Observações</div>
                <div style={{ fontSize: '13px', color: '#1a1a1a', lineHeight: 1.5 }}>{mens.observacoes}</div>
              </div>
            )}
            <div style={{ paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#bbb' }}>
              <span>Criado em {new Date(mens.criado_em).toLocaleDateString('pt-BR')}</span>
              <span>Atualizado em {new Date(mens.atualizado_em).toLocaleDateString('pt-BR')}</span>
            </div>
          </Secao>
        </div>
      )}

      {/* ── Modo edição ───────────────────────────────────────────────────── */}
      {modo === 'editar' && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>
            Editar mensalidade
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <CampoEdit label="Valor (R$) *">
              <input type="number" value={editValor} onChange={e => setEditValor(e.target.value)}
                min="0" step="0.01" style={inpStyle} onFocus={fo} onBlur={bl}
              />
            </CampoEdit>
            <CampoEdit label="Data de vencimento *">
              <input type="date" value={editVenc} onChange={e => setEditVenc(e.target.value)}
                style={inpStyle} onFocus={fo} onBlur={bl}
              />
            </CampoEdit>
          </div>
          <CampoEdit label="Observações">
            <textarea value={editObs} onChange={e => setEditObs(e.target.value)}
              rows={3} placeholder="Observações sobre esta cobrança…"
              style={{ ...inpStyle, resize: 'vertical', minHeight: '72px' }}
              onFocus={fo} onBlur={bl}
            />
          </CampoEdit>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <button onClick={() => setModo('view')} disabled={salvando}
              style={{ padding: '8px 18px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={handleSalvar} disabled={salvando}
              style={{ padding: '8px 22px', border: 'none', borderRadius: '8px', background: salvando ? '#9F9BFF' : '#635BFF', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: salvando ? 'not-allowed' : 'pointer' }}>
              {salvando ? 'Salvando…' : '✓ Salvar alterações'}
            </button>
          </div>
        </div>
      )}

      {/* ── Histórico do cooperado ────────────────────────────────────────── */}
      {historico.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', overflow: 'hidden' }}>
          <div style={{ padding: '10px 16px', background: '#fafaf8', borderBottom: '1px solid #e5e3dc', fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            📋 Histórico do cooperado
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0eeea', background: '#fafaf8' }}>
                {['Mês', 'Vencimento', 'Valor', 'Pagamento', 'Status'].map(h => (
                  <th key={h} style={{ padding: '8px 16px', textAlign: h === 'Valor' ? 'right' : 'left', fontSize: '10px', fontWeight: '600', color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {historico.map((h, i) => {
                const sv2 = calcStatusEfetivo(h)
                const st2 = STATUS_CONFIG[sv2]
                return (
                  <tr key={h.id}
                    onClick={() => router.push(`/mensalidades/${h.id}`)}
                    style={{ borderTop: i > 0 ? '1px solid #f5f3ef' : 'none', cursor: 'pointer' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = '#fafaf8' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent' }}>
                    <td style={{ padding: '8px 16px', fontSize: '12px', color: '#555', textTransform: 'capitalize' }}>{formatarMesCurto(h.mes_referencia)}</td>
                    <td style={{ padding: '8px 16px', fontSize: '12px', color: sv2 === 'vencido' ? '#993C1D' : '#555' }}>{formatarData(h.data_vencimento)}</td>
                    <td style={{ padding: '8px 16px', fontSize: '12px', fontWeight: '600', color: sv2 === 'pago' ? '#4840CC' : '#1a1a1a', textAlign: 'right' }}>{BRL(Number(h.valor))}</td>
                    <td style={{ padding: '8px 16px', fontSize: '12px', color: '#555' }}>{formatarData(h.data_pagamento)}</td>
                    <td style={{ padding: '8px 16px' }}>
                      <span style={{ fontSize: '10px', fontWeight: '600', color: st2.cor, background: st2.bg, padding: '2px 8px', borderRadius: '6px' }}>
                        {st2.label}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal de exclusão ─────────────────────────────────────────────── */}
      {confirmarExclusao && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '16px', padding: '1.75rem', maxWidth: '400px', width: '90%', boxShadow: '0 8px 32px rgba(0,0,0,0.15)' }}>
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>Excluir mensalidade?</h2>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 1.5rem' }}>
              A cobrança de <strong>{BRL(Number(mens.valor))}</strong> referente a <strong style={{ textTransform: 'capitalize' }}>{formatarMes(mens.mes_referencia)}</strong> será removida permanentemente.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setConfirmarExclusao(false)}
                style={{ padding: '8px 18px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleExcluir} disabled={excluindo}
                style={{ padding: '8px 18px', border: 'none', borderRadius: '8px', background: excluindo ? '#f87171' : '#dc2626', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: excluindo ? 'not-allowed' : 'pointer' }}>
                {excluindo ? 'Excluindo…' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
