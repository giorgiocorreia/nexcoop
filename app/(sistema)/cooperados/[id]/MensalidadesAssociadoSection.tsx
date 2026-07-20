'use client'

// Seção de mensalidades DENTRO do perfil do associado. Exclusiva de associação
// (renderizada só quando orgTipo === 'associacao' em CooperadoPerfil), no espaço
// que na cooperativa é ocupado por Cotas/Pagamentos. É componente NOVO e separado
// de propósito: não toca no caminho da cooperativa (ver feedback do Giorgio 20/07).
// Nada de cota aqui — mensalidade é outra coisa.

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ContentCard, COM_C } from '@/components/nexcoop/ui'
import { Btn } from '@/components/ui/Btn'
import { registrarPagamentoMensalidade } from '@/lib/mensalidades/actions'
import { gerarMensalidadesCooperado } from '@/lib/mensalidades/actions'
import { mesAtual, mesesAteDezembro } from '@/lib/mensalidades/gerar-utils'
import type { Mensalidade } from '@/types/database'

const HOJE = new Date().toISOString().split('T')[0]
const BRL = (v: number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function fmtMes(d: string) {
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
}
function fmtData(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('pt-BR')
}

// Status efetivo: pendente com vencimento no passado vira "vencido".
function statusEfetivo(m: Mensalidade): 'pago' | 'pendente' | 'vencido' {
  if (m.status === 'pago') return 'pago'
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0)
  if (m.data_vencimento && new Date(m.data_vencimento + 'T00:00:00') < hoje) return 'vencido'
  return 'pendente'
}

const STATUS_BADGE: Record<string, { label: string; bg: string; cor: string }> = {
  pago:     { label: 'Pago',     bg: '#dcfce7', cor: '#166534' },
  pendente: { label: 'Pendente', bg: '#fef3c7', cor: '#92400e' },
  vencido:  { label: 'Vencido',  bg: '#fee2e2', cor: '#dc2626' },
}

interface Props {
  cooperadoId: string
}

