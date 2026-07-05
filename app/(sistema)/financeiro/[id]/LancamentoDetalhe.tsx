'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Lancamento, Cooperado, TipoLancamento, StatusLancamento } from '@/types/database'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, ContentCard, Badge, Modal, InfoRow, AlertBanner,
  MODULO_NEXCOOP, COM_C,
} from '@/components/nexcoop/ui'

// ─── Configurações ───────────────────────────────────────────────────────────

const TIPO_CONFIG: Record<TipoLancamento, { label: string; cor: string; bg: string; border: string; icone: string; sinal: string }> = {
  receita:      { label: 'Receita',      cor: '#4840CC', bg: '#EEF0FF', border: '#6ee7b7', icone: '↑', sinal: '+' },
  despesa:      { label: 'Despesa',      cor: '#993C1D', bg: '#FAECE7', border: '#fca5a5', icone: '↓', sinal: '-' },
  transferencia:{ label: 'Transferência',cor: '#185FA5', bg: '#E6F1FB', border: '#93c5fd', icone: '↔', sinal:  '' },
}

const STATUS_CONFIG: Record<StatusLancamento, { label: string; cor: string; bg: string; border: string }> = {
  pendente: { label: 'Pendente', cor: '#854F0B', bg: '#FAEEDA', border: '#fcd34d' },
  pago:     { label: 'Pago',     cor: '#4840CC', bg: '#EEF0FF', border: '#6ee7b7' },
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
    <PageLayout
      titulo={lancamento.descricao}
      icone="ti-receipt-2"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: 'Financeiro', href: '/financeiro' },
        { label: lancamento.descricao },
      ]}
      fullHeight
      acoes={
        <>
          <span style={{ fontSize: 16, fontWeight: 800, color: tipo.cor, fontVariantNumeric: 'tabular-nums' }}>
            {tipo.sinal}{BRL(lancamento.valor)}
          </span>
          <Badge label={st.label} bg={st.bg} cor={st.cor} dot />
        </>
      }
    >
      <div style={{ maxWidth: 820 }}>

        {mensagem && (
          <AlertBanner tipo={mensagem.tipo === 'ok' ? 'ok' : 'erro'}>
            {mensagem.texto}
          </AlertBanner>
        )}

        {/* ── Cabeçalho do card ──────────────────────────────────────────────── */}
        <ContentCard>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  background: tipo.bg, border: `1.5px solid ${tipo.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700, color: tipo.cor, flexShrink: 0,
                }}>
                  {tipo.icone}
                </div>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: tipo.cor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {tipo.label}
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: COM_C.txt, marginTop: 2 }}>
                    {lancamento.descricao}
                  </div>
                  {lancamento.numero_documento && (
                    <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>
                      Doc. {lancamento.numero_documento}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <div ref={menuRef} style={{ position: 'relative' }}>
                  <button
                    onClick={() => setShowStatusMenu(prev => !prev)}
                    disabled={alterandoStatus}
                    title="Clique para alterar o status"
                    style={{
                      padding: 0, border: 'none', background: 'none', cursor: alterandoStatus ? 'wait' : 'pointer',
                    }}
                  >
                    <Badge
                      label={alterandoStatus ? 'Alterando…' : st.label}
                      bg={st.bg}
                      cor={st.cor}
                      dot
                    />
                    <span style={{ fontSize: 10, marginLeft: 4, color: COM_C.txtSub }}>▼</span>
                  </button>

                  {showStatusMenu && (
                    <div style={{
                      position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                      background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 10,
                      boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden',
                      minWidth: 160,
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
                              color: ativo ? cfg.cor : COM_C.txt,
                              fontSize: 13, textAlign: 'left', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: 8,
                              fontWeight: ativo ? 600 : 400,
                            }}
                            onMouseEnter={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = '#FAFAF9' }}
                            onMouseLeave={e => { if (!ativo) (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                          >
                            <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.cor, flexShrink: 0 }} />
                            {cfg.label}
                            {ativo && <span style={{ marginLeft: 'auto', fontSize: 11 }}>✓</span>}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <Btn
                  variante="cinza"
                  icone="ti-pencil"
                  onClick={() => router.push(`/financeiro/${lancamento.id}/editar`)}
                >
                  Editar
                </Btn>

                <Btn
                  variante="cinza"
                  icone="ti-trash"
                  onClick={() => setConfirmandoExclusao(true)}
                  style={{ color: COM_C.vermelho, borderColor: '#FECACA' }}
                  title="Excluir"
                >
                  {' '}
                </Btn>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{
                fontSize: 32, fontWeight: 800, color: tipo.cor,
                letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums',
              }}>
                {tipo.sinal}{BRL(Number(lancamento.valor))}
              </div>
              {vencido && (
                <Badge label="Vencido" bg={COM_C.vermelhoLt} cor={COM_C.vermelho} />
              )}
              {lancamento.recorrente && (
                <Badge
                  label={lancamento.frequencia === 'mensal' ? 'Mensal' : lancamento.frequencia === 'trimestral' ? 'Trimestral' : 'Anual'}
                  bg="#ede9fe"
                  cor="#6366f1"
                />
              )}
            </div>
          </div>
        </ContentCard>

        {confirmandoExclusao && (
          <Modal
            titulo="Excluir lançamento?"
            onClose={() => setConfirmandoExclusao(false)}
            footer={
              <>
                <Btn variante="cinza" onClick={() => setConfirmandoExclusao(false)}>
                  Cancelar
                </Btn>
                <Btn
                  variante="marrom"
                  onClick={excluirLancamento}
                  disabled={excluindo}
                >
                  {excluindo ? 'Excluindo…' : 'Sim, excluir'}
                </Btn>
              </>
            }
          >
            <p style={{ fontSize: 13, color: COM_C.txtSub, margin: 0, lineHeight: 1.6 }}>
              Esta ação é permanente. O lançamento <strong style={{ color: COM_C.txt }}>{lancamento.descricao}</strong> ({BRL(Number(lancamento.valor))}) será removido.
            </p>
          </Modal>
        )}

        {/* ── Grid de seções ────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>

          <ContentCard title="Datas">
            <InfoRow label="Competência" valor={formatarData(lancamento.data_competencia)} />
            <InfoRow label="Vencimento" valor={formatarData(lancamento.data_vencimento)} destaque={!!vencido} />
            <InfoRow label="Pagamento" valor={formatarData(lancamento.data_pagamento)} />
          </ContentCard>

          <ContentCard title="Financeiro">
            <InfoRow label="Valor" valor={`${tipo.sinal}${BRL(Number(lancamento.valor))}`} destaque />
            <InfoRow label="Tipo" valor={tipo.label} />
            <InfoRow label="Status" valor={STATUS_CONFIG[lancamento.status].label} />
            {lancamento.centro_custo && (
              <InfoRow label="Centro de custo" valor={lancamento.centro_custo} />
            )}
          </ContentCard>

          {cooperado && (
            <ContentCard title="Filiado vinculado">
              <button
                onClick={() => router.push(`/cooperados/${cooperado!.id}`)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                  padding: 10, background: COM_C.verdeLt, border: '1px solid #BBF7D0',
                  borderRadius: 10, cursor: 'pointer', textAlign: 'left',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = COM_C.roxoLt }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = COM_C.verdeLt }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', background: COM_C.roxoLt,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 700, color: COM_C.roxo, flexShrink: 0,
                }}>
                  {cooperado.nome_completo.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: COM_C.roxo }}>
                    {cooperado.nome_completo}
                  </div>
                  <div style={{ fontSize: 11, color: COM_C.txtSub }}>
                    Ver perfil →
                  </div>
                </div>
              </button>
            </ContentCard>
          )}

          <ContentCard title="Documento">
            <InfoRow label="N.º do documento" valor={lancamento.numero_documento} />
            {lancamento.comprovante_url ? (
              <div style={{ paddingTop: 8 }}>
                <a
                  href={lancamento.comprovante_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', background: COM_C.azulLt, border: '1px solid #93c5fd',
                    borderRadius: 8, fontSize: 12, color: COM_C.azul,
                    textDecoration: 'none', fontWeight: 600,
                  }}
                >
                  <i className="ti ti-paperclip" style={{ fontSize: 14 }} />
                  Ver comprovante
                </a>
              </div>
            ) : (
              <InfoRow label="Comprovante" valor={null} />
            )}
          </ContentCard>

          {lancamento.recorrente && (
            <ContentCard title="Recorrência">
              <InfoRow label="Lançamento recorrente" valor="Sim" />
              <InfoRow
                label="Frequência"
                valor={
                  lancamento.frequencia === 'mensal' ? 'Mensal' :
                  lancamento.frequencia === 'trimestral' ? 'Trimestral' :
                  lancamento.frequencia === 'anual' ? 'Anual' : '—'
                }
              />
            </ContentCard>
          )}

          {lancamento.observacoes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <ContentCard title="Observações">
                <p style={{ fontSize: 13, color: COM_C.txtSub, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {lancamento.observacoes}
                </p>
              </ContentCard>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, fontSize: 11, color: '#A8A29E' }}>
          <span>Criado em {new Date(lancamento.criado_em).toLocaleDateString('pt-BR')}</span>
          <span>Atualizado em {new Date(lancamento.atualizado_em).toLocaleDateString('pt-BR')}</span>
        </div>
      </div>
    </PageLayout>
  )
}