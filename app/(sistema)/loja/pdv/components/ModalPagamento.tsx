'use client'

import { useState } from 'react'
import type { CooperadoIdentificado, PagamentoVenda } from '@/lib/loja/types'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { Btn } from '@/components/ui/Btn'

interface Props {
  total: number
  cooperado: CooperadoIdentificado | null
  chavePixOrg: string
  onConfirmar: (pagamento: PagamentoVenda) => void
  onCancelar: () => void
}

type FormaPagamento = 'dinheiro' | 'pix' | 'cartao' | 'conta' | 'misto'

export default function ModalPagamento({ total, cooperado, chavePixOrg, onConfirmar, onCancelar }: Props) {
  const [forma, setForma] = useState<FormaPagamento>('dinheiro')
  const [valorRecebido, setValorRecebido] = useState('')
  const [valorConta, setValorConta] = useState('')
  const [formaSecundaria, setFormaSecundaria] = useState<'dinheiro' | 'pix'>('dinheiro')
  const [tipoCartao, setTipoCartao] = useState<'debito' | 'credito'>('debito')
  const [nsu, setNsu] = useState('')
  const [autorizacao, setAutorizacao] = useState('')
  const [pixIdentificador, setPixIdentificador] = useState('')
  const [pixNomePagador, setPixNomePagador] = useState('')

  const valorContaNum = parseFloat(valorConta.replace(',', '.')) || 0
  const valorRecebidoNum = parseFloat(valorRecebido.replace(',', '.')) || 0

  const troco = forma === 'dinheiro' ? Math.max(0, valorRecebidoNum - total)
    : forma === 'misto' && formaSecundaria === 'dinheiro' ? Math.max(0, valorRecebidoNum - (total - valorContaNum))
    : 0

  const saldoInsuficiente = forma === 'conta' && (cooperado?.saldo_financeiro ?? 0) < total
  const saldoInsuficienteMisto = forma === 'misto' && valorContaNum > (cooperado?.saldo_financeiro ?? 0)
  const mistoInsuficiente = forma === 'misto' && (valorContaNum + valorRecebidoNum) < total

  const podeConfirmar = (
    (forma === 'dinheiro' && valorRecebidoNum >= total) ||
    (forma === 'pix') ||
    (forma === 'cartao') ||
    (forma === 'conta' && !saldoInsuficiente) ||
    (forma === 'misto' && !saldoInsuficienteMisto && !mistoInsuficiente && (formaSecundaria === 'pix' || valorRecebidoNum >= (total - valorContaNum)))
  )

  function handleConfirmar() {
    let pagamento: PagamentoVenda
    if (forma === 'dinheiro') {
      pagamento = { dinheiro: total, pix: 0, cartao: 0, tipo_cartao: null, nsu: '', autorizacao: '', pix_identificador: '', pix_nome_pagador: '', conta_corrente: 0, valor_recebido: valorRecebidoNum }
    } else if (forma === 'pix') {
      pagamento = { dinheiro: 0, pix: total, cartao: 0, tipo_cartao: null, nsu: '', autorizacao: '', pix_identificador: pixIdentificador, pix_nome_pagador: pixNomePagador, conta_corrente: 0, valor_recebido: 0 }
    } else if (forma === 'cartao') {
      pagamento = { dinheiro: 0, pix: 0, cartao: total, tipo_cartao: tipoCartao, nsu, autorizacao, pix_identificador: '', pix_nome_pagador: '', conta_corrente: 0, valor_recebido: 0 }
    } else if (forma === 'conta') {
      pagamento = { dinheiro: 0, pix: 0, cartao: 0, tipo_cartao: null, nsu: '', autorizacao: '', pix_identificador: '', pix_nome_pagador: '', conta_corrente: total, valor_recebido: 0 }
    } else {
      const resto = total - valorContaNum
      pagamento = {
        dinheiro: formaSecundaria === 'dinheiro' ? resto : 0,
        pix: formaSecundaria === 'pix' ? resto : 0,
        cartao: 0, tipo_cartao: null, nsu: '', autorizacao: '',
        pix_identificador: formaSecundaria === 'pix' ? pixIdentificador : '',
        pix_nome_pagador: formaSecundaria === 'pix' ? pixNomePagador : '',
        conta_corrente: valorContaNum,
        valor_recebido: valorRecebidoNum,
      }
    }
    onConfirmar(pagamento)
  }

  function btnForma(f: FormaPagamento, label: string, icone: string, desabilitado = false) {
    return (
      <button
        key={f}
        onClick={() => !desabilitado && setForma(f)}
        disabled={desabilitado}
        style={{
          flex: 1, padding: '9px 4px', borderRadius: 8, cursor: desabilitado ? 'not-allowed' : 'pointer',
          border: `2px solid ${forma === f ? '#E07B30' : '#e5e3dc'}`,
          background: forma === f ? '#fff8f3' : '#fff',
          color: desabilitado ? '#9ca3af' : forma === f ? '#92400e' : '#374151',
          fontWeight: forma === f ? 700 : 400, fontSize: 11, display: 'flex', flexDirection: 'column' as const,
          alignItems: 'center', gap: 4, opacity: desabilitado ? 0.5 : 1, transition: 'border-color .15s',
        }}
      >
        <i className={`ti ${icone}`} style={{ fontSize: 17 }} />
        {label}
      </button>
    )
  }

  const inpStyle: React.CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1.5px solid #d1d5db',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box' as const,
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 440, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: '#1a1a2e' }}>Pagamento</div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#92400e', marginBottom: 20 }}>{fmtReal(total)}</div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {btnForma('dinheiro', 'Dinheiro', 'ti-cash')}
          {btnForma('pix', 'Pix', 'ti-qrcode')}
          {btnForma('cartao', 'Cartao', 'ti-credit-card')}
          {btnForma('conta', 'Conta', 'ti-wallet', !cooperado || !cooperado.tem_conta_corrente)}
          {btnForma('misto', 'Misto', 'ti-arrows-exchange', !cooperado || !cooperado.tem_conta_corrente)}
        </div>

        {forma === 'dinheiro' && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Valor recebido</label>
            <input type="text" value={valorRecebido} onChange={e => setValorRecebido(e.target.value)} autoFocus placeholder="0,00" style={{ ...inpStyle, fontSize: 16, fontWeight: 600 }} />
            {valorRecebidoNum > 0 && (
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                <span style={{ color: '#6b7280' }}>Troco</span>
                <span style={{ fontWeight: 700, color: troco > 0 ? '#15803d' : '#374151' }}>{fmtReal(troco)}</span>
              </div>
            )}
          </div>
        )}

        {forma === 'pix' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '12px 16px', marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#15803d', marginBottom: 4, fontWeight: 600 }}>Chave Pix</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#14532d' }}>{chavePixOrg || 'Nao configurada'}</div>
              <div style={{ fontSize: 13, color: '#15803d', marginTop: 6 }}>Valor: {fmtReal(total)}</div>
            </div>
            <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Identificador / End-to-End (opcional)</label>
            <input type="text" value={pixIdentificador} onChange={e => setPixIdentificador(e.target.value)} placeholder="E2E..." style={inpStyle} />
            <div style={{ marginTop: 10 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#15803d', display: 'block', marginBottom: 5 }}>
                Nome do pagador (opcional)
              </label>
              <input
                type="text"
                value={pixNomePagador}
                onChange={e => setPixNomePagador(e.target.value)}
                placeholder="Nome de quem fez o PIX"
                style={{ ...inpStyle, fontSize: 13 }}
              />
            </div>
          </div>
        )}

        {forma === 'cartao' && (
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              {(['debito', 'credito'] as const).map(t => (
                <button key={t} onClick={() => setTipoCartao(t)}
                  style={{
                    flex: 1, padding: '8px', borderRadius: 8, cursor: 'pointer',
                    border: `2px solid ${tipoCartao === t ? '#E07B30' : '#e5e3dc'}`,
                    background: tipoCartao === t ? '#fff8f3' : '#fff',
                    fontSize: 13, fontWeight: tipoCartao === t ? 700 : 400,
                    color: tipoCartao === t ? '#92400e' : '#374151',
                  }}
                >
                  {t === 'debito' ? 'Debito' : 'Credito'}
                </button>
              ))}
            </div>

            <div style={{ background: '#f8f7f4', borderRadius: 8, padding: '12px 14px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                <span style={{ color: '#6b7280' }}>Tipo</span>
                <span style={{ fontWeight: 600, color: '#1a1a2e', textTransform: 'capitalize' }}>{tipoCartao}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                <span style={{ color: '#6b7280' }}>Valor</span>
                <span style={{ fontWeight: 700, color: '#92400e' }}>{fmtReal(total)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>NSU / Comprovante</label>
                <input type="text" value={nsu} onChange={e => setNsu(e.target.value)} placeholder="000000" style={inpStyle} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>Cod. Autorizacao</label>
                <input type="text" value={autorizacao} onChange={e => setAutorizacao(e.target.value)} placeholder="000000" style={inpStyle} />
              </div>
            </div>
          </div>
        )}

        {forma === 'conta' && cooperado && (
          <div style={{ background: saldoInsuficiente ? '#fef2f2' : '#f0fdf4', border: `1px solid ${saldoInsuficiente ? '#fca5a5' : '#86efac'}`, borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Saldo disponivel</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: saldoInsuficiente ? '#ef4444' : '#14532d' }}>{fmtReal(cooperado.saldo_financeiro)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>A debitar</span>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{fmtReal(total)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#6b7280' }}>Saldo apos</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: saldoInsuficiente ? '#ef4444' : '#374151' }}>{fmtReal(cooperado.saldo_financeiro - total)}</span>
            </div>
            {saldoInsuficiente && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 8, fontWeight: 600 }}>Saldo insuficiente</div>}
          </div>
        )}

        {forma === 'misto' && cooperado && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Valor na conta corrente</label>
            <input type="text" value={valorConta} onChange={e => setValorConta(e.target.value)} placeholder="0,00"
              style={{ ...inpStyle, border: `1.5px solid ${saldoInsuficienteMisto ? '#ef4444' : '#d1d5db'}`, marginBottom: 8 }}
            />
            {saldoInsuficienteMisto && <div style={{ color: '#ef4444', fontSize: 12, marginBottom: 8 }}>Saldo disponivel: {fmtReal(cooperado.saldo_financeiro)}</div>}

            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              {(['dinheiro', 'pix'] as const).map(f => (
                <button key={f} onClick={() => setFormaSecundaria(f)}
                  style={{ flex: 1, padding: '7px', borderRadius: 7, border: `2px solid ${formaSecundaria === f ? '#E07B30' : '#e5e3dc'}`, background: formaSecundaria === f ? '#fff8f3' : '#fff', cursor: 'pointer', fontSize: 12, fontWeight: formaSecundaria === f ? 700 : 400, color: formaSecundaria === f ? '#92400e' : '#374151' }}>
                  {f === 'dinheiro' ? 'Dinheiro' : 'Pix'}
                </button>
              ))}
            </div>

            {formaSecundaria === 'dinheiro' && (
              <>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>Valor recebido (dinheiro)</label>
                <input type="text" value={valorRecebido} onChange={e => setValorRecebido(e.target.value)} placeholder="0,00" style={inpStyle} />
                {valorRecebidoNum > 0 && (
                  <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>Troco</span>
                    <span style={{ fontWeight: 700 }}>{fmtReal(troco)}</span>
                  </div>
                )}
              </>
            )}

            <div style={{ marginTop: 10, padding: '8px 12px', background: '#f8f7f4', borderRadius: 7, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6b7280' }}>Restante a pagar</span>
              <span style={{ fontWeight: 700, color: mistoInsuficiente ? '#ef4444' : '#1a1a2e' }}>{fmtReal(Math.max(0, total - valorContaNum))}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
          <Btn variante="cinza" onClick={onCancelar}>Cancelar</Btn>
          <Btn onClick={handleConfirmar} disabled={!podeConfirmar}
            style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}>
            Confirmar pagamento
          </Btn>
        </div>
      </div>
    </div>
  )
}
