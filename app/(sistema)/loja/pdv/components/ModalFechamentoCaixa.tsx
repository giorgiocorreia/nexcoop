'use client'

import { useState } from 'react'
import { Btn } from '@/components/ui/Btn'
import type { ResumoFechamento } from '@/lib/loja/actions'

interface Props {
  resumo: ResumoFechamento
  onConfirmar: () => void
  onImprimir: () => void
  onCancelar: () => void
  confirmando: boolean
}

function fmtReal(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export default function ModalFechamentoCaixa({ resumo, onConfirmar, onImprimir, onCancelar, confirmando }: Props) {
  const [confirmado, setConfirmado] = useState(false)

  function linha(label: string, valor: string, destaque = false, cor?: string) {
    return (
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{ fontSize: 13, color: destaque ? '#1a1a2e' : '#6b7280', fontWeight: destaque ? 600 : 400 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: destaque ? 700 : 500, color: cor ?? (destaque ? '#1a1a2e' : '#374151') }}>{valor}</span>
      </div>
    )
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 420, boxShadow: '0 8px 32px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>

        {!confirmado ? (
          <>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Fechar Caixa</div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              Aberto às {fmtHora(resumo.aberto_em)} · Fechamento às {fmtHora(resumo.fechado_em)}
            </div>

            <div style={{ background: '#f8f7f4', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
              {linha('Fundo de abertura', fmtReal(resumo.valor_abertura))}
              {linha('Total de vendas', fmtReal(resumo.total_vendas), true)}
              {linha(`Vendas (${resumo.qtd_vendas} operações)`, '')}
              {linha('  · Dinheiro', fmtReal(resumo.total_especie))}
              {linha('  · Pix', fmtReal(resumo.total_pix))}
              {resumo.total_aportes > 0 && linha('Aportes', fmtReal(resumo.total_aportes), false, '#15803d')}
              {resumo.total_sangrias > 0 && linha('Sangrias', `- ${fmtReal(resumo.total_sangrias)}`, false, '#dc2626')}
            </div>

            <div style={{ background: '#E07B30', borderRadius: 10, padding: '14px 16px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>Saldo em espécie no caixa</span>
              <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>{fmtReal(resumo.saldo_final_especie)}</span>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variante="cinza" onClick={onCancelar}>Cancelar</Btn>
              <Btn
                onClick={() => setConfirmado(true)}
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
              <div style={{ fontSize: 13, color: '#6b7280' }}>Total vendido: {fmtReal(resumo.total_vendas)}</div>
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
