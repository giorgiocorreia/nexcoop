'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { abrirCaixa, getMeuSaldoResponsabilidadeComercializacao } from '@/lib/comercializacao/caixa.actions'
import { Btn } from '@/components/ui/Btn'

function fmtReal(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  aberto: boolean
  onClose: () => void
  produtorId: string
  acao: 'entrega' | 'receber' | 'saque'
}

const ACAO_LABEL: Record<Props['acao'], string> = {
  entrega: 'registrar uma entrega',
  receber: 'pagar o produtor',
  saque: 'realizar um saque financeiro',
}

export default function ModalCaixaFechado({ aberto, onClose, produtorId, acao }: Props) {
  const router = useRouter()
  const [etapa, setEtapa] = useState<'aviso' | 'campos'>('aviso')
  const [saldoHerdado, setSaldoHerdado] = useState<number | null>(null)
  const [erro, setErro] = useState('')
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (etapa === 'campos' && saldoHerdado === null) {
      getMeuSaldoResponsabilidadeComercializacao().then(r => setSaldoHerdado(r.saldo_atual_especie))
    }
  }, [etapa, saldoHerdado])

  if (!aberto) return null

  function handleFechar() {
    setEtapa('aviso')
    setSaldoHerdado(null)
    setErro('')
    onClose()
  }

  function handleSubmit() {
    setErro('')
    startTransition(async () => {
      const result = await abrirCaixa()
      if (!result.success) {
        setErro(result.error ?? 'Erro ao abrir caixa.')
        return
      }
      handleFechar()
      router.push(`/comercializacao/caixa?produtor_id=${produtorId}&acao=${acao}`)
    })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: '24px',
      }}
      onClick={e => { if (e.target === e.currentTarget) handleFechar() }}
    >
      <div style={{
        background: '#fff', borderRadius: '12px', padding: '1.5rem',
        width: '100%', maxWidth: '420px', fontFamily: 'system-ui, -apple-system, sans-serif',
        boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
      }}>
        {/* Cabeçalho — sempre visível */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <i className="ti ti-lock" style={{ fontSize: '20px', color: '#854F0B' }} aria-hidden="true" />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: '15px', color: '#1a1a1a', marginBottom: '4px' }}>
              Caixa fechado
            </div>
            <div style={{ fontSize: '13px', color: '#6b6b6b', lineHeight: 1.5 }}>
              Para {ACAO_LABEL[acao]} é necessário abrir o caixa primeiro.
            </div>
          </div>
        </div>

        {/* Etapa 2: campos de saldo inicial */}
        <div style={{
          overflow: 'hidden',
          maxHeight: etapa === 'campos' ? '120px' : '0px',
          opacity: etapa === 'campos' ? 1 : 0,
          transition: 'max-height 0.25s ease, opacity 0.2s ease',
        }}>
          <div style={{ borderTop: '1px solid #f0ede8', paddingTop: '16px', marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#6b6b6b', marginBottom: '6px', fontWeight: 500 }}>
              Saldo anterior (calculado automaticamente)
            </label>
            <div style={{ fontSize: '18px', fontWeight: 700, color: '#1a1a1a' }}>
              {saldoHerdado === null ? '...' : fmtReal(saldoHerdado)}
            </div>
          </div>
        </div>

        {/* Erro */}
        {erro && (
          <div style={{ fontSize: '12px', color: '#991b1b', marginBottom: '12px', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px' }}>
            {erro}
          </div>
        )}

        {/* Botões */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <Btn variante="cinza" onClick={handleFechar} disabled={isPending}>
            Cancelar
          </Btn>
          {etapa === 'aviso' ? (
            <Btn variante="azul" icone="ti-lock-open" onClick={() => setEtapa('campos')}>
              Abrir caixa
            </Btn>
          ) : (
            <Btn variante="azul" icone="ti-check" onClick={handleSubmit} disabled={isPending}>
              {isPending ? 'Abrindo...' : 'Abrir caixa'}
            </Btn>
          )}
        </div>
      </div>
    </div>
  )
}
