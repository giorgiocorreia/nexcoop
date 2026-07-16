'use client'

import { useState, useMemo } from 'react'
import { registrarQuebraPeso } from '@/lib/comercializacao/quebra-peso.actions'
import { fmt } from '@/lib/fmt'
import { Btn } from '@/components/ui/Btn'
import { Modal } from '@/components/comercializacao/ui/Modal'
import { Field, Input, Textarea } from '@/components/comercializacao/ui/Field'
import { COM_C } from '@/components/comercializacao/ui/tokens'

interface Props {
  vendaId:      string
  precoKg:      number
  saldoMaximo:  number
  onClose:      () => void
  onSuccess:    () => void
}

export default function ModalQuebraPeso({ vendaId, precoKg, saldoMaximo, onClose, onSuccess }: Props) {
  const [quantidadeKg, setQuantidadeKg] = useState('')
  const [motivo, setMotivo]             = useState('')
  const [salvando, setSalvando]         = useState(false)
  const [erro, setErro]                 = useState('')
  const [aviso, setAviso]               = useState('')

  const qtd         = parseFloat(quantidadeKg.replace(',', '.'))
  const qtdValida    = !isNaN(qtd) && qtd > 0
  const excedeSaldo  = qtdValida && qtd > saldoMaximo + 1e-6
  const valorPreview = useMemo(() => (qtdValida ? qtd * precoKg : 0), [qtd, qtdValida, precoKg])

  async function handleConfirmar() {
    if (!qtdValida || excedeSaldo) return
    setSalvando(true)
    setErro('')
    const res = await registrarQuebraPeso({ vendaId, quantidadeKg: qtd, motivo: motivo || undefined })
    setSalvando(false)
    if ('error' in res && res.error) { setErro(res.error); return }
    if (res.avisoLancamento) { setAviso(res.avisoLancamento); setTimeout(onSuccess, 1800); return }
    onSuccess()
  }

  return (
    <Modal
      titulo="Registrar quebra de peso"
      subtitulo="Diferença entre o peso faturado e o peso recebido pelo comprador no destino."
      onClose={onClose}
      footer={
        <>
          <Btn variante="cinza" onClick={onClose} disabled={salvando}>Cancelar</Btn>
          <Btn variante="marrom" onClick={handleConfirmar} disabled={salvando || !qtdValida || excedeSaldo}>
            {salvando ? 'Registrando...' : 'Confirmar quebra'}
          </Btn>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Field label="Peso perdido (kg)" hint={`Saldo máximo disponível: ${fmt.peso(saldoMaximo)}`}>
          <Input
            type="number"
            step="0.001"
            value={quantidadeKg}
            onChange={e => setQuantidadeKg(e.target.value)}
            placeholder="0,000"
          />
        </Field>
        {excedeSaldo && (
          <div style={{ fontSize: 12, color: COM_C.vermelho }}>
            Quantidade excede o saldo restante da venda ({fmt.peso(saldoMaximo)}).
          </div>
        )}
        <Field label="Motivo (opcional)">
          <Textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ex.: Peso de saída a quente"
          />
        </Field>
        {qtdValida && !excedeSaldo && (
          <div style={{ background: COM_C.marromLt, borderRadius: 8, padding: '10px 12px', fontSize: 13 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ color: COM_C.txtSub }}>Valor absorvido pela cooperativa</span>
              <strong style={{ color: COM_C.marromDk }}>{fmt.moeda(valorPreview)}</strong>
            </div>
            <div style={{ fontSize: 11, color: COM_C.txtSub, marginTop: 4 }}>
              {fmt.peso(qtd)} × {fmt.moeda(precoKg)}/kg — reduz o valor a receber desta venda.
            </div>
          </div>
        )}
        {erro && <div style={{ fontSize: 12, color: COM_C.vermelho }}>{erro}</div>}
        {aviso && <div style={{ fontSize: 12, color: COM_C.marromDk }}>{aviso}</div>}
      </div>
    </Modal>
  )
}
