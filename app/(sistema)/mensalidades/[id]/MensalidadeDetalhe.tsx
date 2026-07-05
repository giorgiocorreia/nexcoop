'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Mensalidade, StatusMensalidade } from '@/types/database'
import type { CooperadoDetalhe, HistoricoItem } from './page'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, ContentCard, Field, Input, Textarea, Badge,
  AlertBanner, InfoRow, COM_C, MODULO_NEXCOOP,
} from '@/components/nexcoop/ui'

// ─── Configurações ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusMensalidade, { label: string; cor: string; bg: string }> = {
  pendente: { label: 'Pendente', cor: '#854F0B', bg: '#FAEEDA' },
  pago:     { label: 'Pago',     cor: '#4840CC', bg: '#EEF0FF' },
  vencido:  { label: 'Vencido',  cor: '#993C1D', bg: '#FAECE7' },
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
    <PageLayout
      titulo={cooperado?.nome_completo ?? 'Filiado'}
      subtitulo={formatarMes(mens.mes_referencia)}
      icone="ti-calendar-due"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: 'Mensalidades', href: '/mensalidades' },
        { label: formatarMes(mens.mes_referencia) },
      ]}
      fullHeight
      acoes={
        modo === 'view' ? (
          <>
            <Badge label={stc.label} bg={stc.bg} cor={stc.cor} dot />
            {sv !== 'pago' && (
              <Btn
                variante="roxo"
                icone="ti-check"
                onClick={() => { setModo('pagamento'); setDataPagamento(new Date().toISOString().split('T')[0]); setObsPagamento('') }}
              >
                Registrar pagamento
              </Btn>
            )}
            <Btn
              variante="cinza"
              icone="ti-pencil"
              onClick={() => { setModo('editar'); setEditValor(String(mens.valor)); setEditVenc(mens.data_vencimento); setEditObs(mens.observacoes ?? '') }}
            >
              Editar
            </Btn>
            <Btn variante="cinza" icone="ti-trash" onClick={() => setConfirmarExclusao(true)} title="Excluir">
              Excluir
            </Btn>
          </>
        ) : undefined
      }
    >
      <div style={{ maxWidth: 820 }}>

        {mensagem && (
          <AlertBanner tipo={mensagem.tipo === 'ok' ? 'ok' : 'erro'}>{mensagem.texto}</AlertBanner>
        )}

        {/* Card cabeçalho */}
        <ContentCard>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: COM_C.roxoLt,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 22, fontWeight: 700, color: COM_C.roxo, flexShrink: 0,
            }}>
              {cooperado?.nome_completo.charAt(0).toUpperCase() ?? '?'}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: COM_C.txtSub, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Mensalidade
              </div>
              <div style={{ fontSize: 18, fontWeight: 700, color: COM_C.txt, marginTop: 2, textTransform: 'capitalize' }}>
                {cooperado?.nome_completo ?? '—'} — {formatarMes(mens.mes_referencia)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <div style={{
              fontSize: 32, fontWeight: 800, letterSpacing: '-1px',
              color: sv === 'pago' ? COM_C.roxo : COM_C.txt,
            }}>
              {BRL(Number(mens.valor))}
            </div>
            {sv === 'vencido' && diasVenc !== null && (
              <Badge
                label={`Vencido há ${Math.abs(diasVenc)} dia${Math.abs(diasVenc) !== 1 ? 's' : ''}`}
                bg={COM_C.vermelhoLt}
                cor={COM_C.vermelho}
              />
            )}
            {sv === 'pendente' && diasVenc !== null && diasVenc <= 7 && diasVenc >= 0 && (
              <Badge
                label={diasVenc === 0 ? 'Vence hoje' : `Vence em ${diasVenc} dia${diasVenc !== 1 ? 's' : ''}`}
                bg={COM_C.laranjaLt}
                cor={COM_C.laranja}
              />
            )}
          </div>
        </ContentCard>

        <div style={{ height: 16 }} />

        {/* Formulário de pagamento */}
        {modo === 'pagamento' && (
          <ContentCard title="Registrar pagamento">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
              <Field label="Data do pagamento *">
                <Input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)} />
              </Field>
              <Field label="Observações">
                <Input type="text" value={obsPagamento} onChange={e => setObsPagamento(e.target.value)} placeholder="Ex.: PIX, boleto…" />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variante="cinza" onClick={() => setModo('view')} disabled={salvando}>Cancelar</Btn>
              <Btn variante="verde" icone="ti-check" onClick={handlePagar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Confirmar pagamento'}
              </Btn>
            </div>
          </ContentCard>
        )}

        {modo === 'pagamento' && <div style={{ height: 16 }} />}

        {/* Grid de seções (visualização) */}
        {modo !== 'editar' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
            <ContentCard title="Filiado">
              {cooperado ? (
                <>
                  <button
                    onClick={() => router.push(`/cooperados/${cooperado.id}`)}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: 10,
                      background: COM_C.verdeLt, border: `1px solid ${COM_C.borda}`, borderRadius: 10,
                      cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    <div style={{
                      width: 36, height: 36, borderRadius: '50%', background: COM_C.roxoLt,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 14, fontWeight: 700, color: COM_C.roxo, flexShrink: 0,
                    }}>
                      {cooperado.nome_completo.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COM_C.roxo, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cooperado.nome_completo}
                      </div>
                      {cooperado.cpf && <div style={{ fontSize: 11, color: COM_C.txtSub }}>{formatarCPF(cooperado.cpf)}</div>}
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 11, color: COM_C.txtSub }}>Ver perfil →</span>
                  </button>
                  <div style={{ marginTop: 4 }}>
                    <InfoRow label="Status" valor={STATUS_COOPERADO[cooperado.status]?.label ?? cooperado.status} />
                    {cooperado.numero_matricula && <InfoRow label="Matrícula" valor={cooperado.numero_matricula} />}
                    <InfoRow label="Quota-parte" valor={cooperado.quota_parte && Number(cooperado.quota_parte) > 0 ? BRL(Number(cooperado.quota_parte)) : '—'} />
                  </div>
                </>
              ) : (
                <p style={{ fontSize: 13, color: COM_C.txtSub, margin: 0 }}>Filiado removido</p>
              )}
            </ContentCard>

            <ContentCard title="Mensalidade">
              <InfoRow label="Mês de referência" valor={formatarMes(mens.mes_referencia)} />
              <InfoRow label="Valor" valor={BRL(Number(mens.valor))} destaque />
              <InfoRow label="Vencimento" valor={formatarData(mens.data_vencimento)} />
              <InfoRow label="Pagamento" valor={formatarData(mens.data_pagamento)} />
              {mens.observacoes && (
                <div style={{ padding: '9px 0', borderBottom: `1px solid ${COM_C.borda}` }}>
                  <div style={{ fontSize: 12, color: COM_C.txtSub, fontWeight: 500, marginBottom: 4 }}>Observações</div>
                  <div style={{ fontSize: 13, color: COM_C.txt, lineHeight: 1.5 }}>{mens.observacoes}</div>
                </div>
              )}
              <div style={{ paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#A8A29E' }}>
                <span>Criado em {new Date(mens.criado_em).toLocaleDateString('pt-BR')}</span>
                <span>Atualizado em {new Date(mens.atualizado_em).toLocaleDateString('pt-BR')}</span>
              </div>
            </ContentCard>
          </div>
        )}

        {/* Modo edição */}
        {modo === 'editar' && (
          <ContentCard title="Editar mensalidade">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <Field label="Valor (R$) *">
                <Input type="number" value={editValor} onChange={e => setEditValor(e.target.value)} min="0" step="0.01" />
              </Field>
              <Field label="Data de vencimento *">
                <Input type="date" value={editVenc} onChange={e => setEditVenc(e.target.value)} />
              </Field>
            </div>
            <Field label="Observações">
              <Textarea value={editObs} onChange={e => setEditObs(e.target.value)} rows={3} placeholder="Observações sobre esta cobrança…" />
            </Field>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
              <Btn variante="cinza" onClick={() => setModo('view')} disabled={salvando}>Cancelar</Btn>
              <Btn variante="roxo" icone="ti-check" onClick={handleSalvar} disabled={salvando}>
                {salvando ? 'Salvando…' : 'Salvar alterações'}
              </Btn>
            </div>
          </ContentCard>
        )}

        {modo === 'editar' && <div style={{ height: 16 }} />}

        {/* Histórico do cooperado */}
        {historico.length > 0 && (
          <ContentCard title="Histórico do cooperado" noPadding>
            <div style={{ overflowX: 'auto' }}>
              <table className="com-table" style={{ width: '100%', borderCollapse: 'collapse', minWidth: 520 }}>
                <thead>
                  <tr>
                    {['Mês', 'Vencimento', 'Valor', 'Pagamento', 'Status'].map((h, i) => (
                      <th key={h} style={{ textAlign: i === 2 ? 'right' : 'left' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historico.map((h) => {
                    const sv2 = calcStatusEfetivo(h)
                    const st2 = STATUS_CONFIG[sv2]
                    return (
                      <tr
                        key={h.id}
                        onClick={() => router.push(`/mensalidades/${h.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <td style={{ textTransform: 'capitalize', color: COM_C.txtSub }}>{formatarMesCurto(h.mes_referencia)}</td>
                        <td style={{ color: sv2 === 'vencido' ? COM_C.vermelho : COM_C.txtSub, fontWeight: sv2 === 'vencido' ? 600 : 400 }}>
                          {formatarData(h.data_vencimento)}
                        </td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: sv2 === 'pago' ? COM_C.roxo : COM_C.txt }}>
                          {BRL(Number(h.valor))}
                        </td>
                        <td style={{ color: COM_C.txtSub }}>{formatarData(h.data_pagamento)}</td>
                        <td><Badge label={st2.label} bg={st2.bg} cor={st2.cor} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </ContentCard>
        )}

        {/* Modal de exclusão */}
        {confirmarExclusao && (
          <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}>
            <div style={{
              background: '#fff', borderRadius: 16, padding: 28, maxWidth: 400, width: '100%',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: COM_C.txt, margin: '0 0 8px' }}>Excluir mensalidade?</h2>
              <p style={{ fontSize: 13, color: COM_C.txtSub, margin: '0 0 24px' }}>
                A cobrança de <strong>{BRL(Number(mens.valor))}</strong> referente a{' '}
                <strong style={{ textTransform: 'capitalize' }}>{formatarMes(mens.mes_referencia)}</strong> será removida permanentemente.
              </p>
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <Btn variante="cinza" onClick={() => setConfirmarExclusao(false)}>Cancelar</Btn>
                <Btn variante="marrom" onClick={handleExcluir} disabled={excluindo}>
                  {excluindo ? 'Excluindo…' : 'Sim, excluir'}
                </Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  )
}