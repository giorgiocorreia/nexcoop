'use client'

import { useEffect, useState } from 'react'
import { getLancamentosPendentes, getPlanoContas, classificarLancamento } from '@/lib/contabil/actions'
import { ContaContabil } from '@/lib/contabil/types'
import BotaoAjuda from '@/components/BotaoAjuda'
import { PageLayout, COM_C, MODULO_CONTABIL } from '@/components/nexcoop/ui'

function formatValor(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

interface Props { orgId: string; userId: string }

export default function EscrituracaoClient({ orgId, userId }: Props) {
  const [aba, setAba] = useState<'pendentes' | 'classificados'>('pendentes')
  const [pendentes, setPendentes] = useState<any[]>([])
  const [classificados, setClassificados] = useState<any[]>([])
  const [contas, setContas] = useState<any[]>([])
  const [modal, setModal] = useState<any | null>(null)
  const [debitoId, setDebitoId] = useState('')
  const [creditoId, setCreditoId] = useState('')
  const [historico, setHistorico] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    getLancamentosPendentes(orgId).then(({ pendentes, classificados }) => {
      setPendentes(pendentes)
      setClassificados(classificados)
    })
    getPlanoContas(orgId).then(tree => {
      const flat: any[] = []
      function flatten(contas: ContaContabil[]) {
        contas.forEach(c => { if (c.aceita_lancamento) flat.push(c); if (c.filhos) flatten(c.filhos) })
      }
      flatten(tree)
      setContas(flat)
    })
  }, [orgId])

  async function handleClassificar() {
    if (!debitoId || !creditoId) { setErro('Selecione débito e crédito.'); return }
    setSalvando(true); setErro('')
    try {
      await classificarLancamento({
        org_id: orgId,
        lancamento_id: modal.id,
        conta_debito_id: debitoId,
        conta_credito_id: creditoId,
        valor: modal.valor,
        historico,
        classificado_por: userId,
      })
      setPendentes(p => p.filter(l => l.id !== modal.id))
      setClassificados(c => [modal, ...c])
      setSucesso('Lançamento classificado!')
      setTimeout(() => setSucesso(''), 3000)
      setModal(null); setDebitoId(''); setCreditoId(''); setHistorico('')
    } catch (e: any) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  const lista = aba === 'pendentes' ? pendentes : classificados

  return (
    <PageLayout
      titulo="Escrituração"
      subtitulo="Classifique os lançamentos financeiros nas contas contábeis correspondentes. Lançamentos com regra reconhecida (mensalidade, venda loja, cota, etc.) são classificados automaticamente."
      icone="ti-book-2"
      modulo={MODULO_CONTABIL}
      breadcrumb={[{ label: 'Escrituração' }]}
      acoes={<BotaoAjuda chave="manual_contabil_url" />}
    >
      <div style={{ background: '#f0fdf9', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 24, fontSize: 12, color: '#166534' }}>
        Histórico com prefixo <strong>[Auto]</strong> indica classificação automática. Revise na aba Classificados — o De/Para mapeia contas internas para o plano do escritório na exportação SPED.
      </div>

      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}

      <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '2px solid #e5e3dc' }}>
        {([['pendentes', `Pendentes (${pendentes.length})`], ['classificados', `Classificados (${classificados.length})`]] as const).map(([k, l]) => (
          <button key={k} onClick={() => setAba(k)}
            style={{ padding: '10px 20px', border: 'none', background: 'none', fontWeight: aba === k ? 700 : 400, color: aba === k ? COM_C.verde : '#6b7280', borderBottom: aba === k ? `2px solid ${COM_C.verde}` : 'none', marginBottom: -2, cursor: 'pointer', fontSize: 13 }}>
            {l}
          </button>
        ))}
      </div>

      {lista.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc' }}>
          <p style={{ color: '#6b7280', fontSize: 14 }}>{aba === 'pendentes' ? 'Nenhum lançamento pendente.' : 'Nenhum lançamento classificado ainda.'}</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a2e' }}>
                {['Data', 'Descrição', 'Categoria', 'Valor', aba === 'pendentes' ? 'Ação' : 'Status'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#fff', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lista.map((l: any, i: number) => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{new Date(l.data).toLocaleDateString('pt-BR')}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13 }}>{l.descricao}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>{l.categoria || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: l.tipo === 'receita' ? '#166534' : '#dc2626' }}>
                    {l.tipo === 'despesa' ? '- ' : '+ '}{formatValor(l.valor)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {aba === 'pendentes' ? (
                      <button onClick={() => { setModal(l); setErro('') }}
                        style={{ background: COM_C.verde, color: '#fff', border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        Classificar
                      </button>
                    ) : (
                      <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 4, padding: '2px 8px', fontSize: 11 }}>Classificado</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 520, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Classificar Lançamento</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>{modal.descricao} · {formatValor(modal.valor)}</p>
            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 14, color: '#dc2626', fontSize: 12 }}>{erro}</div>}
            {[['Conta a Débito', debitoId, setDebitoId], ['Conta a Crédito', creditoId, setCreditoId]].map(([label, val, setter]: any) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                <select value={val} onChange={e => setter(e.target.value)} style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
                  <option value=''>Selecione a conta...</option>
                  {contas.map((c: any) => <option key={c.id} value={c.id}>{c.codigo} — {c.nome}</option>)}
                </select>
              </div>
            ))}
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Histórico (opcional)</label>
              <input value={historico} onChange={e => setHistorico(e.target.value)}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
                placeholder='Descrição do lançamento contábil...' />
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(null); setErro('') }} style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleClassificar} disabled={salvando}
                style={{ padding: '9px 18px', background: COM_C.verde, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {salvando ? 'Salvando...' : 'Confirmar Classificação'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
