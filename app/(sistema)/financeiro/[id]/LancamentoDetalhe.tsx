'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Lancamento, Cooperado, TipoLancamento, StatusLancamento } from '@/types/database'

// ─── Configurações ───────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoLancamento, { label: string; cor: string; bg: string; border: string; icone: string; sinal: string }> = {
  receita:      { label: 'Receita',      cor: '#0F6E56', bg: '#E1F5EE', border: '#6ee7b7', icone: '↑', sinal: '+' },
  despesa:      { label: 'Despesa',      cor: '#993C1D', bg: '#FAECE7', border: '#fca5a5', icone: '↓', sinal: '-' },
  transferencia:{ label: 'Transferência',cor: '#185FA5', bg: '#E6F1FB', border: '#93c5fd', icone: '↔', sinal:  '' },
}

const STATUS_CONFIG: Record<StatusLancamento, { label: string; cor: string; bg: string; border: string }> = {
  pendente: { label: 'Pendente', cor: '#854F0B', bg: '#FAEEDA', border: '#fcd34d' },
  pago:     { label: 'Pago',     cor: '#0F6E56', bg: '#E1F5EE', border: '#6ee7b7' },
  cancelado:{ label: 'Cancelado',cor: '#374151', bg: '#f3f4f6', border: '#d1d5db' },
  agendado: { label: 'Agendado', cor: '#6366f1', bg: '#ede9fe', border: '#a5b4fc' },
}

const TODOS_STATUS: StatusLancamento[] = ['pendente', 'pago', 'agendado', 'cancelado']

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function formatarData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

function InfoLinha({ label, valor, destaque }: {
  label: string; valor?: string | number | null; destaque?: boolean
}) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', padding: '8px 0',
      borderBottom: '1px solid #f5f3ef',
    }}>
      <span style={{ fontSize: '12px', color: '#888', fontWeight: '500' }}>{label}</span>
      <span style={{ fontSize: '13px', color: destaque ? '#0F6E56' : '#1a1a1a', fontWeight: destaque ? '600' : '400', textAlign: 'right', maxWidth: '60%' }}>
        {valor ?? '—'}
      </span>
    </div>
  )
}

