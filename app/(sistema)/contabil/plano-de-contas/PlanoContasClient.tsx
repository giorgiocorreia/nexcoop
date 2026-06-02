'use client'

import { useEffect, useState } from 'react'
import { getPlanoContas, seedPlanoContasOrg } from '@/lib/contabil/actions'
import { ContaContabil, TipoOrg } from '@/lib/contabil/types'

const COR = '#0F766E'
const TIPOS_LABEL: Record<string, string> = {
  ATIVO: 'Ativo', PASSIVO: 'Passivo', PATRIMONIO_LIQUIDO: 'Patrimônio Líquido',
  RECEITA: 'Receita', DESPESA: 'Despesa',
}

function ContaRow({ conta, depth = 0 }: { conta: ContaContabil; depth?: number }) {
  const [aberto, setAberto] = useState(depth < 2)
  const temFilhos = conta.filhos && conta.filhos.length > 0
  return (
    <>
      <tr style={{ backgroundColor: depth === 0 ? '#f0fdf9' : depth === 1 ? '#f8f7f4' : '#fff' }}>
        <td style={{ padding: '8px 12px', paddingLeft: `${12 + depth * 20}px`, fontWeight: depth < 2 ? 700 : 400, fontSize: 13 }}>
          {temFilhos && (
            <button onClick={() => setAberto(!aberto)}
              style={{ marginRight: 6, background: 'none', border: 'none', cursor: 'pointer', color: COR, fontWeight: 700 }}>
              {aberto ? '▼' : '▶'}
            </button>
          )}
          {conta.codigo}
        </td>
        <td style={{ padding: '8px 12px', fontSize: 13, fontWeight: depth < 2 ? 600 : 400 }}>{conta.nome}</td>
        <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{TIPOS_LABEL[conta.tipo]}</td>
        <td style={{ padding: '8px 12px', fontSize: 12, color: '#6b7280' }}>{conta.natureza}</td>
        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
          {conta.aceita_lancamento && (
            <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>Sim</span>
          )}
        </td>
      </tr>
      {aberto && temFilhos && conta.filhos!.map(f => <ContaRow key={f.id} conta={f} depth={depth + 1} />)}
    </>
  )
}

interface Props { orgId: string; tipoOrg: TipoOrg }

export default function PlanoContasClient({ orgId, tipoOrg }: Props) {
  const [contas, setContas] = useState<ContaContabil[]>([])
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    getPlanoContas(orgId).then(setContas).finally(() => setLoading(false))
  }, [orgId])

  async function handleSeed() {
    setSeeding(true); setErro('')
    try {
      await seedPlanoContasOrg(orgId, tipoOrg)
      const novo = await getPlanoContas(orgId)
      setContas(novo)
      setSucesso('Plano de contas padrão carregado com sucesso!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e: any) { setErro(e.message) }
    finally { setSeeding(false) }
  }

  return (
    <div style={{ padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Plano de Contas</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Estrutura contábil hierárquica da organização</p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          {contas.length === 0 && (
            <button onClick={handleSeed} disabled={seeding}
              style={{ background: COR, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {seeding ? 'Carregando...' : tipoOrg === 'cooperativa' ? '+ Carregar Plano Padrão Cooperativa' : '+ Carregar Plano Padrão Associação'}
            </button>
          )}
          <button style={{ background: '#fff', color: COR, border: `1px solid ${COR}`, borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Nova Conta
          </button>
        </div>
      </div>

      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}
      {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{erro}</div>}

      {loading ? (
        <p style={{ color: '#6b7280', fontSize: 13 }}>Carregando...</p>
      ) : contas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc' }}>
          <p style={{ fontSize: 15, color: '#6b7280', marginBottom: 8 }}>Nenhuma conta cadastrada.</p>
          <p style={{ fontSize: 13, color: '#9ca3af' }}>Clique em "Carregar Plano Padrão {tipoOrg === 'cooperativa' ? 'Cooperativa' : 'Associação'}" para começar.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a2e' }}>
                {['Código', 'Nome', 'Tipo', 'Natureza', 'Lançamento'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#fff' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contas.map(c => <ContaRow key={c.id} conta={c} />)}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
