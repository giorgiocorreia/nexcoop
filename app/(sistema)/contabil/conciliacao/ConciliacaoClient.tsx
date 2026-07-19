'use client'

import { useEffect, useState, useRef } from 'react'
import {
  getExtratos, importarExtratoCSV, getItensConciliacao,
  getLancamentosParaConciliar, conciliarItem, ignorarItemExtrato,
} from '@/lib/contabil/actions'
import BotaoAjuda from '@/components/BotaoAjuda'
import { PageLayout, COM_C, MODULO_CONTABIL } from '@/components/nexcoop/ui'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

const STATUS_ITEM = {
  pendente:   { label: 'Pendente',   bg: '#fef9c3', color: '#854d0e' },
  conciliado: { label: 'Conciliado', bg: '#dcfce7', color: '#166534' },
  ignorado:   { label: 'Ignorado',   bg: '#f3f4f6', color: '#6b7280' },
}

export default function ConciliacaoClient({ orgId, userId }: { orgId: string; userId: string }) {
  const [extratos, setExtratos]       = useState<any[]>([])
  const [extratoSel, setExtratoSel]   = useState<any>(null)
  const [itens, setItens]             = useState<any[]>([])
  const [lancamentos, setLancamentos] = useState<any[]>([])
  const [itemModal, setItemModal]     = useState<any>(null)
  const [banco, setBanco]             = useState('Banco do Brasil')
  const [importando, setImportando]   = useState(false)
  const [erro, setErro]               = useState('')
  const [sucesso, setSucesso]         = useState('')
  const [aba, setAba]                 = useState<'pendente' | 'conciliado' | 'ignorado'>('pendente')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getExtratos(orgId).then(setExtratos)
  }, [orgId])

  useEffect(() => {
    if (!extratoSel) return
    getItensConciliacao(extratoSel.id).then(setItens)
    getLancamentosParaConciliar(orgId, extratoSel.data_inicio, extratoSel.data_fim).then(setLancamentos)
  }, [extratoSel, orgId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImportando(true); setErro('')
    try {
      const csv = await file.text()
      const extrato = await importarExtratoCSV(orgId, csv, banco, userId)
      const novos = await getExtratos(orgId)
      setExtratos(novos)
      setExtratoSel(extrato)
      setSucesso('Extrato importado com sucesso!')
      setTimeout(() => setSucesso(''), 3000)
    } catch (e: any) { setErro(e.message) }
    finally { setImportando(false); if (fileRef.current) fileRef.current.value = '' }
  }

  async function handleConciliar(lancamentoId: string) {
    await conciliarItem(itemModal.id, lancamentoId)
    const novos = await getItensConciliacao(extratoSel.id)
    setItens(novos)
    setItemModal(null)
    setSucesso('Item conciliado!')
    setTimeout(() => setSucesso(''), 3000)
  }

  async function handleIgnorar(itemId: string) {
    await ignorarItemExtrato(itemId)
    const novos = await getItensConciliacao(extratoSel.id)
    setItens(novos)
  }

  const itensFiltrados = itens.filter(i => i.status === aba)
  const pendentes   = itens.filter(i => i.status === 'pendente').length
  const conciliados = itens.filter(i => i.status === 'conciliado').length

  return (
    <PageLayout
      titulo="Conciliação Bancária"
      subtitulo="Compare o extrato bancário com os lançamentos registrados"
      icone="ti-arrows-exchange"
      modulo={MODULO_CONTABIL}
      breadcrumb={[{ label: 'Conciliação Bancária' }]}
      acoes={<BotaoAjuda chave="manual_contabil_url" />}
    >
      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}
      {erro    && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#dc2626', fontSize: 13 }}>{erro}</div>}

      {/* Importar extrato */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 20, marginBottom: 24 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Importar Extrato CSV</h2>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Banco</label>
            <input
              value={banco}
              onChange={e => setBanco(e.target.value)}
              placeholder="Nome do banco"
              style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }}
            />
          </div>
          <div>
            <input ref={fileRef} type="file" accept=".csv,.txt" onChange={handleUpload} style={{ display: 'none' }} id="upload-csv" />
            <label htmlFor="upload-csv" style={{ display: 'inline-block', padding: '9px 18px', background: COM_C.verde, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              {importando ? 'Importando...' : '+ Importar CSV'}
            </label>
          </div>
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>
          Formatos: data,descricao,valor ou data,descricao,debito,credito. Data em DD/MM/YYYY ou YYYY-MM-DD.
        </p>
      </div>

      {/* Lista de extratos */}
      {extratos.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Extratos Importados</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {extratos.map(ex => (
              <div
                key={ex.id}
                onClick={() => setExtratoSel(ex)}
                style={{
                  background: extratoSel?.id === ex.id ? '#f0fdf9' : '#fff',
                  border: `1px solid ${extratoSel?.id === ex.id ? COM_C.verde : '#e5e3dc'}`,
                  borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{ex.banco}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                    {new Date(ex.data_inicio + 'T12:00:00').toLocaleDateString('pt-BR')} a{' '}
                    {new Date(ex.data_fim + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ margin: 0, fontSize: 12, color: '#166534' }}>+ {fmt(ex.total_creditos)}</p>
                  <p style={{ margin: 0, fontSize: 12, color: '#dc2626' }}>- {fmt(ex.total_debitos)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Itens do extrato selecionado */}
      {extratoSel && (
        <>
          <div className="com-kpi-grid-3" style={{ gap: 12, marginBottom: 20 }}>
            {[
              { label: 'Pendentes',    valor: pendentes,   cor: '#f59e0b' },
              { label: 'Conciliados',  valor: conciliados, cor: COM_C.verde },
              { label: 'Total itens',  valor: itens.length, cor: '#635BFF' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', borderRadius: 10, border: '1px solid #e5e3dc', padding: '12px 16px' }}>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{c.label}</p>
                <p style={{ margin: '2px 0 0', fontSize: 22, fontWeight: 700, color: c.cor }}>{c.valor}</p>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '2px solid #e5e3dc' }}>
            {(['pendente', 'conciliado', 'ignorado'] as const).map(a => (
              <button key={a} onClick={() => setAba(a)}
                style={{ padding: '10px 20px', border: 'none', background: 'none',
                  fontWeight: aba === a ? 700 : 400, color: aba === a ? COM_C.verde : '#6b7280',
                  borderBottom: aba === a ? `2px solid ${COM_C.verde}` : 'none', marginBottom: -2,
                  cursor: 'pointer', fontSize: 13, textTransform: 'capitalize' }}>
                {a.charAt(0).toUpperCase() + a.slice(1)} ({itens.filter(i => i.status === a).length})
              </button>
            ))}
          </div>

          {itensFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>
              Nenhum item {aba}.
            </div>
          ) : (
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#1a1a2e' }}>
                    {['Data', 'Descricao', 'Tipo', 'Valor', 'Status', 'Acao'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#fff', fontWeight: 600 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itensFiltrados.map((item: any, i: number) => {
                    const st = STATUS_ITEM[item.status as keyof typeof STATUS_ITEM]
                    return (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>
                          {new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13 }}>{item.descricao}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4,
                            background: item.tipo === 'credito' ? '#dcfce7' : '#fef2f2',
                            color: item.tipo === 'credito' ? '#166534' : '#dc2626' }}>
                            {item.tipo === 'credito' ? 'Credito' : 'Debito'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600,
                          color: item.tipo === 'credito' ? '#166534' : '#dc2626' }}>
                          {item.tipo === 'debito' ? '- ' : '+ '}{fmt(item.valor)}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {item.status === 'pendente' && (
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => setItemModal(item)}
                                style={{ background: COM_C.verde, color: '#fff', border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                Conciliar
                              </button>
                              <button onClick={() => handleIgnorar(item.id)}
                                style={{ background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e3dc', borderRadius: 6, padding: '5px 10px', fontSize: 11, cursor: 'pointer' }}>
                                Ignorar
                              </button>
                            </div>
                          )}
                          {item.status === 'conciliado' && item.lancamento && (
                            <span style={{ fontSize: 11, color: '#6b7280' }}>{item.lancamento.descricao}</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Modal de conciliação */}
      {itemModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 560, maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 4 }}>Conciliar Item</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 20 }}>
              {itemModal.descricao} · {fmt(itemModal.valor)} · {new Date(itemModal.data + 'T12:00:00').toLocaleDateString('pt-BR')}
            </p>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Selecione o lancamento correspondente:</p>
            {lancamentos.length === 0 ? (
              <p style={{ color: '#6b7280', fontSize: 13 }}>Nenhum lancamento encontrado no periodo do extrato.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
                {lancamentos.map((l: any) => (
                  <div
                    key={l.id}
                    onClick={() => handleConciliar(l.id)}
                    style={{ padding: '10px 14px', border: '1px solid #e5e3dc', borderRadius: 8, cursor: 'pointer',
                      display: 'flex', justifyContent: 'space-between', background: '#f8f7f4' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = COM_C.verde)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e5e3dc')}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{l.descricao}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>
                        {new Date((l.data_competencia || l.data) + 'T12:00:00').toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: l.tipo === 'receita' ? '#166534' : '#dc2626' }}>
                      {fmt(l.valor)}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div style={{ marginTop: 20, textAlign: 'right' }}>
              <button onClick={() => setItemModal(null)}
                style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </PageLayout>
  )
}
