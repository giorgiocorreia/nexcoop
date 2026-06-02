'use client'

import { useEffect, useState } from 'react'
import {
  calcularSobras,
  salvarConfiguracaoContabil,
  getExercicioAtivo,
  getFechamento,
  fecharExercicio,
  calcularDistribuicaoSobras,
  getDistribuicaoSobras,
  atualizarStatusDistribuicao,
} from '@/lib/contabil/actions'
import type { TipoOrg } from '@/lib/contabil/types'
import BotaoAjuda from '@/components/BotaoAjuda'

const COR = '#0F766E'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}
function fmtPerc(v: number) {
  return `${Number(v).toFixed(2)}%`
}

export default function SobrasClient({
  orgId, userId, funcoes, crcContador, isContador, tipoOrg,
}: {
  orgId: string
  userId: string
  funcoes: string[]
  crcContador: string | null
  isContador: boolean
  tipoOrg: TipoOrg
}) {
  const anoAtual = new Date().getFullYear()
  const [ano, setAno] = useState(anoAtual)
  const [dados, setDados] = useState<any>(null)
  const [exercicio, setExercicio] = useState<any>(null)
  const [fechamento, setFechamento] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const [editandoConfig, setEditandoConfig] = useState(false)
  const [percFR, setPercFR] = useState('10.00')
  const [percRefac, setPercRefac] = useState('5.00')
  const [percFates, setPercFates] = useState('0.00')
  const [criterio, setCriterio] = useState('proporcional_operacoes')
  const [salvandoConfig, setSalvandoConfig] = useState(false)

  const [modalFechamento, setModalFechamento] = useState(false)
  const [obsFechar, setObsFechar] = useState('')
  const [fechando, setFechando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  const [distribuicao, setDistribuicao] = useState<any[]>([])
  const [calculando, setCalculando] = useState(false)

  const isAdmin = funcoes.includes('admin')
  const podeFechar = isContador || isAdmin

  // Terminologia derivada dos dados (fallback para tipoOrg prop)
  const term = dados?.terminologia ?? (tipoOrg === 'cooperativa'
    ? { resultadoPositivo: 'Sobras Brutas do Exercício', resultadoNegativo: 'Perdas do Exercício', distribuiResultado: true, fundoObrigatorio: true, refacObrigatorio: true }
    : { resultadoPositivo: 'Superávit do Exercício', resultadoNegativo: 'Déficit do Exercício', distribuiResultado: false, fundoObrigatorio: false, refacObrigatorio: false })

  const tituloSobras = tipoOrg === 'cooperativa' ? 'Sobras e REFAC' : 'Superávit e Destinações'
  const descSobras = tipoOrg === 'cooperativa'
    ? 'Apuração do resultado do exercício e destinações obrigatórias (Lei 5.764/71)'
    : 'Apuração do resultado do exercício conforme estatuto da organização'

  useEffect(() => {
    setLoading(true)
    Promise.all([
      calcularSobras(orgId, ano),
      getExercicioAtivo(orgId),
    ]).then(([s, ex]) => {
      setDados(s)
      setExercicio(ex)
      if (s.config) {
        setPercFR(String(s.config.percentual_fundo_reserva))
        setPercRefac(String(s.config.percentual_refac))
        setPercFates(String(s.config.percentual_fates))
        setCriterio(s.config.criterio_distribuicao)
      }
      if (ex) {
        getFechamento(orgId, ex.id).then(fech => {
          setFechamento(fech)
          if (fech) getDistribuicaoSobras(fech.id).then(setDistribuicao)
        })
      }
    }).finally(() => setLoading(false))
  }, [ano, orgId])

  async function handleSalvarConfig() {
    setSalvandoConfig(true); setErro('')
    try {
      await salvarConfiguracaoContabil({
        org_id: orgId,
        percentual_fundo_reserva: Number(percFR),
        percentual_refac: Number(percRefac),
        percentual_fates: Number(percFates),
        criterio_distribuicao: criterio,
      })
      const novo = await calcularSobras(orgId, ano)
      setDados(novo)
      setEditandoConfig(false)
      setSucesso('Configurações salvas!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e: any) { setErro(e.message) }
    finally { setSalvandoConfig(false) }
  }

  async function handleFechar() {
    if (!dados || !exercicio) return
    setFechando(true); setErro('')
    try {
      const hash = await fecharExercicio({
        org_id: orgId,
        exercicio_id: exercicio.id,
        sobras_brutas: dados.sobrasBrutas,
        fundo_reserva: dados.fundoReserva,
        refac: dados.refac,
        fates: dados.fates,
        sobras_distribuiveis: dados.sobrasDistribuiveis,
        fechado_por: userId,
        fechado_por_perfil: isContador ? 'contador' : 'admin',
        crc_contador: crcContador || undefined,
        observacoes: obsFechar,
      })
      setSucesso(`Exercício ${ano} encerrado! Hash: ${hash.slice(0, 16)}...`)
      setModalFechamento(false)
      const ex = await getExercicioAtivo(orgId)
      setExercicio(ex)
      if (ex) getFechamento(orgId, ex.id).then(setFechamento)
    } catch (e: any) { setErro(e.message) }
    finally { setFechando(false) }
  }

  async function handleCalcularDistribuicao() {
    if (!fechamento) return
    setCalculando(true); setErro('')
    try {
      await calcularDistribuicaoSobras(orgId, fechamento.id)
      const dist = await getDistribuicaoSobras(fechamento.id)
      setDistribuicao(dist)
      setSucesso('Distribuição calculada!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e: any) { setErro(e.message) }
    finally { setCalculando(false) }
  }

  async function handleStatusDist(id: string, status: 'pago' | 'retido') {
    await atualizarStatusDistribuicao(id, status)
    setDistribuicao(d => d.map((x: any) => x.id === id ? { ...x, status } : x))
  }

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{tituloSobras}</h1>
            <BotaoAjuda chave="manual_contabil_url" />
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>{descSobras}</p>
        </div>
        <select value={ano} onChange={e => setAno(Number(e.target.value))}
          style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
          {[anoAtual - 1, anoAtual, anoAtual + 1].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}
      {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{erro}</div>}

      {exercicio && (
        <div style={{
          background: exercicio.status === 'ENCERRADO' ? '#f0fdf9' : '#fffbeb',
          border: `1px solid ${exercicio.status === 'ENCERRADO' ? '#86efac' : '#f59e0b'}`,
          borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13,
          color: exercicio.status === 'ENCERRADO' ? '#166534' : '#92400e', fontWeight: 600,
        }}>
          {exercicio.status === 'ENCERRADO'
            ? `✓ Exercício ${exercicio.ano} encerrado em ${new Date(exercicio.encerrado_em).toLocaleDateString('pt-BR')}`
            : `⚡ Exercício ${exercicio.ano} em aberto`}
        </div>
      )}

      {loading ? <p style={{ color: '#6b7280' }}>Calculando...</p> : !dados ? null : (
        <>
          {/* Apuração */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ background: '#1a1a2e', padding: '12px 16px' }}>
              <span style={{ fontWeight: 700, fontSize: 13, color: '#fff' }}>APURAÇÃO DO RESULTADO — {ano}</span>
            </div>

            {[
              { label: 'Total de Receitas', valor: dados.totalReceitas, cor: '#166534', bg: '#f0fdf9' },
              { label: 'Total de Despesas', valor: -dados.totalDespesas, cor: '#dc2626', bg: '#fff1f2' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: item.bg, borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.label}</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: item.cor }}>{fmt(Math.abs(item.valor))}</span>
              </div>
            ))}

            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: dados.sobrasBrutas >= 0 ? '#f0fdf9' : '#fef2f2', borderBottom: '2px solid #e5e3dc' }}>
              <span style={{ fontSize: 14, fontWeight: 700 }}>
                {dados.sobrasBrutas >= 0 ? term.resultadoPositivo : term.resultadoNegativo}
              </span>
              <span style={{ fontSize: 16, fontWeight: 700, color: dados.sobrasBrutas >= 0 ? COR : '#dc2626' }}>
                {fmt(Math.abs(dados.sobrasBrutas))}
              </span>
            </div>

            {dados.sobrasBrutas > 0 && (
              <>
                {[
                  ...(dados.fundoReserva > 0 ? [{ label: `Fundo de Reserva (${fmtPerc(dados.percFundoReserva)})`, valor: dados.fundoReserva, nota: term.fundoObrigatorio ? 'Lei 5.764/71 — mínimo 10%' : 'Conforme estatuto' }] : []),
                  ...(dados.refac > 0 ? [{ label: `REFAC (${fmtPerc(dados.percRefac)})`, valor: dados.refac, nota: 'Reserva de Assist. Técnica, Educacional e Social' }] : []),
                  ...(dados.fates > 0 ? [{ label: `FATES (${fmtPerc(dados.percFates)})`, valor: dados.fates, nota: 'Fundo de Assistência Técnica e Social' }] : []),
                ].map(item => (
                  <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #f3f4f6' }}>
                    <div>
                      <span style={{ fontSize: 13 }}>{item.label}</span>
                      <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{item.nota}</p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>- {fmt(item.valor)}</span>
                  </div>
                ))}
                {term.distribuiResultado ? (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: '#f0fdf9' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: COR }}>Sobras Distribuíveis aos Cooperados</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: COR }}>{fmt(dados.sobrasDistribuiveis)}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: '#f0fdf9' }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: COR }}>Resultado do Exercício</span>
                    <span style={{ fontSize: 16, fontWeight: 700, color: COR }}>{fmt(dados.sobrasBrutas - dados.fundoReserva - dados.refac - dados.fates)}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Configurações */}
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Configurações de Destinação</h2>
              {!editandoConfig && isAdmin && (
                <button onClick={() => setEditandoConfig(true)}
                  style={{ padding: '6px 14px', background: '#fff', color: COR, border: `1px solid ${COR}`, borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Editar
                </button>
              )}
            </div>

            {!term.fundoObrigatorio && (
              <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, padding: '10px 14px', marginBottom: 14, fontSize: 12, color: '#92400e' }}>
                Para associações, o Fundo de Reserva e o REFAC não são obrigatórios por lei, mas podem ser configurados pelo estatuto da organização.
              </div>
            )}

            {editandoConfig ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[
                  [term.fundoObrigatorio ? '% Fundo de Reserva (mín. 10%)' : '% Fundo de Reserva', percFR, setPercFR],
                  ['% REFAC', percRefac, setPercRefac],
                  ['% FATES', percFates, setPercFates],
                ].map(([label, val, setter]: any) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 13, flex: 1 }}>{label}</label>
                    <input type='number' step='0.01' min='0' max='100' value={val} onChange={e => setter(e.target.value)}
                      style={{ width: 100, padding: '7px 10px', border: '1px solid #e5e3dc', borderRadius: 6, fontSize: 13, textAlign: 'right' }} />
                    <span style={{ fontSize: 13, color: '#6b7280' }}>%</span>
                  </div>
                ))}
                {term.distribuiResultado && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <label style={{ fontSize: 13, flex: 1 }}>Critério de distribuição</label>
                    <select value={criterio} onChange={e => setCriterio(e.target.value)}
                      style={{ padding: '7px 10px', border: '1px solid #e5e3dc', borderRadius: 6, fontSize: 13 }}>
                      <option value='proporcional_operacoes'>Proporcional às operações</option>
                      <option value='proporcional_cotas'>Proporcional às cotas</option>
                      <option value='igualitario'>Igualitário</option>
                    </select>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 4 }}>
                  <button onClick={() => setEditandoConfig(false)}
                    style={{ padding: '7px 16px', border: '1px solid #e5e3dc', borderRadius: 6, fontSize: 12, background: '#fff', cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button onClick={handleSalvarConfig} disabled={salvandoConfig}
                    style={{ padding: '7px 16px', background: COR, color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {salvandoConfig ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                {[
                  ['Fundo de Reserva', fmtPerc(dados.percFundoReserva)],
                  ['REFAC', fmtPerc(dados.percRefac)],
                  ['FATES', fmtPerc(dados.percFates)],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: '#f8f7f4', borderRadius: 8, padding: '10px 14px' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{k}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 16, fontWeight: 700, color: COR }}>{v}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botão de fechamento */}
          {podeFechar && exercicio?.status === 'ABERTO' && (
            <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: '#92400e' }}>Fechamento do Exercício {ano}</h2>
              <p style={{ fontSize: 13, color: '#92400e', marginBottom: 16 }}>
                O fechamento é irreversível. Gera um hash SHA-256 de auditoria com os valores apurados, assinado por{' '}
                {isContador ? `contador (CRC: ${crcContador || 'não informado'})` : 'administrador da org'}.
                {!isContador && ' Recomendado que seja feito pelo contador responsável.'}
              </p>
              <button onClick={() => setModalFechamento(true)}
                style={{ padding: '10px 20px', background: '#92400e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Encerrar Exercício {ano}
              </button>
            </div>
          )}

          {/* Resumo do fechamento */}
          {fechamento && (
            <div style={{ background: '#f0fdf9', border: '1px solid #86efac', borderRadius: 12, padding: 20, marginBottom: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: '#166534' }}>✓ Exercício Encerrado</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  ['Fechado por perfil', fechamento.fechado_por_perfil === 'contador' ? 'Contador' : 'Administrador'],
                  ['CRC', fechamento.crc_contador || '—'],
                  ['Data', new Date(fechamento.created_at).toLocaleDateString('pt-BR')],
                  ['Hash', fechamento.hash_fechamento.slice(0, 24) + '...'],
                ].map(([k, v]) => (
                  <div key={k} style={{ background: '#fff', borderRadius: 6, padding: '8px 12px' }}>
                    <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{k}</p>
                    <p style={{ margin: '2px 0 0', fontSize: 12, fontWeight: 600, fontFamily: 'monospace' }}>{v}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Distribuição de sobras — apenas para cooperativas */}
          {term.distribuiResultado && fechamento && dados?.sobrasDistribuiveis > 0 && (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>Distribuição de Sobras por Cooperado</h2>
                {distribuicao.length === 0 && (
                  <button onClick={handleCalcularDistribuicao} disabled={calculando}
                    style={{ padding: '7px 16px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {calculando ? 'Calculando...' : 'Calcular Distribuição'}
                  </button>
                )}
              </div>

              {distribuicao.length === 0 ? (
                <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
                  Clique em "Calcular Distribuição" para apurar o valor por cooperado.
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8f7f4' }}>
                        {['Cooperado', 'CPF', '% Participação', 'Valor a Receber', 'Status', 'Ação'].map(h => (
                          <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e3dc' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {distribuicao.map((d: any, i: number) => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                          <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 600 }}>{d.cooperado?.nome || '—'}</td>
                          <td style={{ padding: '9px 14px', fontSize: 12, color: '#6b7280' }}>{d.cooperado?.cpf || '—'}</td>
                          <td style={{ padding: '9px 14px', fontSize: 13 }}>{Number(d.percentual).toFixed(4)}%</td>
                          <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, color: COR }}>
                            {Number(d.valor_sobras).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td style={{ padding: '9px 14px' }}>
                            <span style={{
                              fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 20,
                              background: d.status === 'pago' ? '#dcfce7' : d.status === 'retido' ? '#fef2f2' : '#fef9c3',
                              color: d.status === 'pago' ? '#166534' : d.status === 'retido' ? '#dc2626' : '#854d0e',
                            }}>
                              {d.status === 'pago' ? 'Pago' : d.status === 'retido' ? 'Retido' : 'Calculado'}
                            </span>
                          </td>
                          <td style={{ padding: '9px 14px' }}>
                            {d.status !== 'pago' && (
                              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => handleStatusDist(d.id, 'pago')}
                                  style={{ background: '#dcfce7', color: '#166534', border: '1px solid #86efac', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                                  Pago
                                </button>
                                <button onClick={() => handleStatusDist(d.id, 'retido')}
                                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>
                                  Reter
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr style={{ background: '#f0fdf9', fontWeight: 700 }}>
                        <td colSpan={3} style={{ padding: '10px 14px', fontSize: 13 }}>Total distribuído</td>
                        <td style={{ padding: '10px 14px', fontSize: 14, color: COR }}>
                          {distribuicao.reduce((s: number, d: any) => s + Number(d.valor_sobras), 0)
                            .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Modal de confirmação de fechamento */}
      {modalFechamento && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: '#92400e' }}>⚠ Confirmar Fechamento</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              Esta ação é irreversível. O exercício {ano} será encerrado com os seguintes valores:
            </p>
            {dados && (
              <div style={{ background: '#f8f7f4', borderRadius: 8, padding: 14, marginBottom: 20 }}>
                {[
                  [term.resultadoPositivo, fmt(dados.sobrasBrutas)],
                  ['Fundo de Reserva', fmt(dados.fundoReserva)],
                  ['REFAC', fmt(dados.refac)],
                  [term.distribuiResultado ? 'Sobras Distribuíveis' : 'Resultado do Exercício', fmt(dados.sobrasDistribuiveis || (dados.sobrasBrutas - dados.fundoReserva - dados.refac - dados.fates))],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 13 }}>
                    <span style={{ color: '#6b7280' }}>{k}</span>
                    <span style={{ fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Observações (opcional)</label>
              <textarea value={obsFechar} onChange={e => setObsFechar(e.target.value)} rows={3}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', resize: 'vertical' }}
                placeholder='Notas sobre o fechamento...' />
            </div>
            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 14, color: '#dc2626', fontSize: 12 }}>{erro}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setModalFechamento(false); setErro('') }}
                style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleFechar} disabled={fechando}
                style={{ padding: '9px 18px', background: '#92400e', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {fechando ? 'Encerrando...' : 'Confirmar Fechamento'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
