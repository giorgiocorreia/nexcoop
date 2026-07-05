'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  PageLayout, MODULO_NEXCOOP, ContentCard, Field, Input, Select, Textarea, AlertBanner, COM_C,
} from '@/components/nexcoop/ui'
import { criarLancamento } from '@/lib/financeiro/actions'

const CONTAS = [
  { id: 'cofre', label: 'Cofre' },
  { id: 'caixa_loja', label: 'Caixa Loja' },
  { id: 'banco', label: 'Banco' },
] as const

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props {
  orgId: string
  usuarioId: string
}

export default function TesourariaClient({ orgId, usuarioId }: Props) {
  const router = useRouter()
  const [origem, setOrigem] = useState<string>(CONTAS[0].id)
  const [destino, setDestino] = useState<string>(CONTAS[1].id)
  const [valor, setValor] = useState('')
  const [observacoes, setObservacoes] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const labelOrigem = CONTAS.find(c => c.id === origem)?.label ?? origem
  const labelDestino = CONTAS.find(c => c.id === destino)?.label ?? destino

  async function handleTransferir(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setSucesso('')

    const valorNum = parseFloat(valor.replace(',', '.'))
    if (!valorNum || valorNum <= 0) {
      setErro('Informe um valor maior que zero.')
      return
    }
    if (origem === destino) {
      setErro('Origem e destino devem ser contas diferentes.')
      return
    }

    setSalvando(true)
    try {
      const hoje = new Date().toISOString().split('T')[0]
      await criarLancamento({
        organizacao_id: orgId,
        tipo: 'transferencia',
        status: 'pago',
        descricao: `Transferencia: ${labelOrigem} → ${labelDestino}`,
        valor: valorNum,
        data_competencia: hoje,
        data_pagamento: hoje,
        conta_id: origem,
        conta_destino_id: destino,
        observacoes: observacoes.trim() || null,
        usuario_id: usuarioId,
      })

      setSucesso(`Transferencia de ${fmt(valorNum)} registrada com sucesso.`)
      setValor('')
      setObservacoes('')
      router.refresh()
    } catch (err) {
      setErro(String(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <PageLayout
      titulo="Tesouraria"
      subtitulo="Transferencias entre cofre, caixa da loja e banco"
      icone="ti-building-bank"
      modulo={MODULO_NEXCOOP}
      breadcrumb={[
        { label: 'Financeiro', href: '/financeiro' },
        { label: 'Tesouraria' },
      ]}
    >
      <ContentCard title="Nova transferencia">
        <form onSubmit={handleTransferir} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'end' }}>
            <Field label="Conta de origem">
              <Select
                value={origem}
                onChange={e => {
                  const nova = e.target.value
                  setOrigem(nova)
                  if (nova === destino) {
                    const outra = CONTAS.find(c => c.id !== nova)
                    if (outra) setDestino(outra.id)
                  }
                }}
              >
                {CONTAS.map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </Field>

            <div style={{
              width: 36, height: 36, borderRadius: 10, background: COM_C.azulLt,
              display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2,
            }}>
              <i className="ti ti-arrow-right" style={{ fontSize: 18, color: COM_C.azul }} />
            </div>

            <Field label="Conta de destino">
              <Select value={destino} onChange={e => setDestino(e.target.value)}>
                {CONTAS.filter(c => c.id !== origem).map(c => (
                  <option key={c.id} value={c.id}>{c.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Valor (R$)">
            <Input
              type="number"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              min="0.01"
              step="0.01"
              required
              style={{ maxWidth: 220 }}
            />
          </Field>

          <Field label="Observacoes (opcional)">
            <Textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Ex.: Sangria do caixa para o cofre"
              rows={2}
            />
          </Field>

          <div style={{
            background: '#FAFAF9', border: `1px solid ${COM_C.borda}`, borderRadius: 10,
            padding: '12px 14px', fontSize: 13, color: COM_C.txtSub,
          }}>
            Sera registrado um lancamento do tipo <strong>transferencia</strong> de{' '}
            <strong>{labelOrigem}</strong> para <strong>{labelDestino}</strong>
            {valor ? ` no valor de ${fmt(parseFloat(valor.replace(',', '.')) || 0)}` : ''}.
          </div>

          {erro && <AlertBanner tipo="erro">{erro}</AlertBanner>}
          {sucesso && <AlertBanner tipo="ok">{sucesso}</AlertBanner>}

          <div>
            <button
              type="submit"
              disabled={salvando}
              style={{
                padding: '11px 20px', background: COM_C.azul, color: '#fff',
                border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700,
                cursor: salvando ? 'wait' : 'pointer', opacity: salvando ? 0.8 : 1,
              }}
            >
              {salvando ? 'Registrando…' : 'Registrar transferencia'}
            </button>
          </div>
        </form>
      </ContentCard>

      <div style={{ marginTop: 16 }}>
        <ContentCard title="Contas fisicas">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
            {CONTAS.map(c => (
              <div
                key={c.id}
                style={{
                  background: '#FAFAF9', border: `1px solid ${COM_C.borda}`, borderRadius: 10,
                  padding: '14px 16px', textAlign: 'center',
                }}
              >
                <i className="ti ti-cash" style={{ fontSize: 22, color: COM_C.azul, display: 'block', marginBottom: 8 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: COM_C.txt }}>{c.label}</div>
              </div>
            ))}
          </div>
        </ContentCard>
      </div>
    </PageLayout>
  )
}