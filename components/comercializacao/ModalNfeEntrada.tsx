'use client'

// components/comercializacao/ModalNfeEntrada.tsx
// Modal pós-entrega: pergunta se deseja emitir NF-e agora
// Também exporta BotaoNfe para uso no diário de operações

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { emitirNfeEntradaAction, getNfeStatus, getCotacaoParaModal, getProdutorConjugeParaModal } from '@/lib/comercializacao/nfe.actions'
import { Btn } from '@/components/ui/Btn'

// ─── Modal pós-entrega ────────────────────────────────────────────────────────

interface ModalNfeEntradaProps {
  movimentacao_id: string
  onClose: () => void
}

export function ModalNfeEntrada({ movimentacao_id, onClose }: ModalNfeEntradaProps) {
  const [status, setStatus] = useState<'pergunta' | 'preco' | 'emitindo' | 'sucesso' | 'erro'>('pergunta')
  const [cotacoes, setCotacoes] = useState<{ preco_cooperado: number; preco_externo: number } | null>(null)
  const [precoEscolhido, setPrecoEscolhido] = useState<'cooperado' | 'externo' | 'manual'>('externo')
  const [precoManual, setPrecoManual] = useState('')
  const [danfe_url, setDanfeUrl] = useState<string | null>(null)
  const [chave_nfe, setChaveNfe] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [produtorConjuge, setProdutorConjuge] = useState<{ titular_nome: string; conjuge_nome: string | null; conjuge_cpf: string | null } | null>(null)
  const [emitirComo, setEmitirComo] = useState<'titular' | 'conjuge'>('titular')

  async function handleIrParaPreco() {
    setStatus('preco')
    try {
      const [cot, conjuge] = await Promise.all([
        getCotacaoParaModal(movimentacao_id),
        getProdutorConjugeParaModal(movimentacao_id),
      ])
      setCotacoes(cot)
      if (cot) setPrecoManual(cot.preco_externo.toFixed(2))
      setProdutorConjuge(conjuge)
    } catch {}
  }

  async function handleEmitir() {
    setStatus('emitindo')
    try {
      let preco: number | undefined
      if (precoEscolhido === 'cooperado' && cotacoes) {
        preco = cotacoes.preco_cooperado
      } else if (precoEscolhido === 'externo' && cotacoes) {
        preco = cotacoes.preco_externo
      } else if (precoEscolhido === 'manual') {
        preco = parseFloat(precoManual)
      }

      const resultado = await emitirNfeEntradaAction(movimentacao_id, preco, emitirComo)
      if (resultado.sucesso) {
        setDanfeUrl(resultado.danfe_url ?? null)
        setChaveNfe(resultado.chave_nfe ?? null)
        setStatus('sucesso')
      } else {
        setErro(resultado.erro ?? 'Erro ao emitir NF-e')
        setStatus('erro')
      }
    } catch (e: any) {
      setErro(e.message)
      setStatus('erro')
    }
  }

  return (
    <div
      onClick={e => e.stopPropagation()}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        pointerEvents: 'all',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: '16px', padding: '28px',
          width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
        }}
      >

        {/* Pergunta inicial */}
        {status === 'pergunta' && (
          <>
            <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px' }}>
              ✓ Entrega registrada
            </div>
            <div style={{ fontSize: '14px', color: '#6b6b6b', marginBottom: '24px' }}>
              Deseja emitir a Nota Fiscal de Entrada (NF-e) agora?
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Btn variante="marrom" icone="ti-file-invoice" onClick={handleIrParaPreco}
                style={{ width: '100%', justifyContent: 'center' }}>
                Emitir NF-e agora
              </Btn>
              <Btn variante="cinza" onClick={onClose}
                style={{ width: '100%', justifyContent: 'center' }}>
                Agora não (emitir depois)
              </Btn>
            </div>
          </>
        )}

        {/* Seleção de preço */}
        {status === 'preco' && (
          <>
            <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '16px' }}>
              Qual preço usar na NF-e?
            </div>

            {produtorConjuge?.conjuge_nome && produtorConjuge?.conjuge_cpf && (
              <div style={{ marginBottom: '20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                  Emitir em nome de:
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div
                    onClick={() => setEmitirComo('titular')}
                    style={{
                      padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                      border: `2px solid ${emitirComo === 'titular' ? '#92400e' : '#e5e3dc'}`,
                      background: emitirComo === 'titular' ? '#fef3c7' : '#fff',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                  >
                    <input type="radio" checked={emitirComo === 'titular'} onChange={() => setEmitirComo('titular')} />
                    <div style={{ fontSize: '13px' }}>{produtorConjuge.titular_nome} <span style={{ color: '#6b6b6b' }}>(titular)</span></div>
                  </div>
                  <div
                    onClick={() => setEmitirComo('conjuge')}
                    style={{
                      padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                      border: `2px solid ${emitirComo === 'conjuge' ? '#92400e' : '#e5e3dc'}`,
                      background: emitirComo === 'conjuge' ? '#fef3c7' : '#fff',
                      display: 'flex', alignItems: 'center', gap: '8px',
                    }}
                  >
                    <input type="radio" checked={emitirComo === 'conjuge'} onChange={() => setEmitirComo('conjuge')} />
                    <div style={{ fontSize: '13px' }}>{produtorConjuge.conjuge_nome} <span style={{ color: '#6b6b6b' }}>(cônjuge)</span></div>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {/* Cooperado */}
              <div
                onClick={() => setPrecoEscolhido('cooperado')}
                style={{
                  padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                  border: `2px solid ${precoEscolhido === 'cooperado' ? '#92400e' : '#e5e3dc'}`,
                  background: precoEscolhido === 'cooperado' ? '#fef3c7' : '#fff',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Preço cooperado</div>
                  <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: 2 }}>Para membros da cooperativa</div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#92400e' }}>
                  {cotacoes ? `R$ ${cotacoes.preco_cooperado.toFixed(2)}/kg` : '—'}
                </div>
              </div>

              {/* Externo */}
              <div
                onClick={() => setPrecoEscolhido('externo')}
                style={{
                  padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                  border: `2px solid ${precoEscolhido === 'externo' ? '#92400e' : '#e5e3dc'}`,
                  background: precoEscolhido === 'externo' ? '#fef3c7' : '#fff',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                }}
              >
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600 }}>Preço externo</div>
                  <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: 2 }}>Para produtores não cooperados</div>
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#92400e' }}>
                  {cotacoes ? `R$ ${cotacoes.preco_externo.toFixed(2)}/kg` : '—'}
                </div>
              </div>

              {/* Manual */}
              <div
                onClick={() => setPrecoEscolhido('manual')}
                style={{
                  padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                  border: `2px solid ${precoEscolhido === 'manual' ? '#92400e' : '#e5e3dc'}`,
                  background: precoEscolhido === 'manual' ? '#fef3c7' : '#fff',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600 }}>Valor personalizado</div>
                    <div style={{ fontSize: '12px', color: '#6b6b6b', marginTop: 2 }}>Informar manualmente</div>
                  </div>
                </div>
                {precoEscolhido === 'manual' && (
                  <div style={{ marginTop: '10px' }}>
                    <input
                      type="number"
                      step="0.01"
                      value={precoManual}
                      onChange={e => setPrecoManual(e.target.value)}
                      onClick={e => e.stopPropagation()}
                      placeholder="0,00"
                      style={{
                        width: '100%', padding: '8px 12px', borderRadius: '8px',
                        border: '1px solid #d1d5db', fontSize: '14px', boxSizing: 'border-box'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            <div style={{ fontSize: '12px', color: '#6b6b6b', marginBottom: '16px' }}>
              Valor total da nota: <strong style={{ color: '#92400e' }}>será calculado na emissão</strong>
            </div>

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Btn variante="cinza" onClick={() => setStatus('pergunta')}>Voltar</Btn>
              <Btn
                variante="marrom"
                icone="ti-send"
                onClick={handleEmitir}
                disabled={precoEscolhido === 'manual' && (!precoManual || parseFloat(precoManual) <= 0)}
              >
                Emitir NF-e
              </Btn>
            </div>
          </>
        )}

        {/* Emitindo */}
        {status === 'emitindo' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <div style={{ fontWeight: 500, fontSize: '15px', marginBottom: '4px' }}>Emitindo NF-e...</div>
            <div style={{ fontSize: '13px', color: '#6b6b6b' }}>Aguarde a autorização da SEFAZ</div>
          </div>
        )}

        {/* Sucesso */}
        {status === 'sucesso' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '12px', textAlign: 'center' }}>✅</div>
            <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px', textAlign: 'center' }}>NF-e autorizada</div>
            {chave_nfe && (
              <div style={{
                background: '#f8f7f4', border: '1px solid #e5e3dc', borderRadius: '8px',
                padding: '10px 12px', marginBottom: '16px', fontSize: '11px',
                color: '#6b6b6b', wordBreak: 'break-all', textAlign: 'center'
              }}>
                {chave_nfe}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {danfe_url && (
                <a href={danfe_url} target="_blank" rel="noreferrer" style={{ textDecoration: 'none' }}>
                  <Btn variante="marrom" icone="ti-printer" style={{ width: '100%', justifyContent: 'center' }}>
                    Imprimir DANFE
                  </Btn>
                </a>
              )}
              <Btn variante="cinza" onClick={onClose} style={{ width: '100%', justifyContent: 'center' }}>Fechar</Btn>
            </div>
          </>
        )}

        {/* Erro */}
        {status === 'erro' && (
          <>
            <div style={{ fontSize: '32px', marginBottom: '12px', textAlign: 'center' }}>❌</div>
            <div style={{ fontWeight: 600, fontSize: '16px', marginBottom: '8px', textAlign: 'center' }}>Erro ao emitir NF-e</div>
            <div style={{
              background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px',
              padding: '10px 12px', marginBottom: '16px', fontSize: '13px', color: '#991b1b'
            }}>
              {erro}
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <Btn variante="cinza" onClick={() => setStatus('preco')}>Tentar novamente</Btn>
              <Btn variante="marrom" onClick={onClose}>Fechar</Btn>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Botão dinâmico para o diário de operações ───────────────────────────────

interface BotaoNfeProps {
  movimentacao_id: string
}

export function BotaoNfe({ movimentacao_id }: BotaoNfeProps) {
  const [nfeStatus, setNfeStatus] = useState<'idle' | 'carregando' | 'autorizada' | 'processando' | 'erro'>('idle')
  const [danfe_url, setDanfeUrl] = useState<string | null>(null)
  const [mostrarModal, setMostrarModal] = useState(false)

  useEffect(() => {
    async function verificarStatus() {
      try {
        const nota = await getNfeStatus(movimentacao_id)
        if (nota?.status === 'autorizada') {
          setDanfeUrl((nota.danfe_url as string | null) ?? null)
          setNfeStatus('autorizada')
        } else if (nota?.status === 'processando') {
          setNfeStatus('processando')
        }
      } catch {}
    }
    verificarStatus()
  }, [movimentacao_id])

  useEffect(() => {
    if (nfeStatus !== 'processando') return
    const interval = setInterval(async () => {
      try {
        const nota = await getNfeStatus(movimentacao_id)
        if (nota?.status === 'autorizada') {
          setDanfeUrl((nota.danfe_url as string | null) ?? null)
          setNfeStatus('autorizada')
          clearInterval(interval)
        } else if (nota?.status !== 'processando') {
          clearInterval(interval)
        }
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [nfeStatus, movimentacao_id])

  if (nfeStatus === 'autorizada') {
    return (
      <button
        onClick={() => danfe_url && window.open(danfe_url, '_blank')}
        style={{
          padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
          border: '1px solid #bbf7d0', background: '#dcfce7', color: '#166534',
          fontWeight: 500, whiteSpace: 'nowrap'
        }}
      >
        Reimprimir NF-e
      </button>
    )
  }

  return (
    <>
      <button
        onClick={() => setMostrarModal(true)}
        style={{
          padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
          border: '1px solid #e5e3dc', background: '#fff', color: '#92400e',
          fontWeight: 500, whiteSpace: 'nowrap'
        }}
      >
        Emitir NF-e
      </button>

      {mostrarModal && createPortal(
        <ModalNfeEntrada
          movimentacao_id={movimentacao_id}
          onClose={() => {
            setMostrarModal(false)
            getNfeStatus(movimentacao_id).then(nota => {
              if (nota?.status === 'autorizada') {
                setDanfeUrl((nota.danfe_url as string | null) ?? null)
                setNfeStatus('autorizada')
              }
            }).catch(() => {})
          }}
        />,
        document.body
      )}
    </>
  )
}
