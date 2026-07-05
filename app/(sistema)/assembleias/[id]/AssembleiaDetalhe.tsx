'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Assembleia, TipoAssembleia, StatusAssembleia } from '@/types/database'
import { Btn } from '@/components/ui/Btn'
import {
  PageLayout, ContentCard, Badge, Field, Input,
  AlertBanner, InfoRow, Modal, MODULO_NEXCOOP, COM_C,
} from '@/components/nexcoop/ui'

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

function Toggle({ ativo, label, labelAtivo, onChange, disabled }: {
  ativo: boolean; label: string; labelAtivo: string; onChange: () => void; disabled?: boolean
}) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        display: 'flex', alignItems: 'center', gap: 8,
        padding: '7px 14px', borderRadius: 8, border: 'none', cursor: disabled ? 'wait' : 'pointer',
        background: ativo ? COM_C.roxoLt : '#f5f5f2',
        color: ativo ? COM_C.roxo : COM_C.txtSub,
        fontSize: 12, fontWeight: 600, transition: 'all 0.15s',
      }}
    >
      <span style={{
        width: 14, height: 14, borderRadius: 3, border: `2px solid ${ativo ? COM_C.roxo : COM_C.borda}`,
        background: ativo ? COM_C.roxo : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {ativo && <span style={{ color: '#fff', fontSize: 9, fontWeight: 900 }}>✓</span>}
      </span>
      {ativo ? labelAtivo : label}
    </button>
  )
}

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

  async function alterarStatus(novoStatus: StatusAssembleia) {
    if (novoStatus === asm.status) { setShowStatus(false); return }
    setSalvandoStatus(true)
    setShowStatus(false)
    await patch({ status: novoStatus }, `Status alterado para "${STATUS_CONFIG[novoStatus].label}".`)
    setSalvandoStatus(false)
  }

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

  async function toggleFlag(campo: 'convocacao_enviada' | 'ata_gerada' | 'ata_assinada') {
    const novoValor = !asm[campo]
    const labels: Record<typeof campo, [string, string]> = {
      convocacao_enviada: ['Convocação marcada como enviada.', 'Convocação desmarcada.'],
      ata_gerada:         ['ATA marcada como gerada.', 'ATA desmarcada como gerada.'],
      ata_assinada:       ['ATA marcada como assinada.', 'ATA desmarcada como assinada.'],
    }
    await patch({ [campo]: novoValor }, labels[campo][novoValor ? 0 : 1], campo)
  }

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

  const tipo = TIPO_CONFIG[asm.tipo]
  const st   = STATUS_CONFIG[asm.status]
  const dias = diasAte(asm.data_realizacao)
  const proxima = asm.status === 'agendada' && dias >= 0 && dias <= 7
  const hoje    = asm.status === 'agendada' && dias === 0

  return (
    <PageLayout
      titulo={asm.titulo}
      subtitulo={tipo.label}
      icone="ti-users-group"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: 'Assembleias', href: '/assembleias' },
        { label: 'Detalhe' },
      ]}
      fullHeight
      acoes={
        <>
          <div ref={menuRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStatus(p => !p)}
              disabled={salvandoStatus}
              style={{
                padding: '6px 14px 6px 10px', borderRadius: 20,
                border: `1.5px solid ${st.border}`, background: st.bg,
                color: st.cor, fontSize: 12, fontWeight: 700,
                cursor: salvandoStatus ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: st.cor, display: 'inline-block' }} />
              {salvandoStatus ? 'Alterando…' : st.label}
              <span style={{ fontSize: 10, opacity: 0.6 }}>▼</span>
            </button>

            {showStatusMenu && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0,
                background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 10,
                boxShadow: '0 4px 16px rgba(0,0,0,0.10)', zIndex: 50, overflow: 'hidden', minWidth: 160,
              }}>
                {TODOS_STATUS.map(s => {
                  const cfg = STATUS_CONFIG[s]
                  const ativo = s === asm.status
                  return (
                    <button key={s} onClick={() => alterarStatus(s)}
                      style={{
                        width: '100%', padding: '9px 14px', border: 'none',
                        background: ativo ? cfg.bg : 'transparent',
                        color: ativo ? cfg.cor : COM_C.txt,
                        fontSize: 13, textAlign: 'left', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontWeight: ativo ? 600 : 400,
                      }}
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

          <Btn variante="cinza" icone="ti-pencil" onClick={() => router.push(`/assembleias/${asm.id}/editar`)}>
            Editar
          </Btn>
          <Btn variante="cinza" icone="ti-trash" onClick={() => setConfirmExclusao(true)} style={{ color: COM_C.vermelho, borderColor: '#fca5a5' }}>
            Excluir
          </Btn>
        </>
      }
    >
      <div style={{ maxWidth: 960 }}>
        {mensagem && (
          <AlertBanner tipo={mensagem.tipo === 'ok' ? 'ok' : 'erro'}>{mensagem.texto}</AlertBanner>
        )}

        {proxima && (
          <AlertBanner tipo="info">
            {hoje ? 'Esta assembleia é hoje!' : `Acontece em ${dias} dia${dias !== 1 ? 's' : ''}.`}
          </AlertBanner>
        )}

        <ContentCard>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: tipo.bg, border: `1.5px solid ${tipo.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, fontWeight: 800, color: tipo.cor, flexShrink: 0, letterSpacing: '0.5px',
            }}>
              {tipo.sigla}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: COM_C.txtSub }}>
                {formatarData(asm.data_realizacao)}
                {asm.local && <> · {asm.local}</>}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <Badge label={asm.modalidade === 'presencial' ? 'Presencial' : asm.modalidade === 'remota' ? 'Remota' : 'Híbrida'} bg="#f5f5f2" cor={COM_C.txtSub} />
                {asm.quorum_minimo && (
                  <Badge label={`Quórum mínimo: ${asm.quorum_minimo}`} bg="#f5f5f2" cor={COM_C.txtSub} />
                )}
                {asm.ata_gerada && <Badge label="ATA gerada" bg={COM_C.roxoLt} cor={COM_C.roxo} />}
                {asm.ata_assinada && <Badge label="ATA assinada" bg={COM_C.roxoLt} cor={COM_C.roxo} />}
              </div>
            </div>
          </div>
        </ContentCard>

        {confirmExclusao && (
          <Modal
            titulo="Excluir assembleia?"
            subtitulo={`A assembleia "${asm.titulo}" será removida permanentemente.`}
            onClose={() => setConfirmExclusao(false)}
            footer={
              <>
                <Btn variante="cinza" onClick={() => setConfirmExclusao(false)}>Cancelar</Btn>
                <Btn variante="azul" onClick={excluir} disabled={excluindo} style={{ background: excluindo ? '#f87171' : COM_C.vermelho, borderColor: excluindo ? '#f87171' : COM_C.vermelho }}>
                  {excluindo ? 'Excluindo…' : 'Sim, excluir'}
                </Btn>
              </>
            }
          >{null}</Modal>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <ContentCard title="Datas">
            <InfoRow label="Realização"    valor={formatarDataCurta(asm.data_realizacao)} />
            <InfoRow label="Convocação"    valor={formatarDataCurta(asm.data_convocacao)} />
            <InfoRow label="Criado em"     valor={formatarDataCurta(asm.criado_em)} />
            <InfoRow label="Atualizado em" valor={formatarDataCurta(asm.atualizado_em)} />
          </ContentCard>

          <ContentCard
            title="Convocação"
            action={
              <Toggle
                ativo={asm.convocacao_enviada}
                label="Marcar como enviada"
                labelAtivo="Enviada ✓"
                disabled={salvandoFlag === 'convocacao_enviada'}
                onChange={() => toggleFlag('convocacao_enviada')}
              />
            }
          >
            <InfoRow label="Status convocação" valor={asm.convocacao_enviada ? 'Enviada' : 'Não enviada'} />
            {asm.edital_url ? (
              <div style={{ paddingTop: 8 }}>
                <a href={asm.edital_url} target="_blank" rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '7px 14px', background: COM_C.azulLt, border: '1px solid #93c5fd',
                    borderRadius: 8, fontSize: 12, color: COM_C.azul,
                    textDecoration: 'none', fontWeight: 600,
                  }}>
                  Ver edital
                </a>
              </div>
            ) : (
              <InfoRow label="Edital" valor={null} />
            )}
          </ContentCard>

          <ContentCard title="Quórum e Presença">
            <InfoRow label="Quórum mínimo"  valor={asm.quorum_minimo ?? '—'} />
            <InfoRow
              label="Quórum atingido"
              valor={asm.status === 'realizada' ? (asm.quorum_atingido ? 'Sim ✓' : 'Não ✗') : '—'}
            />
            <div style={{ marginTop: 10, display: 'flex', gap: 8, alignItems: 'center' }}>
              <Field label="Nº presentes">
                <Input
                  type="number" min="0" value={presencaInput}
                  onChange={e => setPresenca(e.target.value)}
                  placeholder="Nº presentes"
                  style={{ flex: 1 }}
                />
              </Field>
              <Btn variante="roxo" onClick={salvarPresenca} disabled={salvandoPresenca} style={{ marginTop: 22 }}>
                {salvandoPresenca ? '…' : 'Registrar'}
              </Btn>
            </div>
            <p style={{ fontSize: 11, color: '#A8A29E', marginTop: 4 }}>
              Total atual: <strong>{asm.total_presentes}</strong> presente{asm.total_presentes !== 1 ? 's' : ''}
            </p>
          </ContentCard>

          <ContentCard title="Ata">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
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
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', background: COM_C.roxoLt, border: '1px solid #C4B5FD',
                  borderRadius: 8, fontSize: 12, color: COM_C.roxo,
                  textDecoration: 'none', fontWeight: 600,
                }}>
                Ver ATA
              </a>
            ) : (
              <p style={{ fontSize: 12, color: '#A8A29E', margin: 0 }}>Nenhuma ATA anexada.</p>
            )}
          </ContentCard>

          {asm.pauta && (
            <div style={{ gridColumn: '1 / -1' }}>
              <ContentCard title="Pauta">
                <pre style={{ fontSize: 13, color: COM_C.txt, margin: 0, lineHeight: 1.7, whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>
                  {asm.pauta}
                </pre>
              </ContentCard>
            </div>
          )}

          {asm.observacoes && (
            <div style={{ gridColumn: '1 / -1' }}>
              <ContentCard title="Observações">
                <p style={{ fontSize: 13, color: COM_C.txt, margin: 0, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {asm.observacoes}
                </p>
              </ContentCard>
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: '#A8A29E', marginTop: 16, textAlign: 'right' }}>
          ID: {asm.id}
        </p>
      </div>
    </PageLayout>
  )
}