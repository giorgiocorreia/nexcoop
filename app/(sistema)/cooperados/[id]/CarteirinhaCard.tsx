'use client'

// Card de emissão/revogação/2ª via da carteirinha de identificação do
// filiado (fase 2, antecipando o pedaço de UI que faltava da fase 3 pra
// alguém conseguir emitir e o portal do filiado deixar de ficar sempre
// vazio). Toda a permissão já é checada dentro das server actions de
// lib/carteirinha/actions.ts (regra 7 do CLAUDE.md) — este componente só
// chama, nunca reimplementa a checagem.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ContentCard, COM_C, Field, Input } from '@/components/nexcoop/ui'
import { Btn } from '@/components/ui/Btn'
import { emitirCarteirinha, revogarCarteirinha, reemitirCarteirinha } from '@/lib/carteirinha/actions'
import type { CarteirinhaAtiva } from '@/lib/carteirinha/queries'

interface Props {
  cooperadoId: string
  carteirinhaAtiva: CarteirinhaAtiva | null
  urlVerificacao: string | null
}

function formatarData(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function CarteirinhaCard({ cooperadoId, carteirinhaAtiva, urlVerificacao }: Props) {
  const router = useRouter()

  const [mostrarEmitir, setMostrarEmitir] = useState(false)
  const [validaAte, setValidaAte] = useState('')
  const [emitindo, setEmitindo] = useState(false)

  const [acaoMotivo, setAcaoMotivo] = useState<'revogar' | 'reemitir' | null>(null)
  const [motivo, setMotivo] = useState('')
  const [processando, setProcessando] = useState(false)

  async function handleEmitir() {
    setEmitindo(true)
    try {
      const res = await emitirCarteirinha(cooperadoId, validaAte || undefined)
      if (res.error) {
        toast.error(res.error)
      } else {
        toast.success('Carteirinha emitida com sucesso.')
        setMostrarEmitir(false)
        setValidaAte('')
        router.refresh()
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao emitir carteirinha.')
    } finally {
      setEmitindo(false)
    }
  }

  async function handleConfirmarMotivo() {
    if (!motivo.trim()) {
      toast.error('Informe o motivo.')
      return
    }
    setProcessando(true)
    try {
      if (acaoMotivo === 'revogar' && carteirinhaAtiva) {
        const res = await revogarCarteirinha(carteirinhaAtiva.id, motivo.trim())
        if (res.error) { toast.error(res.error); return }
        toast.success('Carteirinha revogada.')
      } else if (acaoMotivo === 'reemitir') {
        const res = await reemitirCarteirinha(cooperadoId, motivo.trim(), validaAte || undefined)
        if (res.error) { toast.error(res.error); return }
        toast.success('Nova via emitida com sucesso.')
      }
      setAcaoMotivo(null)
      setMotivo('')
      setValidaAte('')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro ao processar a solicitação.')
    } finally {
      setProcessando(false)
    }
  }

  // ── Sem carteirinha ativa ──────────────────────────────────────────────
  if (!carteirinhaAtiva) {
    return (
      <ContentCard title="Carteirinha">
        {!mostrarEmitir ? (
          <>
            <p style={{ fontSize: 13, color: COM_C.txtSub, margin: '0 0 12px', lineHeight: 1.5 }}>
              Este cooperado ainda não possui carteirinha de identificação emitida.
            </p>
            <Btn variante="roxo" icone="ti-id" onClick={() => setMostrarEmitir(true)}>
              Emitir carteirinha
            </Btn>
          </>
        ) : (
          <div style={{ maxWidth: 320 }}>
            <Field label="Validade (opcional)" hint="Data impressa no cartão físico. Deixe em branco se não houver prazo.">
              <Input type="date" value={validaAte} onChange={e => setValidaAte(e.target.value)} />
            </Field>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <Btn variante="roxo" icone="ti-id" onClick={handleEmitir} disabled={emitindo}>
                {emitindo ? 'Emitindo...' : 'Confirmar emissão'}
              </Btn>
              <Btn variante="cinza" onClick={() => { setMostrarEmitir(false); setValidaAte('') }} disabled={emitindo}>
                Cancelar
              </Btn>
            </div>
          </div>
        )}
      </ContentCard>
    )
  }

  // ── Com carteirinha ativa ────────────────────────────────────────────────
  return (
    <ContentCard title="Carteirinha">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: COM_C.txt }}>
          <strong>Código:</strong> {carteirinhaAtiva.codigo}
        </div>
        <div style={{ fontSize: 13, color: COM_C.txt }}>
          <strong>Via:</strong> {carteirinhaAtiva.via}ª
        </div>
        <div style={{ fontSize: 13, color: COM_C.txt }}>
          <strong>Emitida em:</strong> {formatarData(carteirinhaAtiva.emitidaEm)}
        </div>
        <div style={{ fontSize: 13, color: COM_C.txt }}>
          <strong>Validade:</strong> {carteirinhaAtiva.validaAte ? formatarData(carteirinhaAtiva.validaAte) : 'Sem prazo definido'}
        </div>
        {urlVerificacao && (
          <a
            href={urlVerificacao}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, color: COM_C.azul, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 4 }}
          >
            <i className="ti ti-external-link" style={{ fontSize: 13 }} />
            Conferir na página pública
          </a>
        )}
      </div>

      {acaoMotivo === null ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn variante="azul" icone="ti-refresh" tamanho="sm" onClick={() => setAcaoMotivo('reemitir')}>
            2ª via
          </Btn>
          <Btn variante="cinza" icone="ti-ban" tamanho="sm" onClick={() => setAcaoMotivo('revogar')}>
            Revogar
          </Btn>
        </div>
      ) : (
        <div style={{ maxWidth: 360 }}>
          <Field label={acaoMotivo === 'revogar' ? 'Motivo da revogação' : 'Motivo da 2ª via'}>
            <Input value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Ex.: cartão perdido, dados desatualizados..." />
          </Field>
          {acaoMotivo === 'reemitir' && (
            <div style={{ marginTop: 10 }}>
              <Field label="Nova validade (opcional)">
                <Input type="date" value={validaAte} onChange={e => setValidaAte(e.target.value)} />
              </Field>
            </div>
          )}
          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <Btn
              variante={acaoMotivo === 'revogar' ? 'cinza' : 'azul'}
              icone={acaoMotivo === 'revogar' ? 'ti-ban' : 'ti-refresh'}
              onClick={handleConfirmarMotivo}
              disabled={processando}
            >
              {processando ? 'Processando...' : acaoMotivo === 'revogar' ? 'Confirmar revogação' : 'Confirmar 2ª via'}
            </Btn>
            <Btn variante="cinza" onClick={() => { setAcaoMotivo(null); setMotivo(''); setValidaAte('') }} disabled={processando}>
              Cancelar
            </Btn>
          </div>
        </div>
      )}
    </ContentCard>
  )
}
