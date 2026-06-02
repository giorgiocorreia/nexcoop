'use client'

import { useEffect, useState } from 'react'
import {
  getPlanoContas, getContadoresDaOrg, getPlanoContasExterno,
  getDePara, salvarDePara, removerDePara, getEscritorioDoContador,
} from '@/lib/contabil/actions'
import BotaoAjuda from '@/components/BotaoAjuda'

const COR = '#0F766E'

interface Props { orgId: string; userId: string }

export default function DeParaClient({ orgId, userId }: Props) {
  const [contadores, setContadores] = useState<any[]>([])
  const [contadorSel, setContadorSel] = useState<any>(null)
  const [contasInternas, setContasInternas] = useState<any[]>([])
  const [contasExternas, setContasExternas] = useState<any[]>([])
  const [depara, setDepara] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [internaId, setInternaId] = useState('')
  const [externaId, setExternaId] = useState('')
  const [salvandoDP, setSalvandoDP] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    getContadoresDaOrg(orgId).then(data => {
      const ativos = data.filter((c: any) => c.ativo)
      setContadores(ativos)
      if (ativos.length > 0) setContadorSel(ativos[0])
    })
    getPlanoContas(orgId).then(tree => {
      const flat: any[] = []
      function flatten(contas: any[]) {
        contas.forEach(c => { if (c.aceita_lancamento) flat.push(c); if (c.filhos) flatten(c.filhos) })
      }
      flatten(tree)
      setContasInternas(flat)
    })
  }, [orgId])

  useEffect(() => {
    if (!contadorSel) return
    setLoading(true)
    getEscritorioDoContador(contadorSel.usuario_id).then(async esc => {
      if (!esc) { setContasExternas([]); return }
      const ext = await getPlanoContasExterno(esc.id)
      setContasExternas(ext)
    })
    getDePara(orgId, contadorSel.id).then(setDepara).finally(() => setLoading(false))
  }, [contadorSel, orgId])

  async function handleSalvarDePara() {
    if (!internaId || !externaId) { setErro('Selecione as duas contas.'); return }
    setSalvandoDP(true); setErro('')
    try {
      await salvarDePara({ org_id: orgId, contador_org_id: contadorSel.id, conta_interna_id: internaId, conta_externa_id: externaId })
      const dp = await getDePara(orgId, contadorSel.id)
      setDepara(dp)
      setSucesso('Mapeamento salvo!')
      setTimeout(() => setSucesso(''), 3000)
      setInternaId(''); setExternaId('')
    } catch (e: any) { setErro(e.message) }
    finally { setSalvandoDP(false) }
  }

  async function handleRemover(id: string) {
    await removerDePara(id)
    setDepara(dp => dp.filter((d: any) => d.id !== id))
  }

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>De/Para — Plano de Contas</h1>
        <BotaoAjuda chave="manual_contabil_url" />
      </div>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Mapeie as contas do NexCoop para as contas do escritório de contabilidade.</p>

      {contadores.length > 1 && (
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Contador</label>
          <select onChange={e => setContadorSel(contadores.find((c: any) => c.id === e.target.value))}
            style={{ padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, minWidth: 280 }}>
            {contadores.map((c: any) => <option key={c.id} value={c.id}>{c.usuarios?.nome || c.usuarios?.email}</option>)}
          </select>
        </div>
      )}

      {contasExternas.length === 0 && !loading && (
        <div style={{ background: '#fffbeb', border: '1px solid #f59e0b', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#92400e' }}>
          ⚠️ O contador vinculado ainda não cadastrou o plano de contas do escritório.
        </div>
      )}

      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}
      {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{erro}</div>}

      {contasExternas.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 20, marginBottom: 28 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Novo Mapeamento</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: 10, alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>CONTA NEXCOOP (DE)</label>
              <select value={internaId} onChange={e => setInternaId(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
                <option value=''>Selecione...</option>
                {contasInternas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
              </select>
            </div>
            <div style={{ fontSize: 20, color: COR, fontWeight: 700, paddingBottom: 2 }}>→</div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', display: 'block', marginBottom: 4 }}>CONTA DO ESCRITÓRIO (PARA)</label>
              <select value={externaId} onChange={e => setExternaId(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
                <option value=''>Selecione...</option>
                {contasExternas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
              </select>
            </div>
            <button onClick={handleSalvarDePara} disabled={salvandoDP}
              style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {salvandoDP ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {loading ? <p style={{ color: '#6b7280', fontSize: 13 }}>Carregando...</p> : depara.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280', fontSize: 14 }}>Nenhum mapeamento cadastrado ainda.</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a2e' }}>
                {['Conta NexCoop (DE)', '', 'Conta Escritório (PARA)', 'Ação'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#fff', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {depara.map((dp: any, i: number) => (
                <tr key={dp.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}><span style={{ fontWeight: 700, color: '#635BFF' }}>{dp.conta_interna?.codigo}</span>{' — '}{dp.conta_interna?.nome}</td>
                  <td style={{ padding: '10px 14px', fontSize: 18, color: COR, fontWeight: 700, textAlign: 'center' }}>→</td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}><span style={{ fontWeight: 700, color: COR }}>{dp.conta_externa?.codigo}</span>{' — '}{dp.conta_externa?.nome}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <button onClick={() => handleRemover(dp.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer' }}>Remover</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
