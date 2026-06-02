'use client'

import { useEffect, useState, useRef } from 'react'
import { getNFesImportadas, importarXMLNFe, ignorarNFe } from '@/lib/contabil/actions'
import BotaoAjuda from '@/components/BotaoAjuda'

const COR = '#0F766E'
function fmt(v: number) { return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) }
const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  importada: { label: 'Importada', bg: '#fef9c3', color: '#854d0e' },
  vinculada: { label: 'Vinculada', bg: '#dcfce7', color: '#166534' },
  ignorada: { label: 'Ignorada', bg: '#f3f4f6', color: '#6b7280' },
}

interface Props { orgId: string; userId: string }

export default function NFeClient({ orgId, userId }: Props) {
  const [nfes, setNfes] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [importando, setImportando] = useState(false)
  const [sucesso, setSucesso] = useState('')
  const [detalhe, setDetalhe] = useState<any | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    getNFesImportadas(orgId).then(setNfes).finally(() => setLoading(false))
  }, [orgId])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files || files.length === 0) return
    setImportando(true)
    let ok = 0; let fail = 0
    for (const file of Array.from(files)) {
      try { const xml = await file.text(); await importarXMLNFe(orgId, xml, userId); ok++ }
      catch (err: any) { fail++; console.error(err.message) }
    }
    const novas = await getNFesImportadas(orgId)
    setNfes(novas)
    setSucesso(`${ok} NF-e(s) importada(s).${fail > 0 ? ` ${fail} com erro.` : ''}`)
    setTimeout(() => setSucesso(''), 4000)
    setImportando(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleIgnorar(id: string) {
    await ignorarNFe(id)
    setNfes(n => n.map(x => x.id === id ? { ...x, status: 'ignorada' } : x))
  }

  return (
    <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>NF-e — Notas Fiscais</h1>
            <BotaoAjuda chave="manual_contabil_url" />
          </div>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Importe XMLs para registrar entradas e saídas automaticamente</p>
        </div>
        <div>
          <input ref={fileRef} type='file' accept='.xml' multiple onChange={handleUpload} style={{ display: 'none' }} id='upload-xml' />
          <label htmlFor='upload-xml' style={{ background: COR, color: '#fff', borderRadius: 8, padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'inline-block' }}>
            {importando ? 'Importando...' : '+ Importar XML(s)'}
          </label>
        </div>
      </div>

      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total importadas', valor: nfes.length, cor: '#635BFF' },
          { label: 'Pendentes', valor: nfes.filter(n => n.status === 'importada').length, cor: '#f59e0b' },
          { label: 'Vinculadas', valor: nfes.filter(n => n.status === 'vinculada').length, cor: COR },
        ].map(card => (
          <div key={card.label} style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: '16px 20px' }}>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{card.label}</p>
            <p style={{ margin: '4px 0 0', fontSize: 24, fontWeight: 700, color: card.cor }}>{card.valor}</p>
          </div>
        ))}
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>Carregando...</p> : nfes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc' }}>
          <p style={{ color: '#6b7280', fontSize: 14 }}>Nenhuma NF-e importada ainda.</p>
          <p style={{ color: '#9ca3af', fontSize: 13 }}>Clique em "Importar XML(s)" — aceita múltiplos arquivos de uma vez.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a2e' }}>
                {['Tipo','Data','Emitente','Número','Valor','Status','Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 12, color: '#fff', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nfes.map((nfe: any, i: number) => {
                const st = STATUS_LABEL[nfe.status]
                return (
                  <tr key={nfe.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: nfe.tipo === 'entrada' ? '#dbeafe' : '#fce7f3', color: nfe.tipo === 'entrada' ? '#1d4ed8' : '#9d174d' }}>
                        {nfe.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>{new Date(nfe.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13 }}>
                      <p style={{ margin: 0, fontWeight: 600 }}>{nfe.nome_emitente || '—'}</p>
                      <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{nfe.cnpj_emitente}</p>
                    </td>
                    <td style={{ padding: '10px 14px', fontSize: 13, color: '#6b7280' }}>{nfe.numero || '—'}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600 }}>{fmt(nfe.valor_total)}</td>
                    <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 4, background: st.bg, color: st.color }}>{st.label}</span></td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setDetalhe(nfe)} style={{ background: '#f8f7f4', color: '#374151', border: '1px solid #e5e3dc', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Ver</button>
                        {nfe.status === 'importada' && (
                          <button onClick={() => handleIgnorar(nfe.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 6, padding: '4px 10px', fontSize: 11, cursor: 'pointer' }}>Ignorar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {detalhe && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 640, maxWidth: '95vw', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>NF-e {detalhe.numero}</h2>
              <button onClick={() => setDetalhe(null)} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#6b7280' }}>✕</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
              {[['Emitente', detalhe.nome_emitente],['CNPJ Emitente', detalhe.cnpj_emitente],['Destinatário', detalhe.nome_destinatario],['Data', new Date(detalhe.data_emissao + 'T12:00:00').toLocaleDateString('pt-BR')],['Total', fmt(detalhe.valor_total)],['ICMS', fmt(detalhe.valor_icms)],['PIS', fmt(detalhe.valor_pis)],['COFINS', fmt(detalhe.valor_cofins)]].map(([k, v]) => (
                <div key={k as string} style={{ background: '#f8f7f4', borderRadius: 8, padding: '10px 12px' }}>
                  <p style={{ margin: 0, fontSize: 11, color: '#6b7280' }}>{k}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600 }}>{v || '—'}</p>
                </div>
              ))}
            </div>
            {detalhe.itens?.length > 0 && (
              <>
                <h3 style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Itens ({detalhe.itens.length})</h3>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: '#f8f7f4' }}>{['Descrição','CFOP','Qtd','Unit.','Total'].map(h => <th key={h} style={{ padding: '7px 10px', textAlign: 'left', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e5e3dc' }}>{h}</th>)}</tr></thead>
                  <tbody>
                    {detalhe.itens.map((item: any) => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '7px 10px' }}>{item.descricao}</td>
                        <td style={{ padding: '7px 10px', color: '#6b7280' }}>{item.cfop || '—'}</td>
                        <td style={{ padding: '7px 10px' }}>{item.quantidade}</td>
                        <td style={{ padding: '7px 10px' }}>{item.valor_unitario ? fmt(item.valor_unitario) : '—'}</td>
                        <td style={{ padding: '7px 10px', fontWeight: 600 }}>{fmt(item.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
