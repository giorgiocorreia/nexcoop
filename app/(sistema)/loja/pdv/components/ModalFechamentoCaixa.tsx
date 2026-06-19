'use client'

import { useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import type { ResumoFechamento } from '@/lib/loja/actions'

interface Props {
  resumo: ResumoFechamento
  onConfirmar: () => void
  onImprimir: () => void
  onCancelar: () => void
  onFechar: (dados: { valor_fisico_especie: number; valor_fisico_debito: number; valor_fisico_credito: number }) => void
  confirmando: boolean
}

function fmtReal(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: '1.5px solid #d1d5db', borderRadius: 8,
  fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
}

export default function ModalFechamentoCaixa({ resumo, onConfirmar, onImprimir, onCancelar, onFechar, confirmando }: Props) {
  const [step, setStep] = useState<'checklist' | 'confirmado'>('checklist')
  const [especie, setEspecie] = useState('')
  const [debito, setDebito] = useState('')
  const [credito, setCredito] = useState('')

  const especieNum = parseFloat(especie.replace(',', '.')) || 0
  const debitoNum  = parseFloat(debito.replace(',', '.'))  || 0
  const creditoNum = parseFloat(credito.replace(',', '.')) || 0

  const difEspecie = especieNum - resumo.saldo_final_especie
  const difDebito  = debitoNum  - resumo.total_cartao_debito
  const difCredito = creditoNum - resumo.total_cartao_credito

  function corDif(v: number) {
    if (v === 0) return '#15803d'
    if (v > 0)  return '#2563eb'
    return '#dc2626'
  }

  function labelDif(v: number) {
    if (v === 0) return '✓ ok'
    if (v > 0)  return `+${fmtReal(v)}`
    return fmtReal(v)
  }

  const podeConfirmar = especie !== ''

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

        {step === 'checklist' ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Fechamento de Caixa</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              Aberto às {fmtHora(resumo.aberto_em)} · {resumo.qtd_vendas} venda{resumo.qtd_vendas !== 1 ? 's' : ''}
            </div>

            {/* Resumo sistema */}
            <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Totais do sistema
              </div>
              {[
                { label: 'Total vendas', valor: resumo.total_vendas, bold: true },
                { label: 'Dinheiro', valor: resumo.total_especie },
                { label: 'PIX', valor: resumo.total_pix },
                { label: 'Cartão débito', valor: resumo.total_cartao_debito },
                { label: 'Cartão crédito', valor: resumo.total_cartao_credito },
                { label: 'Conta cooperado', valor: resumo.total_saldo },
                resumo.total_aportes > 0 ? { label: 'Aportes', valor: resumo.total_aportes } : null,
                resumo.total_sangrias > 0 ? { label: 'Sangrias', valor: -resumo.total_sangrias } : null,
              ].filter(Boolean).map((item, i) => item && (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: '1px solid #f0eeea' }}>
                  <span style={{ fontSize: 13, color: item.bold ? '#1a1a2e' : '#6b7280', fontWeight: item.bold ? 600 : 400 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: item.bold ? 700 : 500 }}>{fmtReal(Math.abs(item.valor))}</span>
                </div>
              ))}
            </div>

            {/* Checklist operador */}
            <div style={{ fontSize: 11, fontWeight: 600, color: '#78716c', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
              Conferência de valores
            </div>

            {/* Dinheiro */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                Dinheiro contado <span style={{ color: '#dc2626' }}>*</span>
                <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>Sistema: {fmtReal(resumo.saldo_final_especie)}</span>
              </label>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input type="text" value={especie} onChange={e => setEspecie(e.target.value)}
                  placeholder="0,00" autoFocus style={{ ...inp, flex: 1 }} />
                {especie && (
                  <span style={{ fontSize: 12, fontWeight: 600, color: corDif(difEspecie), whiteSpace: 'nowrap' }}>
                    {labelDif(difEspecie)}
                  </span>
                )}
              </div>
            </div>

            {/* Cartão débito */}
            {resumo.total_cartao_debito > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Cartão débito (maquininha)
                  <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>Sistema: {fmtReal(resumo.total_cartao_debito)}</span>
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="text" value={debito} onChange={e => setDebito(e.target.value)}
                    placeholder="0,00" style={{ ...inp, flex: 1 }} />
                  {debito && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: corDif(difDebito), whiteSpace: 'nowrap' }}>
                      {labelDif(difDebito)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Cartão crédito */}
            {resumo.total_cartao_credito > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
                  Cartão crédito (maquininha)
                  <span style={{ fontWeight: 400, color: '#6b7280', marginLeft: 8 }}>Sistema: {fmtReal(resumo.total_cartao_credito)}</span>
                </label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="text" value={credito} onChange={e => setCredito(e.target.value)}
                    placeholder="0,00" style={{ ...inp, flex: 1 }} />
                  {credito && (
                    <span style={{ fontSize: 12, fontWeight: 600, color: corDif(difCredito), whiteSpace: 'nowrap' }}>
                      {labelDif(difCredito)}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* PIX */}
            {resumo.vendas_pix.length > 0 && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', marginBottom: 8 }}>
                  PIX recebidos ({resumo.vendas_pix.length}) — conferência pelo gerente no banco
                </div>
                {resumo.vendas_pix.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #dbeafe', color: '#1e3a5f' }}>
                    <span>{p.num} · {p.nome_pagador || 'sem nome'}</span>
                    <span style={{ fontWeight: 600 }}>{fmtReal(p.valor)}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, marginTop: 6, color: '#1d4ed8' }}>
                  <span>Total PIX</span>
                  <span>{fmtReal(resumo.total_pix)}</span>
                </div>
              </div>
            )}

            {/* Conta cooperado */}
            {resumo.total_saldo > 0 && (
              <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#15803d' }}>Conta cooperado (lançado automaticamente)</span>
                <span style={{ fontWeight: 700, color: '#14532d' }}>{fmtReal(resumo.total_saldo)}</span>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
              <Btn variante="cinza" onClick={onCancelar}>Cancelar</Btn>
              <Btn
                disabled={!podeConfirmar}
                onClick={() => {
                  onFechar({ valor_fisico_especie: especieNum, valor_fisico_debito: debitoNum, valor_fisico_credito: creditoNum })
                  setStep('confirmado')
                }}
                style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}
              >
                Confirmar fechamento
              </Btn>
            </div>
          </>
        ) : (
          <>
            <div style={{ textAlign: 'center', padding: '8px 0 20px' }}>
              <i className="ti ti-lock-check" style={{ fontSize: 48, color: '#E07B30', display: 'block', marginBottom: 8 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Caixa fechado!</div>
              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 4 }}>Total vendido: {fmtReal(resumo.total_vendas)}</div>
              <div style={{ fontSize: 12, color: '#E07B30', fontWeight: 500 }}>Aguardando conferência do gerente</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <Btn
                icone="ti-printer"
                onClick={onImprimir}
                style={{ justifyContent: 'center', background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30', width: '100%' }}
              >
                Imprimir relatório de fechamento
              </Btn>
              <Btn
                icone="ti-check"
                variante="cinza"
                onClick={onConfirmar}
                disabled={confirmando}
                style={{ justifyContent: 'center', width: '100%' }}
              >
                {confirmando ? 'Finalizando...' : 'Concluir'}
              </Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
