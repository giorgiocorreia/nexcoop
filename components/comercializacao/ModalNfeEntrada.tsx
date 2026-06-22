'use client'

// components/comercializacao/ModalNfeEntrada.tsx
// Modal pós-entrega: pergunta se deseja emitir NF-e agora
// Também exporta BotaoNfe para uso no diário de operações

import { useState } from 'react'
import { emitirNfeEntradaAction, getNfeStatus, getCotacaoParaModal } from '@/lib/comercializacao/nfe.actions'
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

  async function handleIrParaPreco() {
    setStatus('preco')
    try {
      const cot = await getCotacaoParaModal(movimentacao_id)
      setCotacoes(cot)
      if (cot) setPrecoManual(cot.preco_externo.toFixed(2))
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

      const resultado = await emitirNfeEntradaAction(movimentacao_id, preco)
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
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
      zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '28px',
        width: '100%', maxWidth: '420px', boxShadow: '0 20px 60px rgba(0,0,0,0.15)'
      }}>

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
  const [nfeStatus, setNfeStatus] = useState<
    'idle' | 'carregando' | 'sem_nfe' | 'emitindo' | 'autorizada' | 'erro'
  >('idle')
  const [danfe_url, setDanfeUrl] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function verificarEAbrirNfe() {
    if (nfeStatus === 'autorizada' && danfe_url) {
      window.open(danfe_url, '_blank')
      return
    }

    setNfeStatus('carregando')
    try {
      const nota = await getNfeStatus(movimentacao_id)

      const s = nota?.status as string | undefined
      if (!nota || s === 'pendente' || s === 'erro' || s === 'rejeitada') {
        // Ainda não emitida ou falhou — emite agora
        setNfeStatus('emitindo')
        const resultado = await emitirNfeEntradaAction(movimentacao_id)
        if (resultado.sucesso && resultado.danfe_url) {
          setDanfeUrl(resultado.danfe_url)
          setNfeStatus('autorizada')
          window.open(resultado.danfe_url, '_blank')
        } else if (resultado.sucesso) {
          // Processando (SEFAZ async)
          setNfeStatus('autorizada')
        } else {
          setErro(resultado.erro ?? 'Erro')
          setNfeStatus('erro')
        }
        return
      }

      if (s === 'autorizada' && nota.danfe_url) {
        setDanfeUrl(nota.danfe_url as string)
        setNfeStatus('autorizada')
        window.open(nota.danfe_url as string, '_blank')
        return
      }

      if (s === 'processando') {
        setNfeStatus('emitindo')
        return
      }

      setNfeStatus('sem_nfe')
    } catch (e: any) {
      setErro(e.message)
      setNfeStatus('erro')
    }
  }

  if (nfeStatus === 'autorizada') {
    return (
      <button onClick={verificarEAbrirNfe} style={{
        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
        border: '1px solid #bbf7d0', background: '#dcfce7', color: '#166534',
        fontWeight: 500, whiteSpace: 'nowrap'
      }}>
        Reimprimir NF-e
      </button>
    )
  }

  if (nfeStatus === 'emitindo' || nfeStatus === 'carregando') {
    return (
      <span style={{ fontSize: '12px', color: '#6b6b6b' }}>Aguardando...</span>
    )
  }

  if (nfeStatus === 'erro') {
    return (
      <button onClick={verificarEAbrirNfe} title={erro ?? ''} style={{
        padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
        border: '1px solid #fecaca', background: '#fee2e2', color: '#991b1b',
        fontWeight: 500, whiteSpace: 'nowrap'
      }}>
        Erro — Tentar NF-e
      </button>
    )
  }

  return (
    <button onClick={verificarEAbrirNfe} style={{
      padding: '4px 10px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
      border: '1px solid #e5e3dc', background: '#fff', color: '#92400e',
      fontWeight: 500, whiteSpace: 'nowrap'
    }}>
      Emitir NF-e
    </button>
  )
}