export default function MensalidadesAssociadoSection({ cooperadoId }: Props) {
  const [lista, setLista]         = useState<Mensalidade[]>([])
  const [carregando, setCarregando] = useState(true)
  const [baixando, setBaixando]   = useState<string | null>(null)
  const [erro, setErro]           = useState('')

  // Formulário de geração até dezembro
  const [mostrarGerar, setMostrarGerar] = useState(false)
  const [valor, setValor]         = useState('50')
  const [diaVenc, setDiaVenc]     = useState('10')
  const [gerando, setGerando]     = useState(false)

  const carregar = useCallback(async () => {
    setCarregando(true)
    const { data } = await createClient()
      .from('mensalidades')
      .select('*')
      .eq('cooperado_id', cooperadoId)
      .order('mes_referencia', { ascending: false })
      .returns<Mensalidade[]>()
    setLista(data ?? [])
    setCarregando(false)
  }, [cooperadoId])

  useEffect(() => { carregar() }, [carregar])

  async function darBaixa(id: string) {
    setBaixando(id)
    setErro('')
    const res = await registrarPagamentoMensalidade(id, HOJE)
    if ('error' in res) setErro(res.error)
    else await carregar()
    setBaixando(null)
  }

  async function gerar() {
    setGerando(true)
    setErro('')
    const mi = mesAtual()
    const res = await gerarMensalidadesCooperado(cooperadoId, {
      mesInicial:    mi,
      qtdMeses:      mesesAteDezembro(mi),
      diaVencimento: parseInt(diaVenc, 10) || 10,
      valorPadrao:   parseFloat(valor.replace(',', '.')) || 0,
    })
    if ('error' in res) setErro(res.error)
    else {
      setMostrarGerar(false)
      await carregar()
    }
    setGerando(false)
  }

  const totalPendente = lista
    .filter(m => statusEfetivo(m) !== 'pago')
    .reduce((s, m) => s + Number(m.valor), 0)

  return (
    <div style={{ marginTop: 12 }}>
      <ContentCard
        title="Mensalidades"
        action={
          <Btn variante="roxo" tamanho="sm" icone="ti-bolt" onClick={() => setMostrarGerar(v => !v)}>
            Gerar até dezembro
          </Btn>
        }
      >
        {mostrarGerar && (
          <div style={{
            background: '#f8f7f4', border: `1px solid ${COM_C.borda}`, borderRadius: 10,
            padding: '12px 14px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap',
          }}>
            <div>
              <label style={lbl}>Valor mensal (R$)</label>
              <input type="number" min="0" step="0.01" value={valor}
                onChange={e => setValor(e.target.value)} style={{ ...inp, width: 120 }} />
            </div>
            <div>
              <label style={lbl}>Dia de vencimento</label>
              <input type="number" min="1" max="31" value={diaVenc}
                onChange={e => setDiaVenc(e.target.value)} style={{ ...inp, width: 110 }} />
            </div>
            <Btn variante="roxo" tamanho="sm" onClick={gerar} disabled={gerando}>
              {gerando ? 'Gerando…' : 'Gerar parcelas'}
            </Btn>
            <span style={{ fontSize: 11, color: COM_C.txtSub }}>
              Do mês atual até dezembro. Meses já existentes não são duplicados.
            </span>
          </div>
        )}

        {erro && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 10 }}>
            {erro}
          </div>
        )}

        {carregando ? (
          <div style={{ fontSize: 12, color: '#aaa' }}>Carregando mensalidades…</div>
        ) : lista.length === 0 ? (
          <p style={{ fontSize: 13, color: '#bbb', margin: 0 }}>Nenhuma mensalidade gerada para este associado.</p>
        ) : (
          <>
            {totalPendente > 0 && (
              <div style={{ fontSize: 12, color: COM_C.txtSub, marginBottom: 10 }}>
                Em aberto: <strong style={{ color: '#dc2626' }}>{BRL(totalPendente)}</strong>
              </div>
            )}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e5e3dc' }}>
                    {['Mês', 'Valor', 'Vencimento', 'Status', ''].map(h => (
                      <th key={h} style={th}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lista.map(m => {
                    const st = statusEfetivo(m)
                    const sb = STATUS_BADGE[st]
                    return (
                      <tr key={m.id} style={{ borderBottom: '1px solid #f5f3ef' }}>
                        <td style={td}>{fmtMes(m.mes_referencia)}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{BRL(Number(m.valor))}</td>
                        <td style={td}>{st === 'pago' ? `Pago ${fmtData(m.data_pagamento)}` : fmtData(m.data_vencimento)}</td>
                        <td style={td}>
                          <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: sb.bg, color: sb.cor }}>
                            {sb.label}
                          </span>
                        </td>
                        <td style={td}>
                          {st !== 'pago' && (
                            <button onClick={() => darBaixa(m.id)} disabled={baixando === m.id}
                              style={{ fontSize: 11, padding: '3px 10px', background: '#E6F1FB', color: '#185FA5', border: '1px solid #93c5fd', borderRadius: 6, cursor: 'pointer', fontWeight: 500 }}>
                              {baixando === m.id ? '…' : 'Dar baixa'}
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </ContentCard>
    </div>
  )
}

const inp: React.CSSProperties = {
  width: '100%', padding: '7px 10px', fontSize: 13, border: '1px solid #d5d3cc',
  borderRadius: 7, background: '#fff', color: '#1a1a1a', outline: 'none', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = { display: 'block', fontSize: 11, fontWeight: 600, color: '#888', marginBottom: 5 }
const th: React.CSSProperties = { textAlign: 'left', padding: '6px 8px', fontSize: 11, fontWeight: 600, color: '#888', whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '8px 8px', fontSize: 12, color: '#1a1a1a', verticalAlign: 'middle' }
