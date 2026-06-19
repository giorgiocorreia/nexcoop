'use client'

import { useState } from 'react'
import { Btn } from '@/components/ui/Btn'

type TipoNota = 'nfce' | 'nfe' | null

interface Props {
  vendaId: string
  orgId: string
  onConcluir: () => void
  onCancelar: () => void
}

const inp: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: 8,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box' as const,
}

export default function ModalNotaFiscal({ vendaId, orgId, onConcluir, onCancelar }: Props) {
  const [tipo, setTipo] = useState<TipoNota>(null)
  const [cpfNfce, setCpfNfce] = useState('')
  const [cnpjNfe, setCnpjNfe] = useState('')
  const [nomeNfe, setNomeNfe] = useState('')
  const [emitindo, setEmitindo] = useState(false)
  const [status, setStatus] = useState<'idle' | 'emitindo' | 'autorizada' | 'rejeitada' | 'sem_fiscal'>('idle')
  const [erro, setErro] = useState('')

  async function handleEmitir() {
    if (!tipo) return
    setEmitindo(true)
    setErro('')
    setStatus('emitindo')

    // TODO: implementar após retorno do contador (CSC, NCMs, CSTs)
    await new Promise(r => setTimeout(r, 1200))
    setEmitindo(false)
    setStatus('sem_fiscal')
    setErro('Emissão fiscal ainda não configurada. Aguardando dados do escritório contábil.')
  }

  if (status === 'idle') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
        <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 400, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', overflow: 'hidden' }}>

          <div style={{ padding: '18px 20px', borderBottom: '1px solid #f0eeea' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e' }}>Emitir documento fiscal</div>
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 3 }}>
              Venda #{vendaId.slice(-6).toUpperCase()}
            </div>
          </div>

          <div style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: '#374151', marginBottom: 10 }}>
              Tipo de documento
            </div>

            <div
              onClick={() => setTipo('nfce')}
              style={{
                padding: '14px 16px',
                border: `2px solid ${tipo === 'nfce' ? '#E07B30' : '#e5e3dc'}`,
                borderRadius: 10,
                cursor: 'pointer',
                marginBottom: 8,
                background: tipo === 'nfce' ? '#fff8f3' : '#fff',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="ti ti-receipt" style={{ fontSize: 20, color: tipo === 'nfce' ? '#E07B30' : '#9ca3af' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>NFC-e — Cupom fiscal eletrônico</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Para consumidor final. CPF opcional.</div>
                </div>
              </div>

              {tipo === 'nfce' && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #fde8d4' }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>
                    CPF do consumidor (opcional)
                  </label>
                  <input
                    value={cpfNfce}
                    onChange={e => {
                      const v = e.target.value.replace(/\D/g, '').slice(0, 11)
                      let mask = v
                      if (v.length > 9)      mask = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6,9)}-${v.slice(9)}`
                      else if (v.length > 6) mask = `${v.slice(0,3)}.${v.slice(3,6)}.${v.slice(6)}`
                      else if (v.length > 3) mask = `${v.slice(0,3)}.${v.slice(3)}`
                      setCpfNfce(mask)
                    }}
                    placeholder="000.000.000-00"
                    onClick={e => e.stopPropagation()}
                    style={inp}
                  />
                </div>
              )}
            </div>

            <div
              onClick={() => setTipo('nfe')}
              style={{
                padding: '14px 16px',
                border: `2px solid ${tipo === 'nfe' ? '#E07B30' : '#e5e3dc'}`,
                borderRadius: 10,
                cursor: 'pointer',
                background: tipo === 'nfe' ? '#fff8f3' : '#fff',
                transition: 'border-color 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <i className="ti ti-file-invoice" style={{ fontSize: 20, color: tipo === 'nfe' ? '#E07B30' : '#9ca3af' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>NF-e — Nota fiscal eletrônica</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Para pessoa jurídica. CNPJ obrigatório.</div>
                </div>
              </div>

              {tipo === 'nfe' && (
                <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #fde8d4' }}>
                  <div style={{ marginBottom: 10 }}>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>
                      CNPJ <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      value={cnpjNfe}
                      onChange={e => {
                        const v = e.target.value.replace(/\D/g, '').slice(0, 14)
                        let mask = v
                        if (v.length > 12)     mask = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8,12)}-${v.slice(12)}`
                        else if (v.length > 8) mask = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5,8)}/${v.slice(8)}`
                        else if (v.length > 5) mask = `${v.slice(0,2)}.${v.slice(2,5)}.${v.slice(5)}`
                        else if (v.length > 2) mask = `${v.slice(0,2)}.${v.slice(2)}`
                        setCnpjNfe(mask)
                      }}
                      placeholder="00.000.000/0001-00"
                      onClick={e => e.stopPropagation()}
                      style={inp}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 500, color: '#374151', display: 'block', marginBottom: 5 }}>
                      Razão social <span style={{ color: '#dc2626' }}>*</span>
                    </label>
                    <input
                      value={nomeNfe}
                      onChange={e => setNomeNfe(e.target.value)}
                      placeholder="Nome da empresa"
                      onClick={e => e.stopPropagation()}
                      style={inp}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {erro && (
            <div style={{ margin: '0 20px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626' }}>
              {erro}
            </div>
          )}

          <div style={{ padding: '16px 20px', borderTop: '1px solid #f0eeea', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Btn variante="cinza" onClick={onCancelar} disabled={emitindo}>
              Cancelar
            </Btn>
            <Btn
              icone={emitindo ? undefined : 'ti-send'}
              onClick={handleEmitir}
              disabled={!tipo || emitindo || (tipo === 'nfe' && (!cnpjNfe || !nomeNfe))}
              style={{ background: '#E07B30', color: '#fff', border: '1.5px solid #E07B30' }}
            >
              {emitindo ? 'Emitindo...' : 'Emitir'}
            </Btn>
          </div>
        </div>
      </div>
    )
  }

  if (status === 'emitindo') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 36, width: 320, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
          <i className="ti ti-loader-2" style={{ fontSize: 40, color: '#E07B30', display: 'block', marginBottom: 12 }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e' }}>Enviando para SEFAZ...</div>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 6 }}>Aguarde a autorização.</div>
        </div>
      </div>
    )
  }

  if (status === 'sem_fiscal') {
    return (
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 14, padding: 36, width: 360, textAlign: 'center', boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
          <i className="ti ti-alert-triangle" style={{ fontSize: 40, color: '#d97706', display: 'block', marginBottom: 12 }} />
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: 8 }}>Configuração fiscal pendente</div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24, lineHeight: 1.5 }}>
            {erro}
          </div>
          <Btn variante="cinza" onClick={onConcluir} style={{ width: '100%', justifyContent: 'center' }}>
            Fechar
          </Btn>
        </div>
      </div>
    )
  }

  return null
}
