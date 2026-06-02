'use client'

import { useEffect, useState } from 'react'
import {
  getObrigacoes, getOcorrenciasMes, criarObrigacao,
  seedObrigacoesCooperativa, marcarObrigacaoEntregue,
} from '@/lib/contabil/actions'
import BotaoAjuda from '@/components/BotaoAjuda'

const COR = '#0F766E'
const MESES = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function CalendarioClient({ orgId }: { orgId: string }) {
  const hoje = new Date()
  const [mes, setMes]               = useState(hoje.getMonth() + 1)
  const [ano, setAno]               = useState(hoje.getFullYear())
  const [ocorrencias, setOcorrencias] = useState<any[]>([])
  const [obrigacoes, setObrigacoes] = useState<any[]>([])
  const [loading, setLoading]       = useState(false)
  const [seeding, setSeeding]       = useState(false)
  const [novaModal, setNovaModal]   = useState(false)
  const [sucesso, setSucesso]       = useState('')
  const [erro, setErro]             = useState('')

  const [nome, setNome]               = useState('')
  const [descricao, setDescricao]     = useState('')
  const [periodicidade, setPeriodicidade] = useState('mensal')
  const [diaVenc, setDiaVenc]         = useState('15')
  const [responsavel, setResponsavel] = useState('')
  const [salvando, setSalvando]       = useState(false)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getOcorrenciasMes(orgId, mes, ano),
      getObrigacoes(orgId),
    ]).then(([oc, ob]) => {
      setOcorrencias(oc)
      setObrigacoes(ob)
    }).finally(() => setLoading(false))
  }, [mes, ano, orgId])

  async function handleSeed() {
    setSeeding(true); setErro('')
    try {
      await seedObrigacoesCooperativa(orgId)
      const [oc, ob] = await Promise.all([getOcorrenciasMes(orgId, mes, ano), getObrigacoes(orgId)])
      setOcorrencias(oc); setObrigacoes(ob)
      setSucesso('Obrigacoes padrao carregadas!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e: any) { setErro(e.message) }
    finally { setSeeding(false) }
  }

  async function handleMarcarEntregue(ob: any) {
    try {
      await marcarObrigacaoEntregue(orgId, ob.obrigacao.id, ob.data_vencimento)
      const oc = await getOcorrenciasMes(orgId, mes, ano)
      setOcorrencias(oc)
      setSucesso('Obrigacao marcada como entregue!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e: any) { setErro(e.message) }
  }

  async function handleCriar() {
    if (!nome || !diaVenc) { setErro('Preencha nome e dia de vencimento.'); return }
    setSalvando(true); setErro('')
    try {
      await criarObrigacao({ org_id: orgId, nome, descricao, periodicidade, dia_vencimento: Number(diaVenc), responsavel })
      const [oc, ob] = await Promise.all([getOcorrenciasMes(orgId, mes, ano), getObrigacoes(orgId)])
      setOcorrencias(oc); setObrigacoes(ob)
      setSucesso('Obrigacao criada!')
      setTimeout(() => setSucesso(''), 3000)
      setNovaModal(false); setNome(''); setDescricao(''); setResponsavel('')
    } catch (e: any) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  const atrasadas = ocorrencias.filter(o => o.atrasada && !o.ocorrencia)
  const pendentes = ocorrencias.filter(o => !o.atrasada && !o.ocorrencia)
  const entregues = ocorrencias.filter(o => o.ocorrencia?.status === 'entregue')

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Calendario de Obrigacoes</h1>
            <BotaoAjuda chave="manual_contabil_url" />
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>
            Controle de vencimentos de obrigacoes acessorias
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={mes} onChange={e => setMes(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={ano} onChange={e => setAno(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
            {[ano - 1, ano, ano + 1].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <button onClick={() => setNovaModal(true)}
            style={{ padding: '8px 16px', background: '#fff', color: COR, border: `1px solid ${COR}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova
          </button>
          {obrigacoes.length === 0 && (
            <button onClick={handleSeed} disabled={seeding}
              style={{ padding: '8px 16px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {seeding ? 'Carregando...' : 'Carregar Padrao'}
            </button>
          )}
        </div>
      </div>

      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}
      {erro    && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{erro}</div>}

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Atrasadas', valor: atrasadas.length, cor: '#dc2626', bg: '#fef2f2' },
          { label: 'A vencer',  valor: pendentes.length, cor: '#f59e0b', bg: '#fffbeb' },
          { label: 'Entregues', valor: entregues.length, cor: COR,       bg: '#f0fdf9' },
        ].map(c => (
          <div key={c.label} style={{ background: c.bg, borderRadius: 10, border: `1px solid ${c.cor}30`, padding: '14px 18px' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{c.label}</p>
            <p style={{ margin: '2px 0 0', fontSize: 24, fontWeight: 700, color: c.cor }}>{c.valor}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <p style={{ color: '#6b7280' }}>Carregando...</p>
      ) : ocorrencias.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>
          <p style={{ fontSize: 14, marginBottom: 8 }}>Nenhuma obrigacao cadastrada.</p>
          <p style={{ fontSize: 12 }}>Clique em "Carregar Padrao" para adicionar obrigacoes comuns para cooperativas.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a2e' }}>
                {['Vencimento', 'Obrigacao', 'Responsavel', 'Periodicidade', 'Status', 'Acao'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#fff', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ocorrencias.map((oc: any, i: number) => {
                const entregue = oc.ocorrencia?.status === 'entregue'
                const atrasada = oc.atrasada && !entregue
                return (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6',
                    background: atrasada ? '#fff5f5' : entregue ? '#f0fdf9' : i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: atrasada ? '#dc2626' : '#1a1a2e' }}>
                      {new Date(oc.data_vencimento + 'T12:00:00').toLocaleDateString('pt-BR')}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>{oc.obrigacao.nome}</p>
                      {oc.obrigacao.descricao && <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{oc.obrigacao.descricao}</p>}
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>{oc.obrigacao.responsavel || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{oc.obrigacao.periodicidade}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                        background: entregue ? '#dcfce7' : atrasada ? '#fef2f2' : '#fef9c3',
                        color:      entregue ? '#166534' : atrasada ? '#dc2626' : '#854d0e' }}>
                        {entregue ? 'Entregue' : atrasada ? 'Atrasada' : 'Pendente'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {!entregue && (
                        <button onClick={() => handleMarcarEntregue(oc)}
                          style={{ background: COR, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          Marcar Entregue
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal nova obrigacao */}
      {novaModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 480, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Nova Obrigacao</h2>
            {([
              ['Nome *', nome, setNome, 'Ex: SPED ECD'],
              ['Descricao', descricao, setDescricao, 'Descricao opcional'],
              ['Responsavel', responsavel, setResponsavel, 'Ex: Contador'],
            ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, ph]) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Periodicidade</label>
                <select value={periodicidade} onChange={e => setPeriodicidade(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
                  {['mensal', 'trimestral', 'semestral', 'anual'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Dia de Vencimento</label>
                <input type="number" min="1" max="31" value={diaVenc} onChange={e => setDiaVenc(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
              </div>
            </div>
            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 14, color: '#dc2626', fontSize: 12 }}>{erro}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setNovaModal(false); setErro('') }}
                style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleCriar} disabled={salvando}
                style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : 'Criar Obrigacao'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
