'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { getDashboardComercializacao } from '@/lib/comercializacao/dashboard'
import { criarSolicitacaoAporte } from '@/lib/comercializacao/aportes'
import { abrirCaixa } from '@/lib/comercializacao/caixa.actions'
import { fmtReal } from '@/lib/comercializacao/fmt'
import { Btn, BtnLink } from '@/components/ui/Btn'

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtKg(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace('.', ',')} t`
  return `${fmt(n)} kg`
}

const DIAS_SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb']

const C = {
  marrom:   '#92400e',
  marromLt: '#FEF3C7',
  borda:    '#E5E3DC',
  bg:       '#F8F7F4',
  txt:      '#1C1917',
  txtSub:   '#78716C',
}

const css = `
  .page-header { padding: 0 32px; min-height: 88px; display: flex; align-items: center; }
  .hub-content { padding: 28px 32px; margin: 0 -2rem -2rem -2rem; background: #F8F7F4; }
  .hub-kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 24px; }
  .kpi-card { background: #fff; border-radius: 14px; border: 1px solid #E5E3DC; border-top-width: 3px;
    box-shadow: 0 1px 4px rgba(0,0,0,0.04); padding: 18px 20px;
    transition: transform 0.15s, box-shadow 0.15s; }
  .kpi-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.07); }
  .hub-chart-row { display: grid; grid-template-columns: minmax(0,1.4fr) minmax(0,1fr); gap: 14px; margin-bottom: 24px; }
  @media (max-width: 1024px) {
    .hub-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; }
    .hub-chart-row { grid-template-columns: 1fr !important; }
  }
  @media (max-width: 640px) {
    .page-header { padding: 0 16px 0 56px; min-height: 60px; }
    .hub-content { padding: 16px; }
    .hub-kpi-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 8px !important; }
  }
