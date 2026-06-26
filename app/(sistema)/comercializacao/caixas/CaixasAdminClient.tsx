'use client'

import { useState } from 'react'
import Link from 'next/link'
import { forcarFechamentoSessao } from './actions'

function fmtHora(iso: string) {
  const d = new Date(iso)
  const h = String(d.getUTCHours() - 3).padStart(2, '0')
  const m = String(d.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function fmtData(iso: string) {
  const d = new Date(iso)
  const dia = String(d.getUTCDate()).padStart(2, '0')
  const mes = String(d.getUTCMonth() + 1).padStart(2, '0')
  const ano = d.getUTCFullYear()
  return `${dia}/${mes}/${ano}`
}

function fmtBrl(v: number) {
  return 'R$ ' + v.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

type SessaoAberta = {
  id: string
  saldo_inicial_especie: number
  hora_abertura: string
  usuario_id: string
  usuarios: { nome_completo: string } | null
}

type SessaoFechada = {
  id: string
  saldo_inicial_especie: number
  hora_abertura: string
  hora_fechamento: string | null
  total_saidas_especie: number | null
  total_pix: number | null
  saldo_final_especie: number | null
  usuario_id: string
  usuarios: { nome_completo: string } | null
}

const C = {
  marrom: '#92400e', marromLt: '#FDF4E7',
  borda: '#E5E3DC', bg: '#F8F7F4',
  txt: '#1C1917', txtSub: '#78716C',
}

export default function CaixasAdminClient({
  abertos,
  fechados,
}: {
  abertos: SessaoAberta[]
  fechados: SessaoFechada[]
}) {
  const [lista, setLista] = useState(abertos)
  const [carregando, setCarregando] = useState<string | null>(null)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [confirmar, setConfirmar] = useState<SessaoAberta | null>(null)

  async function handleForcar(sessao: SessaoAberta) {
    setCarregando(sessao.id)
    const res = await forcarFechamentoSessao(sessao.id)
    setCarregando(null)
    if (res.error) {
      setMensagem({ tipo: 'erro', texto: res.error })
    } else {
      setLista(l => l.filter(s => s.id !== sessao.id))
      setMensagem({ tipo: 'ok', texto: `Caixa de ${sessao.usuarios?.nome_completo ?? 'operador'} fechado com sucesso.` })
    }
    setConfirmar(null)
  }

  return (
    <>
      <style>{`
        .cx-header  { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
        .cx-content { padding: 28px 32px; }
        @media (max-width: 640px) {
          .cx-header  { padding: 0 16px 0 56px; min-height: 60px; }
          .cx-content { padding: 16px; }
        }
      `}</style>

      <header className="cx-header" style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: '#fff', borderBottom: `1px solid ${C.borda}`,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, margin: '0 -2rem 0 -2rem',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: C.marromLt, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <i className="ti ti-cash" style={{ fontSize: 20, color: C.marrom }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>
                Caixas
              </h1>
              {lista.length > 0 && (
                <span style={{ background: '#dcfce7', color: '#15803d', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 6 }}>
                  {lista.length} aberto{lista.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
              <Link href="/comercializacao" style={{ color: C.txtSub, textDecoration: 'none' }}>Comercialização</Link>
              {' / '}Caixas
            </div>
          </div>
        </div>
      </header>

      <div className="cx-content" style={{ background: C.bg, margin: '0 -2rem -2rem -2rem', minHeight: 'calc(100vh - 88px)' }}>

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

        {/* Sessões abertas */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.txtSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Caixas abertos agora ({lista.length})
          </div>

          {lista.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.borda}`, padding: '2rem', textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>
              Nenhum caixa aberto no momento
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {lista.map(sessao => (
                <div key={sessao.id} style={{
                  background: '#fff', borderRadius: 12, border: `1px solid ${C.borda}`,
                  padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <div style={{ fontWeight: 600, color: C.txt, fontSize: 14 }}>
                      {sessao.usuarios?.nome_completo ?? 'Operador'}
                    </div>
                    <div style={{ fontSize: 12, color: C.txtSub, marginTop: 2 }}>
                      Aberto às {fmtHora(sessao.hora_abertura)} · Fundo: {fmtBrl(sessao.saldo_inicial_especie)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600, background: '#dcfce718', color: '#15803d', border: '1px solid #bbf7d0' }}>
                      Aberto
                    </span>
                    <button
                      onClick={() => setConfirmar(sessao)}
                      disabled={carregando === sessao.id}
                      style={{
                        padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                        background: '#fff1f2', color: '#dc2626', border: '1px solid #fecaca',
                        cursor: 'pointer',
                      }}
                    >
                      {carregando === sessao.id ? 'Fechando...' : 'Forçar fechamento'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fechamentos recentes */}
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.txtSub, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
            Fechamentos recentes
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: `1px solid ${C.borda}`, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 600 }}>
                <thead>
                  <tr style={{ background: '#fafaf9', borderBottom: `1px solid ${C.borda}` }}>
                    {['Operador', 'Data', 'Aberto', 'Fechado', 'Saídas Espécie', 'Total Pix', 'Saldo Final'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: C.txtSub, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {fechados.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhum fechamento registrado</td></tr>
                  )}
                  {fechados.map(s => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f5f5f4' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: C.txt }}>{s.usuarios?.nome_completo ?? '—'}</td>
                      <td style={{ padding: '10px 14px', color: C.txtSub }}>{fmtData(s.hora_abertura)}</td>
                      <td style={{ padding: '10px 14px', color: C.txtSub }}>{fmtHora(s.hora_abertura)}</td>
                      <td style={{ padding: '10px 14px', color: C.txtSub }}>{s.hora_fechamento ? fmtHora(s.hora_fechamento) : '—'}</td>
                      <td style={{ padding: '10px 14px', color: C.txtSub }}>{fmtBrl(s.total_saidas_especie ?? 0)}</td>
                      <td style={{ padding: '10px 14px', color: C.txtSub }}>{fmtBrl(s.total_pix ?? 0)}</td>
                      <td style={{ padding: '10px 14px', fontWeight: 600, color: C.txt }}>{fmtBrl(s.saldo_final_especie ?? 0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal confirmação */}
      {confirmar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', width: 420, border: `1px solid ${C.borda}` }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: 16, fontWeight: 700, color: C.txt }}>Forçar fechamento</h3>
            <p style={{ fontSize: 13, color: C.txtSub, margin: '0 0 1rem' }}>
              Fechar o caixa de <strong>{confirmar.usuarios?.nome_completo ?? 'operador'}</strong> aberto às {fmtHora(confirmar.hora_abertura)}?
            </p>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: 12, color: '#9a3412' }}>
              ⚠️ O operador não verá o resumo de fechamento. Use apenas quando necessário.
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setConfirmar(null)}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: `1px solid ${C.borda}`, background: '#fff', color: C.txt, cursor: 'pointer' }}
              >Cancelar</button>
              <button
                onClick={() => handleForcar(confirmar)}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#dc2626', color: '#fff', border: 'none', cursor: 'pointer' }}
              >Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
