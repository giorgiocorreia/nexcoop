'use client'

import { useState } from 'react'
import { forcarFechamentoCaixa } from './actions'

function fmtBrl(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

type CaixaAberto = {
  id: string
  valor_abertura: number
  aberto_em: string
  usuario_id: string
  usuarios: { nome_completo: string } | null
}

type CaixaFechado = {
  id: string
  valor_abertura: number
  aberto_em: string
  fechado_em: string
  valor_fechamento: number | null
  total_especie: number | null
  total_pix: number | null
  total_cartao: number | null
  status_conferencia: string | null
  usuario_id: string
  usuarios: { nome_completo: string } | null
}

const CONF_LABEL: Record<string, { label: string; cor: string }> = {
  aguardando: { label: 'Aguardando', cor: '#b45309' },
  conferido:  { label: 'Conferido',  cor: '#15803d' },
  divergente: { label: 'Divergente', cor: '#dc2626' },
}

function fmtHora(iso: string) {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR')
}

export default function CaixasAdminClient({
  abertos,
  fechados,
}: {
  abertos: CaixaAberto[]
  fechados: CaixaFechado[]
}) {
  const [lista, setLista] = useState(abertos)
  const [carregando, setCarregando] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [confirmar, setConfirmar] = useState<CaixaAberto | null>(null)

  async function handleForcar(caixa: CaixaAberto) {
    setCarregando(caixa.id)
    const res = await forcarFechamentoCaixa(caixa.id)
    setCarregando(null)
    if ('error' in res) {
      setMensagem({ tipo: 'erro', texto: res.error })
    } else {
      setLista(l => l.filter(c => c.id !== caixa.id))
      setMensagem({ tipo: 'ok', texto: `Caixa de ${caixa.usuarios?.nome_completo ?? 'operador'} fechado com sucesso.` })
    }
    setConfirmar(null)
  }

  return (
    <div style={{ padding: '2rem', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Caixas</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Visão geral dos caixas da loja</p>
        </div>

        {mensagem && (
          <div style={{
            padding: '0.75rem 1rem', borderRadius: 8, marginBottom: '1rem',
            background: mensagem.tipo === 'ok' ? '#dcfce7' : '#fee2e2',
            color: mensagem.tipo === 'ok' ? '#15803d' : '#dc2626', fontSize: 13,
          }}>
            {mensagem.texto}
            <button onClick={() => setMensagem(null)} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}>✕</button>
          </div>
        )}

        {/* Caixas abertos */}
        <div style={{ marginBottom: '2rem' }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: '0.75rem' }}>
            Caixas abertos agora ({lista.length})
          </h2>

          {lista.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e3dc', padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Nenhum caixa aberto no momento
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lista.map(caixa => (
                <div key={caixa.id} style={{
                  background: 'white', borderRadius: 12, border: '1px solid #e5e3dc',
                  padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>
                      {caixa.usuarios?.nome_completo ?? 'Operador'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
                      Aberto às {fmtHora(caixa.aberto_em)} · Fundo: {fmtBrl(caixa.valor_abertura)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#dcfce718', color: '#15803d', border: '1px solid #bbf7d0' }}>
                      Aberto
                    </span>
                    <button
                      onClick={() => setConfirmar(caixa)}
                      disabled={carregando === caixa.id}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: '#fff1f2', color: '#dc2626', border: '1px solid #fecaca',
                        cursor: 'pointer',
                      }}
                    >
                      {carregando === caixa.id ? 'Fechando...' : 'Forçar fechamento'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fechamentos recentes */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: '#1a1a2e', marginBottom: '0.75rem' }}>
            Fechamentos recentes
          </h2>
          <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e5e3dc' }}>
                  {['Operador', 'Data', 'Aberto', 'Fechado', 'Total Vendas', 'Conferência'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fechados.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhum fechamento registrado</td></tr>
                )}
                {fechados.map(c => {
                  const conf = CONF_LABEL[c.status_conferencia ?? ''] ?? { label: 'Aguardando', cor: '#b45309' }
                  return (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 500, color: '#1a1a2e' }}>{c.usuarios?.nome_completo ?? '—'}</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280' }}>{fmtData(c.aberto_em)}</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280' }}>{fmtHora(c.aberto_em)}</td>
                      <td style={{ padding: '10px 14px', color: '#6b7280' }}>{c.fechado_em ? fmtHora(c.fechado_em) : '—'}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a1a2e' }}>{fmtBrl(c.valor_fechamento ?? 0)}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: conf.cor + '18', color: conf.cor }}>
                          {conf.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal confirmação */}
      {confirmar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', width: 420, border: '1px solid #e5e3dc' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>Forçar fechamento</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 1rem' }}>
              Fechar o caixa de <strong>{confirmar.usuarios?.nome_completo ?? 'operador'}</strong> aberto às {fmtHora(confirmar.aberto_em)}?
            </p>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: 12, color: '#9a3412' }}>
              ⚠️ O operador não verá o resumo de fechamento. Use apenas quando necessário.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmar(null)}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer' }}
              >Cancelar</button>
              <button
                onClick={() => handleForcar(confirmar)}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer' }}
              >Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