`

export default function DashboardComercializacao({
  data: d,
  organizacaoId,
}: {
  data: Awaited<ReturnType<typeof getDashboardComercializacao>>
  organizacaoId: string
}) {
  const router = useRouter()

  const [modalAbrirCaixa, setModalAbrirCaixa] = useState(false)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [abrindoCaixa, setAbrindoCaixa] = useState(false)

  const [modalAporte, setModalAporte] = useState(false)
  const [valorAporte, setValorAporte] = useState('')
  const [motivoAporte, setMotivoAporte] = useState('')
  const [enviandoAporte, setEnviandoAporte] = useState(false)
  const [aporteEnviado, setAporteEnviado] = useState(false)

  const maxKg = Math.max(...d.entregasSemana.map((e) => e.totalKg), 1)
  const hoje = new Date().toISOString().slice(0, 10)
  const caixaAberto = d.sessoesAbertas.length > 0

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
      await criarSolicitacaoAporte(organizacaoId, d.minhaSessao.id, Number(valorAporte), motivoAporte)
      setAporteEnviado(true)
    } catch {
      alert('Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setEnviandoAporte(false)
    }
  }

  return (
    <>
      <style>{css}</style>

      {/* Header sticky */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff', borderBottom: `1px solid ${C.borda}`, margin: '0 -2rem 0 -2rem' }}>
        <div className="page-header" style={{ justifyContent: 'space-between', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: C.marromLt, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="ti ti-wheat" style={{ fontSize: 20, color: C.marrom }} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                <Link href="/dashboard" style={{ fontSize: 12, color: C.txtSub, textDecoration: 'none' }}>NexCoop</Link>
                <span style={{ fontSize: 12, color: C.borda }}>/</span>
                <span style={{ fontSize: 12, color: C.txtSub }}>Comercialização</span>
              </div>
              <h1 style={{ fontSize: 19, fontWeight: 800, color: C.txt, margin: 0, lineHeight: 1.2 }}>Comercialização</h1>
            </div>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 11, padding: '3px 10px', borderRadius: 20, fontWeight: 600, marginLeft: 4,
              background: caixaAberto ? '#dcfce7' : '#f3f4f6',
              color: caixaAberto ? '#14532d' : '#6b7280',
            }}>
              {caixaAberto && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />}
              {caixaAberto ? 'Caixa aberto' : 'Caixa fechado'}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BtnLink href="/comercializacao/produtores" variante="cinza" icone="ti-users">Produtores</BtnLink>
            <BtnLink href="/comercializacao/caixa" variante="cinza" icone="ti-wallet">Caixa</BtnLink>
            {d.isAdmin && (
              <BtnLink href="/comercializacao/diario" variante="cinza" icone="ti-notebook">Diário</BtnLink>
            )}
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      <div className="hub-content">

        {/* KPI cards */}
        <div className="hub-kpi-grid">

          {/* Entregas hoje */}
          <div className="kpi-card" style={{ borderTopColor: C.marrom }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.txtSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Entregas hoje</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: C.marromLt, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-package-import" style={{ fontSize: 16, color: C.marrom }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.txt, lineHeight: 1, marginBottom: 4 }}>{fmt(d.entregasHoje.count)}</div>
            <div style={{ fontSize: 11, color: C.txtSub }}>{fmtKg(d.entregasHoje.totalKg)} recebidos</div>
          </div>

          {/* Saldo em caixa */}
          <div className="kpi-card" style={{ borderTopColor: '#1D9E75' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.txtSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {d.isAdmin && d.sessoesAbertas.length > 1 ? 'Caixas abertos' : 'Saldo em caixa'}
              </span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-cash" style={{ fontSize: 16, color: '#1D9E75' }} />
              </div>
            </div>
            {d.sessoesAbertas.length === 0 ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.txt, lineHeight: 1, marginBottom: 4 }}>
                  {d.ultimoFechamento ? fmtReal(d.ultimoFechamento.saldo) : '—'}
                </div>
                <div style={{ fontSize: 11, color: C.txtSub, marginBottom: 10 }}>
                  {d.ultimoFechamento
                    ? `Últ. fechamento · ${new Date(d.ultimoFechamento.fechamento).toLocaleDateString('pt-BR')}`
                    : 'Nenhum fechamento registrado'}
                </div>
                <Btn variante="verde" tamanho="sm" onClick={() => setModalAbrirCaixa(true)}>Abrir caixa</Btn>
              </>
            ) : d.sessoesAbertas.length === 1 ? (
              <>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.txt, lineHeight: 1, marginBottom: 4 }}>
                  {fmtReal(d.sessoesAbertas[0].saldoCalculado)}
                </div>
                <div style={{ fontSize: 11, color: C.txtSub, marginBottom: d.minhaSessao ? 10 : 0 }}>{d.sessoesAbertas[0].operador}</div>
                {d.minhaSessao && (
                  <Btn variante="verde" tamanho="sm" icone="ti-plus" onClick={() => setModalAporte(true)}>Solicitar aporte</Btn>
                )}
              </>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 2 }}>
                {d.sessoesAbertas.map((s) => (
                  <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: C.txt, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a', display: 'inline-block', flexShrink: 0 }} />
                      {s.operador}
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: C.txt, fontVariantNumeric: 'tabular-nums' }}>
                      {fmtReal(s.saldoCalculado)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Produtores hoje */}
          <div className="kpi-card" style={{ borderTopColor: '#635BFF' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.txtSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Produtores hoje</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#EEF0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-users" style={{ fontSize: 16, color: '#635BFF' }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.txt, lineHeight: 1, marginBottom: 4 }}>{fmt(d.produtoresHoje)}</div>
            <div style={{ fontSize: 11, color: C.txtSub }}>de {fmt(d.totalProdutores)} cadastrados</div>
          </div>

          {/* Lotes abertos */}
          <div className="kpi-card" style={{ borderTopColor: '#E07B30' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: C.txtSub, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Lotes abertos</span>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FFF7ED', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="ti ti-box" style={{ fontSize: 16, color: '#E07B30' }} />
              </div>
            </div>
            <div style={{ fontSize: 26, fontWeight: 800, color: C.txt, lineHeight: 1, marginBottom: 4 }}>{fmt(d.lotesAbertos)}</div>
            <div style={{ fontSize: 11, color: C.txtSub }}>aguardando venda</div>
          </div>

        </div>

        {/* Alerta aportes pendentes */}
        {d.isAdmin && d.solicitacoesPendentes.length > 0 && (
          <div style={{
            background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12,
            padding: '12px 16px', marginBottom: 24,
            display: 'flex', alignItems: 'flex-start', gap: 12,
          }}>
            <span style={{ fontSize: 18, flexShrink: 0 }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.marrom, margin: '0 0 4px' }}>
                {d.solicitacoesPendentes.length === 1
                  ? '1 solicitação de aporte pendente'
                  : `${d.solicitacoesPendentes.length} solicitações de aporte pendentes`}
              </p>
              {d.solicitacoesPendentes.map((s) => (
                <p key={s.id} style={{ fontSize: 12, color: '#78350f', margin: '2px 0 0' }}>
                  {s.operador} solicitou {fmtReal(s.valor)}{s.motivo ? ` — ${s.motivo}` : ''}{' · '}
                  {new Date(s.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
              ))}
              <p style={{ fontSize: 12, color: C.marrom, margin: '6px 0 0' }}>Registre o aporte na tela de caixa após entregar o dinheiro.</p>
            </div>
          </div>
        )}

        {/* Gráfico + Sessão de caixa */}
        <div className="hub-chart-row">

          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 14px', color: C.txt }}>Entregas — últimos 7 dias</p>
            {d.entregasSemana.length === 0 ? (
              <p style={{ fontSize: 13, color: C.txtSub, textAlign: 'center', padding: '2rem 0' }}>Nenhuma entrega registrada ainda.</p>
            ) : (
              d.entregasSemana.map((e) => {
                const pct = maxKg > 0 ? (e.totalKg / maxKg) * 100 : 0
                const isHoje = e.dia === hoje
                const label = isHoje ? 'hj' : DIAS_SEMANA[new Date(e.dia + 'T12:00:00').getDay()]
                return (
                  <div key={e.dia} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7 }}>
                    <span style={{ fontSize: 11, color: isHoje ? C.txt : C.txtSub, width: 22, textAlign: 'right', fontWeight: isHoje ? 600 : 400 }}>{label}</span>
                    <div style={{ flex: 1, height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: C.marrom, borderRadius: 4, opacity: isHoje ? 1 : 0.6 }} />
                    </div>
                    <span style={{ fontSize: 11, color: isHoje ? C.txt : C.txtSub, width: 60, fontWeight: isHoje ? 600 : 400 }}>{fmtKg(e.totalKg)}</span>
                  </div>
                )
              })
            )}
          </div>

          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 14px', color: C.txt }}>Sessão de caixa</p>
            {!d.minhaSessao ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
                <p style={{ fontSize: 13, color: C.txtSub, margin: '0 0 12px' }}>Nenhuma sessão aberta</p>
                <Btn variante="cinza" onClick={() => setModalAbrirCaixa(true)}>Abrir caixa</Btn>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { label: 'Aportes', valor: d.minhaSessao.aportes, positivo: true },
                  { label: 'Sangrias', valor: d.minhaSessao.sangrias, positivo: false },
                ].map((r) => (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: C.txtSub }}>{r.label}</span>
                    <span style={{ fontSize: 14, fontWeight: 500, color: r.positivo ? '#1D9E75' : '#991b1b' }}>
                      {r.positivo ? '+' : '−'} {fmtReal(r.valor ?? 0)}
                    </span>
                  </div>
                ))}
                <hr style={{ border: 'none', borderTop: `1px solid ${C.borda}`, margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: C.txt }}>Saldo atual</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: C.txt }}>{fmtReal(d.minhaSessao.saldoCalculado)}</span>
                </div>
                <BtnLink href="/comercializacao/caixa" variante="cinza" style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
                  Ver caixa completo →
                </BtnLink>
              </div>
            )}
          </div>
        </div>

        {/* Últimas entregas */}
        {d.ultimasEntregas.length > 0 && (
          <div style={{ background: '#fff', border: `1px solid ${C.borda}`, borderRadius: 14, padding: '1.25rem', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 13, fontWeight: 600, margin: '0 0 14px', color: C.txt }}>Últimas entregas</p>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  {['Produtor', 'Produto', 'Kg', 'Valor', 'Horário'].map((h, i) => (
                    <th key={h} style={{
                      fontSize: 11, color: C.txtSub, fontWeight: 700, textAlign: i >= 2 ? 'right' : 'left',
                      padding: '0 0 8px', borderBottom: `1px solid ${C.borda}`,
                      textTransform: 'uppercase', letterSpacing: '0.05em',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {d.ultimasEntregas.map((e, i) => (
                  <tr key={i}>
                    <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', color: C.txt }}>{e.produtor}</td>
                    <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', color: C.txtSub }}>{e.produto}</td>
                    <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: C.txt, fontVariantNumeric: 'tabular-nums' }}>{fmtKg(e.kg)}</td>
                    <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: '#1D9E75', fontVariantNumeric: 'tabular-nums' }}>{fmtReal(e.valor)}</td>
                    <td style={{ padding: '8px 0 7px', borderBottom: '1px solid #f3f4f6', textAlign: 'right', color: C.txtSub }}>{e.horario}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Modal abrir caixa */}
      {modalAbrirCaixa && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0 1rem' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 360 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 1rem', color: C.txt }}>Abrir caixa</h2>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, color: C.txtSub, display: 'block', marginBottom: 4 }}>Saldo inicial em espécie (R$)</label>
              <input
                type="number" step="0.01" min="0" placeholder="0,00"
                value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} autoFocus
                style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.borda}`, fontSize: 14, boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <Btn variante="cinza" onClick={() => { setModalAbrirCaixa(false); setSaldoInicial('') }}>Cancelar</Btn>
              <Btn variante="verde" icone="ti-check" disabled={!saldoInicial || abrindoCaixa} onClick={handleAbrirCaixa}>
                {abrindoCaixa ? 'Abrindo...' : 'Confirmar'}
              </Btn>
            </div>
          </div>
        </div>
      )}

      {/* Modal solicitar aporte */}
      {modalAporte && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '0 1rem' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: '1.5rem', width: '100%', maxWidth: 400 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 1rem', color: C.txt }}>Solicitar aporte</h2>
            {aporteEnviado ? (
              <div style={{ textAlign: 'center', padding: '1rem 0' }}>
                <p style={{ fontSize: 32, margin: '0 0 8px' }}>✓</p>
                <p style={{ fontSize: 14, color: '#1D9E75', fontWeight: 500, margin: '0 0 4px' }}>Solicitação enviada!</p>
                <p style={{ fontSize: 13, color: C.txtSub, margin: '0 0 1rem' }}>O gerente verá ao acessar o sistema.</p>
                <Btn variante="cinza" onClick={() => { setModalAporte(false); setAporteEnviado(false); setValorAporte(''); setMotivoAporte('') }}>Fechar</Btn>
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: C.txtSub, display: 'block', marginBottom: 4 }}>Valor solicitado (R$)</label>
                  <input type="number" min="0" step="0.01" placeholder="0,00" value={valorAporte} onChange={(e) => setValorAporte(e.target.value)} autoFocus
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.borda}`, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: C.txtSub, display: 'block', marginBottom: 4 }}>Motivo (opcional)</label>
                  <input type="text" placeholder="Ex: caixa baixo para pagamentos" value={motivoAporte} onChange={(e) => setMotivoAporte(e.target.value)}
                    style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: `1px solid ${C.borda}`, fontSize: 14, boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <Btn variante="cinza" onClick={() => { setModalAporte(false); setValorAporte(''); setMotivoAporte('') }}>Cancelar</Btn>
                  <Btn variante="verde" icone="ti-send" disabled={!valorAporte || Number(valorAporte) <= 0 || enviandoAporte} onClick={handleSolicitarAporte}>
                    {enviandoAporte ? 'Enviando...' : 'Solicitar'}
                  </Btn>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
