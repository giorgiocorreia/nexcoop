'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getDashboardComercializacao } from '@/lib/comercializacao/dashboard'
import { criarSolicitacaoAporte } from '@/lib/comercializacao/aportes'
import { abrirCaixa } from '@/lib/comercializacao/caixa.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtKg(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} t`
  return `${fmt(n)} kg`
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

export default function DashboardComercializacao({
  data: d,
  organizacaoId,
}: {
  data: Awaited<ReturnType<typeof getDashboardComercializacao>>
  organizacaoId: string
}) {
  const router = useRouter()

  // Modal abrir caixa
  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [abrindoCaixa, setAbrindoCaixa] = useState(false)

  // Modal solicitar aporte
  const [modalAporte, setModalAporte] = useState(false)
  const [valorAporte, setValorAporte] = useState('')
  const [motivoAporte, setMotivoAporte] = useState('')
  const [enviandoAporte, setEnviandoAporte] = useState(false)
  const [aporteEnviado, setAporteEnviado] = useState(false)

  const maxKg = Math.max(...d.entregasSemana.map((e) => e.totalKg), 1)
  const hoje = new Date().toISOString().slice(0, 10)

  async function handleAbrirCaixa() {
    if (!saldoInicial) return
    setAbrindoCaixa(true)
    try {
      await abrirCaixa(parseFloat(saldoInicial))
      setModalAbrirCaixa(false)
      setSaldoInicial('')
      router.refresh()
    } catch (e: any) {
      alert(e.message)
    } finally {
      setAbrindoCaixa(false)
    }
  }

  async function handleSolicitarAporte() {
    if (!d.minhaSessao || !valorAporte || Number(valorAporte) <= 0) return
    setEnviandoAporte(true)
    try {
      await criarSolicitacaoAporte(
        organizacaoId,
        d.minhaSessao.id,
        Number(valorAporte),
        motivoAporte
      )
      setAporteEnviado(true)
    } catch {
      alert('Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setEnviandoAporte(false)
    }
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 960, margin: '0 auto' }}>

      {/* Cabeçalho */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: '0 0 6px', color: '#1a1a1a' }}>
          Comercialização
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 14, color: '#6b7280', margin: 0 }}>
              Gestão completa do ciclo de comercialização
            </p>
            {d.sessoesAbertas.length > 0 ? (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: '#dcfce7', color: '#14532d', fontWeight: 500,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                Caixa aberto
              </span>
            ) : (
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                fontSize: 11, padding: '3px 10px', borderRadius: 20,
                background: '#f3f4f6', color: '#6b7280', fontWeight: 500,
              }}>
                Caixa fechado
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link href="/comercializacao/produtores" style={{
              fontSize: 13, padding: '6px 14px', borderRadius: 8,
              border: '1px solid #e5e3dc', background: '#fff',
              color: '#374151', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 14, color: '#92400e' }}>◈</span>
              Produtores
            </Link>
            <Link href="/comercializacao/caixa" style={{
              fontSize: 13, padding: '6px 14px', borderRadius: 8,
              border: '1px solid #e5e3dc', background: '#fff',
              color: '#374151', textDecoration: 'none',
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}>
              <span style={{ fontSize: 14, color: '#1D9E75' }}>◈</span>
              Caixa
            </Link>
            {d.isAdmin && (
              <Link href="/comercializacao/diario" style={{
                fontSize: 13, padding: '6px 14px', borderRadius: 8,
                border: '1px solid #e5e3dc', background: '#fff',
                color: '#374151', textDecoration: 'none',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <span style={{ fontSize: 14, color: '#635BFF' }}>◈</span>
                Diário
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Métricas do dia */}
      <p style={{ fontSize: 11, fontWeight: 500, color: '#9ca3af', letterSpacing: '0.06em', textTransform: 'uppercase', margin: '0 0 10px' }}>
        Resumo do dia
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: 10, marginBottom: '1.5rem' }}>

        {/* Entregas hoje */}
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 16px', borderLeft: '3px solid #92400e' }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>Entregas hoje</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: '#111827', margin: 0, lineHeight: 1 }}>{fmt(d.entregasHoje.count)}</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>{fmtKg(d.entregasHoje.totalKg)} recebidos</p>
        </div>

        {/* Saldo em caixa */}
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 16px', borderLeft: '3px solid #1D9E75' }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>
            {d.isAdmin && d.sessoesAbertas.length > 1 ? 'Caixas abertos' : 'Saldo em caixa'}
          </p>

          {d.sessoesAbertas.length === 0 ? (
            <>
              {d.ultimoFechamento ? (
                <>
                  <p style={{ fontSize: 22, fontWeight: 500, color: '#111827', margin: 0, lineHeight: 1 }}>
                    {fmtReal(d.ultimoFechamento.saldo)}
                  </p>
                  <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 8px' }}>
                    Último fechamento · {new Date(d.ultimoFechamento.fechamento).toLocaleDateString('pt-BR')}
                  </p>
                </>
              ) : (
                <p style={{ fontSize: 22, fontWeight: 500, color: '#9ca3af', margin: '0 0 8px', lineHeight: 1 }}>—</p>
              )}
              <button
                onClick={() => setModalAbrirCaixa(true)}
                style={{
                  fontSize: 11, padding: '4px 10px', borderRadius: 6,
                  border: '1px solid #1D9E75', background: 'transparent',
                  color: '#1D9E75', cursor: 'pointer', fontWeight: 500,
                }}
              >
                Abrir caixa
              </button>
            </>
          ) : d.sessoesAbertas.length === 1 ? (
            <>
              <p style={{ fontSize: 22, fontWeight: 500, color: '#111827', margin: 0, lineHeight: 1 }}>
                {fmtReal(d.sessoesAbertas[0].saldoCalculado)}
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 8px' }}>
                {d.sessoesAbertas[0].operador}
              </p>
              {d.minhaSessao && (
                <button
                  onClick={() => setModalAporte(true)}
                  style={{
                    fontSize: 11, padding: '4px 10px', borderRadius: 6,
                    border: '1px solid #1D9E75', background: 'transparent',
                    color: '#1D9E75', cursor: 'pointer', fontWeight: 500,
                  }}
                >
                  + Solicitar aporte
                </button>
              )}
            </>
          ) : (
            // Múltiplas sessões — só admin chega aqui
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
              {d.sessoesAbertas.map((s) => (
                <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', flexShrink: 0 }} />
                    {s.operador}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: '#111827', fontVariantNumeric: 'tabular-nums' }}>
                    {fmtReal(s.saldoCalculado)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Produtores hoje */}
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 16px', borderLeft: '3px solid #635BFF' }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>Produtores hoje</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: '#111827', margin: 0, lineHeight: 1 }}>{fmt(d.produtoresHoje)}</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>de {fmt(d.totalProdutores)} cadastrados</p>
        </div>

        {/* Lotes abertos */}
        <div style={{ background: '#f9fafb', borderRadius: 8, padding: '14px 16px', borderLeft: '3px solid #E07B30' }}>
          <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 6px' }}>Lotes abertos</p>
          <p style={{ fontSize: 22, fontWeight: 500, color: '#111827', margin: 0, lineHeight: 1 }}>{fmt(d.lotesAbertos)}</p>
          <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0 0' }}>aguardando venda</p>
        </div>

      </div>

      {/* Alerta de solicitações de aporte pendentes — só para admin */}
      {d.isAdmin && d.solicitacoesPendentes.length > 0 && (
        <div style={{
          background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 10,
          padding: '12px 16px', marginBottom: '1.5rem',
          display: 'flex', alignItems: 'flex-start', gap: 12,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 13, fontWeight: 500, color: '#92400e', margin: '0 0 4px' }}>
              {d.solicitacoesPendentes.length === 1
                ? '1 solicitação de aporte pendente'
                : `${d.solicitacoesPendentes.length} solicitações de aporte pendentes`}
            </p>
            {d.solicitacoesPendentes.map((s) => (
              <p key={s.id} style={{ fontSize: 12, color: '#78350f', margin: '2px 0 0' }}>
                {s.operador} solicitou {fmtReal(s.valor)}
                {s.motivo ? ` — ${s.motivo}` : ''}
                {' · '}
                {new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            ))}
            <p style={{ fontSize: 12, color: '#92400e', margin: '6px 0 0' }}>
              Registre o aporte na tela de caixa após entregar o dinheiro.
            </p>
          </div>
        </div>
      )}

      {/* Gráfico + Sessão de caixa */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 12, marginBottom: '1.5rem' }}>

        {/* Gráfico de barras */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 14px', color: '#111827' }}>
            Entregas — últimos 7 dias
          </p>
          {d.entregasSemana.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9ca3af', textAlign: 'center', padding: '2rem 0' }}>
              Nenhuma entrega registrada ainda.
            </p>
          ) : (
            d.entregasSemana.map((e) => {
              const pct = maxKg > 0 ? (e.totalKg / maxKg) * 100 : 0
              const isHoje = e.dia === hoje
              const diasDate = new Date(e.dia + 'T12:00:00')
              const label = isHoje ? 'hj' : DIAS_SEMANA[diasDate.getDay()]
              return (
                <div key={e.dia} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                  <span style={{ fontSize: 11, color: isHoje ? '#111827' : '#6b7280', width: 22, textAlign: 'right', fontWeight: isHoje ? 500 : 400 }}>
                    {label}
                  </span>
                  <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#92400e', borderRadius: 4, opacity: isHoje ? 1 : 0.7 }} />
                  </div>
                  <span style={{ fontSize: 11, color: isHoje ? '#111827' : '#9ca3af', width: 60, fontWeight: isHoje ? 500 : 400 }}>
                    {fmtKg(e.totalKg)}
                  </span>
                </div>
              )
            })
          )}
        </div>

        {/* Sessão de caixa */}
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1rem 1.25rem' }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 14px', color: '#111827' }}>
            Sessão de caixa
          </p>
          {!d.minhaSessao ? (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: '0 0 12px' }}>Nenhuma sessão aberta</p>
              <button
                onClick={() => setModalAbrirCaixa(true)}
                style={{
                  fontSize: 13, padding: '7px 16px', border: '1px solid #e5e3dc',
                  borderRadius: 8, color: '#374151', background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Abrir caixa
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Aportes', valor: d.minhaSessao.aportes, positivo: true },
                { label: 'Sangrias', valor: d.minhaSessao.sangrias, positivo: false },
              ].map((r) => (
                <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: '#6b7280' }}>{r.label}</span>
                  <span style={{ fontSize: 14, fontWeight: 500, color: r.positivo ? '#1D9E75' : '#991b1b' }}>
                    {r.positivo ? '+' : '−'} {fmtReal(r.valor ?? 0)}
                  </span>
                </div>
              ))}
              <hr style={{ border: 'none', borderTop: '1px solid #e5e3dc', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>Saldo atual</span>
                <span style={{ fontSize: 16, fontWeight: 500, color: '#111827' }}>
                  {fmtReal(d.minhaSessao.saldoCalculado)}
                </span>
              </div>
              <Link href="/comercializacao/caixa" style={{
                display: 'block', textAlign: 'center', fontSize: 13,
                padding: '8px', border: '1px solid #e5e3dc', borderRadius: 8,
                color: '#374151', textDecoration: 'none', marginTop: 4,
              }}>
                Ver caixa completo →
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de últimas entregas */}
      {d.ultimasEntregas.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e3dc', borderRadius: 12, padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <p style={{ fontSize: 13, fontWeight: 500, margin: '0 0 14px', color: '#111827' }}>
            Últimas entregas
          </p>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Produtor', 'Produto', 'Kg', 'Valor', 'Horário'].map((h, i) => (
                  <th key={h} style={{
                    fontSize: 11, color: '#9ca3af', fontWeight: 400, textAlign: i >= 2 ? 'right' : 'left',
                    padding: '0 0 8px', borderBottom: '1px solid #e5e3dc',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {d.ultimasEntregas.map((e, i) => (
                <tr key={i}>
                  <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', color: '#111827' }}>{e.produtor}</td>
                  <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', color: '#6b7280' }}>{e.produto}</td>
                  <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#111827', fontVariantNumeric: 'tabular-nums' }}>{fmtKg(e.kg)}</td>
                  <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#1D9E75', fontVariantNumeric: 'tabular-nums' }}>{fmtReal(e.valor)}</td>
                  <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#9ca3af' }}>{e.horario}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal abrir caixa */}
      {modalAbrirCaixa && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '0 1rem',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '1.5rem',
            width: '100%', maxWidth: 360,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 1rem', color: '#111827' }}>
              Abrir caixa
            </h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                Saldo inicial em espécie (R$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="0,00"
                value={saldoInicial}
                onChange={(e) => setSaldoInicial(e.target.value)}
                autoFocus
                style={{
                  width: '100%', padding: '8px 12px', borderRadius: 8,
                  border: '1px solid #e5e3dc', fontSize: 14, boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setModalAbrirCaixa(false); setSaldoInicial('') }}
                style={{
                  fontSize: 13, padding: '8px 16px', borderRadius: 8,
                  border: '1px solid #e5e3dc', background: 'transparent', cursor: 'pointer',
                }}
              >
                Cancelar
              </button>
              <button
                disabled={!saldoInicial || abrindoCaixa}
                onClick={handleAbrirCaixa}
                style={{
                  fontSize: 13, padding: '8px 16px', borderRadius: 8,
                  border: 'none', background: '#1D9E75', color: '#fff',
                  cursor: 'pointer', fontWeight: 500,
                  opacity: (!saldoInicial || abrindoCaixa) ? 0.5 : 1,
                }}
              >
                {abrindoCaixa ? 'Abrindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal solicitar aporte */}
      {modalAporte && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000, padding: '0 1rem',
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '1.5rem',
            width: '100%', maxWidth: 400,
          }}>
            <h2 style={{ fontSize: 16, fontWeight: 500, margin: '0 0 1rem', color: '#111827' }}>
              Solicitar aporte
            </h2>

            {aporteEnviado ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ fontSize: 32, margin: '0 0 8px' }}>✓</p>
                <p style={{ fontSize: 14, color: '#1D9E75', fontWeight: 500, margin: '0 0 4px' }}>
                  Solicitação enviada!
                </p>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 1rem' }}>
                  O gerente verá ao acessar o sistema.
                </p>
                <button
                  onClick={() => {
                    setModalAporte(false)
                    setAporteEnviado(false)
                    setValorAporte('')
                    setMotivoAporte('')
                  }}
                  style={{
                    fontSize: 13, padding: '8px 20px', borderRadius: 8,
                    border: '1px solid #e5e3dc', cursor: 'pointer', background: 'transparent',
                  }}
                >
                  Fechar
                </button>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    Valor solicitado (R$)
                  </label>
                  <input
                    type="number" min="0" step="0.01" placeholder="0,00"
                    value={valorAporte}
                    onChange={(e) => setValorAporte(e.target.value)}
                    autoFocus
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      border: '1px solid #e5e3dc', fontSize: 14, boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: '#6b7280', display: 'block', marginBottom: 4 }}>
                    Motivo (opcional)
                  </label>
                  <input
                    type="text" placeholder="Ex: caixa baixo para pagamentos"
                    value={motivoAporte}
                    onChange={(e) => setMotivoAporte(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 12px', borderRadius: 8,
                      border: '1px solid #e5e3dc', fontSize: 14, boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button
                    onClick={() => { setModalAporte(false); setValorAporte(''); setMotivoAporte('') }}
                    style={{
                      fontSize: 13, padding: '8px 16px', borderRadius: 8,
                      border: '1px solid #e5e3dc', background: 'transparent', cursor: 'pointer',
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    disabled={!valorAporte || Number(valorAporte) <= 0 || enviandoAporte}
                    onClick={handleSolicitarAporte}
                    style={{
                      fontSize: 13, padding: '8px 16px', borderRadius: 8,
                      border: 'none', background: '#1D9E75', color: '#fff',
                      cursor: 'pointer', fontWeight: 500,
                      opacity: (!valorAporte || Number(valorAporte) <= 0 || enviandoAporte) ? 0.5 : 1,
                    }}
                  >
                    {enviandoAporte ? 'Enviando...' : 'Solicitar'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

    </div>
  )
}