function Secao({ titulo, icone, children }: {
  titulo: string; icone: string; children: React.ReactNode
}) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem' }}>
      <div style={{
        fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase',
        letterSpacing: '0.5px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        <span>{icone}</span> {titulo}
      </div>
      {children}
    </div>
  )
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface Props {
  lancamento: Lancamento
  cooperado: Cooperado | null
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function LancamentoDetalhe({ lancamento: initial, cooperado }: Props) {
  const router = useRouter()
  const [lancamento, setLancamento] = useState(initial)
  const [showStatusMenu, setShowStatusMenu] = useState(false)
  const [alterandoStatus, setAlterandoStatus] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false)
  const [excluindo, setExcluindo] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowStatusMenu(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function alterarStatus(novoStatus: StatusLancamento) {
    if (novoStatus === lancamento.status) { setShowStatusMenu(false); return }
    setAlterandoStatus(true)
    setShowStatusMenu(false)

    const supabase = createClient()
    const updatePayload: Partial<Lancamento> = {
      status: novoStatus,
      atualizado_em: new Date().toISOString(),
      // Se marcar como pago e não tinha data de pagamento, seta hoje
      ...(novoStatus === 'pago' && !lancamento.data_pagamento
        ? { data_pagamento: new Date().toISOString().split('T')[0] }
        : {}),
    }

    const { data, error } = await supabase
      .from('lancamentos')
      .update(updatePayload)
      .eq('id', lancamento.id)
      .select()
      .single()

    if (error) {
      setMensagem({ tipo: 'erro', texto: `Erro: ${error.message}` })
    } else {
      setLancamento(data as Lancamento)
      setMensagem({ tipo: 'ok', texto: `Status alterado para "${STATUS_CONFIG[novoStatus].label}".` })
    }
    setAlterandoStatus(false)
    setTimeout(() => setMensagem(null), 4000)
  }

  async function excluirLancamento() {
    setExcluindo(true)
    const supabase = createClient()
    const { error } = await supabase.from('lancamentos').delete().eq('id', lancamento.id)
    if (error) {
      setMensagem({ tipo: 'erro', texto: `Erro ao excluir: ${error.message}` })
      setExcluindo(false)
      setConfirmandoExclusao(false)
    } else {
      router.push('/financeiro')
    }
  }

  const tipo = TIPO_CONFIG[lancamento.tipo]
  const st   = STATUS_CONFIG[lancamento.status]

  const vencido =
    lancamento.status === 'pendente' &&
    lancamento.data_vencimento &&
    new Date(lancamento.data_vencimento + 'T00:00:00') < new Date()

  return (
    <div style={{ maxWidth: '900px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>

      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', fontSize: '13px', color: '#888' }}>
        <button
          onClick={() => router.push('/financeiro')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#1D9E75', fontSize: '13px', padding: 0 }}
        >
          ← Financeiro
        </button>
        <span>/</span>
        <span style={{ color: '#1a1a1a', fontWeight: '500', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {lancamento.descricao}
        </span>
      </div>

      {/* Feedback */}
      {mensagem && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', fontSize: '13px', marginBottom: '1rem',
          background: mensagem.tipo === 'ok' ? '#E1F5EE' : '#fef2f2',
          border: `1px solid ${mensagem.tipo === 'ok' ? '#6ee7b7' : '#fca5a5'}`,
          color: mensagem.tipo === 'ok' ? '#0F6E56' : '#dc2626',
        }}>
          {mensagem.tipo === 'ok' ? '✓' : '⚠'} {mensagem.texto}
        </div>
      )}

      {/* ── Cabeçalho do card ──────────────────────────────────────────────── */}
      <div style={{
        background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px',
        padding: '1.5rem', marginBottom: '1rem',
        display: 'flex', flexDirection: 'column', gap: '1rem',
      }}>
        {/* Linha superior: ícone tipo + descrição + ações */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {/* Ícone do tipo */}
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: tipo.bg, border: `1.5px solid ${tipo.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: '700', color: tipo.cor, flexShrink: 0,
            }}>
              {tipo.icone}
            </div>
            <div>
              <div style={{ fontSize: '11px', fontWeight: '600', color: tipo.cor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {tipo.label}
              </div>
              <h1 style={{ fontSize: '18px', fontWeight: '700', color: '#1a1a1a', margin: '2px 0 0' }}>
                {lancamento.descricao}
              </h1>
              {lancamento.numero_documento && (
                <div style={{ fontSize: '12px', color: '#aaa', marginTop: '2px' }}>
                  Doc. {lancamento.numero_documento}
                </div>
              )}
            </div>
          </div>

          {/* Ações */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Status dropdown */}
            <div ref={menuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setShowStatusMenu(prev => !prev)}
                disabled={alterandoStatus}
                title="Clique para alterar o status"
                style={{
                  padding: '6px 14px 6px 10px', borderRadius: '20px',
                  border: `1.5px solid ${st.border}`, background: st.bg,
                  color: st.cor, fontSize: '12px', fontWeight: '700',
                  cursor: alterandoStatus ? 'wait' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: st.cor, display: 'inline-block' }} />
                {alterandoStatus ? 'Alterando…' : st.label}
                <span style={{ fontSize: '10px', opacity: 0.6 }}>▼</span>
              </button>

              {showStatusMenu && (
                <div style={{
                  position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                  background: '#fff', border: '1px solid #e5e3dc', borderRadius: '10px',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden',
                  minWidth: '160px',
                }}>
                  {TODOS_STATUS.map(s => {
                    const cfg = STATUS_CONFIG[s]
                    const ativo = s === lancamento.status
                    return (
                      <button
                        key={s}
                        onClick={() => alterarStatus(s)}
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

            <button
              onClick={() => router.push(`/financeiro/${lancamento.id}/editar`)}
              style={{
                padding: '7px 16px', border: '1px solid #d5d3cc', borderRadius: '8px',
                background: '#fff', fontSize: '13px', color: '#444', cursor: 'pointer', fontWeight: '500',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8f7f4' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
            >
              ✏️ Editar
            </button>

            <button
              onClick={() => setConfirmandoExclusao(true)}
              style={{
                padding: '7px 14px', border: '1px solid #fca5a5', borderRadius: '8px',
                background: '#fff', fontSize: '13px', color: '#dc2626', cursor: 'pointer',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#fff' }}
            >
              🗑
            </button>
          </div>
        </div>

        {/* Valor em destaque */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            fontSize: '32px', fontWeight: '800', color: tipo.cor,
            letterSpacing: '-1px',
          }}>
            {tipo.sinal}{BRL(Number(lancamento.valor))}
          </div>
          {vencido && (
            <span style={{
              padding: '4px 10px', background: '#FAECE7', border: '1px solid #fca5a5',
              borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#993C1D',
            }}>
              ⚠ Vencido
            </span>
          )}
          {lancamento.recorrente && (
            <span style={{
              padding: '4px 10px', background: '#ede9fe', border: '1px solid #a5b4fc',
              borderRadius: '20px', fontSize: '11px', fontWeight: '600', color: '#6366f1',
            }}>
              🔄 {lancamento.frequencia === 'mensal' ? 'Mensal' : lancamento.frequencia === 'trimestral' ? 'Trimestral' : 'Anual'}
            </span>
          )}
        </div>
      </div>

      {/* ── Modal de confirmação de exclusão ─────────────────────────────────── */}
      {confirmandoExclusao && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', padding: '1.75rem', maxWidth: '400px', width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          }}>
            <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#1a1a1a', margin: '0 0 8px' }}>
              Excluir lançamento?
            </h2>
            <p style={{ fontSize: '13px', color: '#666', margin: '0 0 1.5rem' }}>
              Esta ação é permanente. O lançamento <strong>{lancamento.descricao}</strong> ({BRL(Number(lancamento.valor))}) será removido.
            </p>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmandoExclusao(false)}
                style={{ padding: '8px 18px', border: '1px solid #d5d3cc', borderRadius: '8px', background: '#fff', fontSize: '13px', color: '#555', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={excluirLancamento}
                disabled={excluindo}
                style={{ padding: '8px 18px', border: 'none', borderRadius: '8px', background: excluindo ? '#f87171' : '#dc2626', color: '#fff', fontSize: '13px', fontWeight: '600', cursor: excluindo ? 'not-allowed' : 'pointer' }}
              >
                {excluindo ? 'Excluindo…' : 'Sim, excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Grid de seções ────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>

        {/* Datas */}
        <Secao titulo="Datas" icone="📅">
          <InfoLinha label="Competência" valor={formatarData(lancamento.data_competencia)} />
          <InfoLinha label="Vencimento"  valor={formatarData(lancamento.data_vencimento)} destaque={!!vencido} />
          <InfoLinha label="Pagamento"   valor={formatarData(lancamento.data_pagamento)} />
        </Secao>

        {/* Financeiro */}
        <Secao titulo="Financeiro" icone="💰">
          <InfoLinha label="Valor"       valor={`${tipo.sinal}${BRL(Number(lancamento.valor))}`} destaque />
          <InfoLinha label="Tipo"        valor={tipo.label} />
          <InfoLinha label="Status"      valor={STATUS_CONFIG[lancamento.status].label} />
          {lancamento.centro_custo && (
            <InfoLinha label="Centro de custo" valor={lancamento.centro_custo} />
          )}
        </Secao>

        {/* Cooperado vinculado */}
        {cooperado && (
          <Secao titulo="Filiado vinculado" icone="👤">
            <button
              onClick={() => router.push(`/cooperados/${cooperado!.id}`)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                padding: '8px', background: '#f8fdf9', border: '1px solid #c4e9dc',
                borderRadius: '8px', cursor: 'pointer', textAlign: 'left',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#E1F5EE' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f8fdf9' }}
            >
              <div style={{
                width: '36px', height: '36px', borderRadius: '50%', background: '#e8f7f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '700', color: '#0F6E56', flexShrink: 0,
              }}>
                {cooperado.nome_completo.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#0F6E56' }}>
                  {cooperado.nome_completo}
                </div>
                <div style={{ fontSize: '11px', color: '#888' }}>
                  Ver perfil →
                </div>
              </div>
            </button>
          </Secao>
        )}

        {/* Documento / Comprovante */}
        <Secao titulo="Documento" icone="📄">
          <InfoLinha label="N.º do documento" valor={lancamento.numero_documento} />
          {lancamento.comprovante_url ? (
            <div style={{ paddingTop: '8px' }}>
              <a
                href={lancamento.comprovante_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', background: '#E6F1FB', border: '1px solid #93c5fd',
                  borderRadius: '8px', fontSize: '12px', color: '#185FA5',
                  textDecoration: 'none', fontWeight: '600',
                }}
              >
                📎 Ver comprovante
              </a>
            </div>
          ) : (
            <InfoLinha label="Comprovante" valor={null} />
          )}
        </Secao>

        {/* Recorrência */}
        {lancamento.recorrente && (
          <Secao titulo="Recorrência" icone="🔄">
            <InfoLinha label="Lançamento recorrente" valor="Sim" />
            <InfoLinha
              label="Frequência"
              valor={
                lancamento.frequencia === 'mensal' ? 'Mensal' :
                lancamento.frequencia === 'trimestral' ? 'Trimestral' :
                lancamento.frequencia === 'anual' ? 'Anual' : '—'
              }
            />
          </Secao>
        )}

        {/* Observações */}
        {lancamento.observacoes && (
          <div style={{
            gridColumn: '1 / -1',
            background: '#fff', border: '1px solid #e5e3dc', borderRadius: '12px', padding: '1.25rem',
          }}>
            <div style={{ fontSize: '12px', fontWeight: '600', color: '#888', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              📝 Observações
            </div>
            <p style={{ fontSize: '13px', color: '#444', margin: 0, lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
              {lancamento.observacoes}
            </p>
          </div>
        )}
      </div>

      {/* Rodapé com metadados */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', fontSize: '11px', color: '#bbb' }}>
        <span>Criado em {new Date(lancamento.criado_em).toLocaleDateString('pt-BR')}</span>
        <span>Atualizado em {new Date(lancamento.atualizado_em).toLocaleDateString('pt-BR')}</span>
      </div>
    </div>
  )
}
