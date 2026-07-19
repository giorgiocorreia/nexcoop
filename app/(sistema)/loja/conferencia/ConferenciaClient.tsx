'use client'

import { useState } from 'react'
import Link from 'next/link'
import { conferirCaixa } from '@/lib/loja/actions'
import { getDetalhesSessao } from '@/lib/loja/caixa-relatorio-actions'
import { Btn } from '@/components/ui/Btn'
import { PageLayout, MODULO_LOJA, COM_C } from '@/components/nexcoop/ui'

function fmtReal(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtDt(iso: string) {
  return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const inp: React.CSSProperties = {
  width: '100%', padding: '8px 12px',
  border: '1.5px solid #d1d5db', borderRadius: 8,
  fontSize: 13, outline: 'none', boxSizing: 'border-box' as const,
}

interface Caixa {
  id: string
  aberto_em: string
  fechado_em: string | null
  valor_abertura: number
  total_especie: number
  total_pix: number
  total_cartao: number
  valor_fisico_especie: number | null
  valor_fisico_debito: number | null
  valor_fisico_credito: number | null
  status_conferencia: string
  observacao_conferencia: string | null
  conferido_em: string | null
  usuarios: { nome_completo: string } | null
}

export default function ConferenciaClient({ orgId, usuarioId, caixas: inicial }: {
  orgId: string
  usuarioId: string
  caixas: Caixa[]
}) {
  const [caixas, setCaixas] = useState(inicial)
  const [selecionado, setSelecionado] = useState<string | null>(null)
  const [vendas, setVendas] = useState<any[]>([])
  const [carregando, setCarregando] = useState(false)
  const [obs, setObs] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')

  const caixaSel = caixas.find(c => c.id === selecionado)

  async function abrirDetalhe(id: string) {
    if (selecionado === id) { setSelecionado(null); return }
    setSelecionado(id)
    setCarregando(true)
    const det = await getDetalhesSessao(id)
    setVendas(det.vendas)
    setCarregando(false)
    setObs('')
    setErro('')
  }

  async function handleConferir(status: 'conferido' | 'divergente') {
    if (!selecionado || !caixaSel) return
    setSalvando(true)
    setErro('')
    const res = await conferirCaixa(orgId, selecionado, usuarioId, {
      status_conferencia:   status,
      valor_fisico_especie: caixaSel.valor_fisico_especie ?? 0,
      valor_fisico_debito:  caixaSel.valor_fisico_debito  ?? 0,
      valor_fisico_credito: caixaSel.valor_fisico_credito ?? 0,
      observacao_conferencia: obs || undefined,
    })
    setSalvando(false)
    if ('error' in res) { setErro(res.error); return }
    setCaixas(prev => prev.map(c =>
      c.id === selecionado
        ? { ...c, status_conferencia: status, observacao_conferencia: obs, conferido_em: new Date().toISOString() }
        : c
    ))
    setSelecionado(null)
  }

  const statusConfig: Record<string, { bg: string; color: string; label: string }> = {
    aguardando: { bg: '#fef9c3', color: '#854d0e', label: 'Aguardando' },
    conferido:  { bg: '#f0fdf4', color: '#15803d', label: 'Conferido' },
    divergente: { bg: '#fef2f2', color: '#dc2626', label: 'Divergente' },
  }

  const pendentes = caixas.filter(c => c.status_conferencia === 'aguardando').length

  return (
    <PageLayout
      titulo="Conferência de Caixa"
      subtitulo={pendentes > 0 ? `${pendentes} pendente${pendentes !== 1 ? 's' : ''}` : undefined}
      icone="ti-checklist"
      modulo={MODULO_LOJA}
    >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {caixas.map(c => {
            const st = statusConfig[c.status_conferencia] ?? statusConfig.aguardando
            const aberto = selecionado === c.id

            return (
              <div key={c.id} style={{ background: '#fff', border: `1px solid ${aberto ? COM_C.laranja : COM_C.borda}`, borderRadius: 12, overflow: 'hidden', transition: 'border-color 0.15s' }}>
                <div
                  onClick={() => abrirDetalhe(c.id)}
                  style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <i className="ti ti-cash-register" style={{ fontSize: 20, color: COM_C.laranja }} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: COM_C.txt }}>
                        {c.usuarios?.nome_completo ?? '—'}
                      </div>
                      <div style={{ fontSize: 12, color: COM_C.txtSub, marginTop: 2 }}>
                        {fmtDt(c.aberto_em)} → {c.fechado_em ? fmtDt(c.fechado_em) : '—'}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: COM_C.txt }}>
                      {fmtReal(c.total_especie + c.total_pix + c.total_cartao)}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    <i className={`ti ${aberto ? 'ti-chevron-up' : 'ti-chevron-down'}`} style={{ fontSize: 14, color: '#9ca3af' }} />
                  </div>
                </div>

                {aberto && (
                  <div style={{ borderTop: '1px solid #f0eeea', padding: '20px' }}>
                    {carregando ? (
                      <div style={{ textAlign: 'center', color: COM_C.txtSub, fontSize: 13, padding: '20px 0' }}>Carregando...</div>
                    ) : (
                      <>
                        {/* Comparativo de valores */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8, marginBottom: 20 }}>
                          {[
                            { label: 'Dinheiro', sistema: c.total_especie, fisico: c.valor_fisico_especie },
                            { label: 'Cartão débito', sistema: 0, fisico: c.valor_fisico_debito },
                            { label: 'Cartão crédito', sistema: 0, fisico: c.valor_fisico_credito },
                          ].map(item => {
                            const dif = (item.fisico ?? 0) - item.sistema
                            return (
                              <div key={item.label} style={{ background: COM_C.bg, borderRadius: 8, padding: '12px' }}>
                                <div style={{ fontSize: 11, color: COM_C.txtSub, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{item.label}</div>
                                <div style={{ fontSize: 12, color: COM_C.txtSub, marginBottom: 2 }}>Sistema: {fmtReal(item.sistema)}</div>
                                <div style={{ fontSize: 12, color: COM_C.txtSub, marginBottom: 4 }}>Informado: {item.fisico != null ? fmtReal(item.fisico) : '—'}</div>
                                {item.fisico != null && (
                                  <div style={{ fontSize: 12, fontWeight: 700, color: dif === 0 ? '#15803d' : '#dc2626' }}>
                                    {dif === 0 ? '✓ ok' : dif > 0 ? `+${fmtReal(dif)}` : fmtReal(dif)}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>

                        {/* PIX */}
                        {vendas.filter((v: any) => v.forma === 'PIX').length > 0 && (
                          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '12px 14px', marginBottom: 16 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: '#1d4ed8', marginBottom: 8 }}>
                              PIX — confirme no extrato bancário
                            </div>
                            {vendas.filter((v: any) => v.forma === 'PIX').map((v: any) => (
                              <div key={v.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 0', borderBottom: '1px solid #dbeafe', color: '#1e3a5f' }}>
                                <span>{v.num} · {v.hora}</span>
                                <span style={{ fontWeight: 600 }}>{fmtReal(v.total)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Observação */}
                        <div style={{ marginBottom: 16 }}>
                          <label style={{ fontSize: 12, fontWeight: 600, color: COM_C.txt, display: 'block', marginBottom: 5 }}>
                            Observação {c.status_conferencia === 'divergente' ? '(obrigatória)' : '(opcional)'}
                          </label>
                          <textarea
                            value={obs}
                            onChange={e => setObs(e.target.value)}
                            placeholder="Descreva divergências ou observações..."
                            rows={2}
                            style={{ ...inp, resize: 'vertical' as const }}
                          />
                        </div>

                        {erro && (
                          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#dc2626', marginBottom: 12 }}>
                            {erro}
                          </div>
                        )}

                        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                          <Btn
                            variante="cinza"
                            icone="ti-alert-triangle"
                            onClick={() => handleConferir('divergente')}
                            disabled={salvando}
                            style={{ color: '#dc2626', borderColor: '#fca5a5' }}
                          >
                            Marcar divergente
                          </Btn>
                          <Btn
                            icone="ti-circle-check"
                            onClick={() => handleConferir('conferido')}
                            disabled={salvando}
                            style={{ background: '#15803d', color: '#fff', border: '1.5px solid #15803d' }}
                          >
                            {salvando ? 'Salvando...' : 'Conferido — ok'}
                          </Btn>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {caixas.length === 0 && (
            <div style={{ textAlign: 'center', padding: '48px', color: COM_C.txtSub, fontSize: 13, background: '#fff', border: `1px solid ${COM_C.borda}`, borderRadius: 12 }}>
              Nenhum caixa fechado encontrado.
            </div>
          )}
        </div>
    </PageLayout>
  )
}
