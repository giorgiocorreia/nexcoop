'use client'

import { useState } from 'react'
import { fmt } from '@/lib/fmt'
import { cancelarNfe } from './actions'

type NfeSaida = {
  id: string
  chave_nfe: string | null
  numero_nfe: string | null
  serie_nfe: string | null
  status_nfe: string | null
  xml_nfe: string | null
  data_emissao_nfe: string | null
  quantidade_kg: number
  preco_kg: number
  valor_bruto: number
  compradores: { id: string; nome: string; cnpj: string } | null
  lotes: { codigo: string; produto_descricao: string | null; safras: { ano: number } | null } | null
}

type Kpis = {
  total: number
  autorizadas: number
  canceladas: number
  processando: number
  valorTotal: number
}

const STATUS_LABEL: Record<string, { label: string; cor: string }> = {
  autorizada:  { label: 'Autorizada',  cor: '#15803d' },
  processando: { label: 'Processando', cor: '#b45309' },
  cancelada:   { label: 'Cancelada',   cor: '#dc2626' },
  erro:        { label: 'Erro',        cor: '#9a3412' },
}

export default function FiscalNfeClient({ nfes, kpis }: { nfes: NfeSaida[]; kpis: Kpis; usuario: any }) {
  const [filtroStatus, setFiltroStatus] = useState('')
  const [busca, setBusca] = useState('')
  const [modalCancelar, setModalCancelar] = useState<NfeSaida | null>(null)
  const [justificativa, setJustificativa] = useState('')
  const [carregando, setCarregando] = useState(false)
  const [mensagem, setMensagem] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)
  const [lista, setLista] = useState(nfes)
  const [erroModal, setErroModal] = useState<string | null>(null)

  const filtradas = lista.filter(n => {
    const matchStatus = !filtroStatus || n.status_nfe === filtroStatus
    const matchBusca = !busca ||
      n.compradores?.nome.toLowerCase().includes(busca.toLowerCase()) ||
      n.numero_nfe?.includes(busca) ||
      n.chave_nfe?.includes(busca) ||
      n.lotes?.codigo.toLowerCase().includes(busca.toLowerCase())
    return matchStatus && matchBusca
  })

  async function handleCancelar() {
    if (!modalCancelar?.chave_nfe) return
    setCarregando(true)
    const res = await cancelarNfe(modalCancelar.chave_nfe, justificativa)
    setCarregando(false)
    if (res.sucesso) {
      setErroModal(null)
      setLista(l => l.map(n => n.chave_nfe === modalCancelar.chave_nfe ? { ...n, status_nfe: 'cancelada' } : n))
      setMensagem({ tipo: 'ok', texto: 'NF-e cancelada com sucesso.' })
      setModalCancelar(null)
      setJustificativa('')
    } else {
      setErroModal(res.erro ?? 'Erro ao cancelar')
    }
  }

  return (
    <div style={{ padding: '2rem', background: '#f8f7f4', minHeight: '100vh' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>

        <div style={{ marginBottom: '1.5rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>NF-e Saída</h1>
          <p style={{ color: '#6b7280', fontSize: 13, marginTop: 4 }}>Notas fiscais emitidas na comercialização</p>
        </div>

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

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
          {[
            { label: 'TOTAL EMITIDAS',    valor: String(kpis.total) },
            { label: 'AUTORIZADAS',       valor: String(kpis.autorizadas) },
            { label: 'CANCELADAS',        valor: String(kpis.canceladas) },
            { label: 'VALOR AUTORIZADO',  valor: fmt.moeda(Number(kpis.valorTotal)) },
          ].map(k => (
            <div key={k.label} style={{ background: '#E6F1FB', borderRadius: 12, padding: '1rem' }}>
              <div style={{ fontSize: 11, fontWeight: 500, color: '#185FA5', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{k.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#042C53', marginTop: 4 }}>{k.valor}</div>
            </div>
          ))}
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem' }}>
          <input
            placeholder="Buscar comprador, nº NF-e, chave, lote..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 13, background: 'white' }}
          />
          <select
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 13, background: 'white', color: '#374151' }}
          >
            <option value="">Todos os status</option>
            <option value="autorizada">Autorizada</option>
            <option value="processando">Processando</option>
            <option value="cancelada">Cancelada</option>
            <option value="erro">Erro</option>
          </select>
        </div>

        {/* Tabela */}
        <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f8f7f4', borderBottom: '1px solid #e5e3dc' }}>
                {['Nº / Série', 'Comprador', 'Lote / Safra', 'Valor', 'Emissão', 'Status', 'Ações'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, color: '#374151', fontSize: 12 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>Nenhuma NF-e encontrada</td></tr>
              )}
              {filtradas.map(nfe => {
                const st = STATUS_LABEL[nfe.status_nfe ?? ''] ?? { label: nfe.status_nfe ?? '—', cor: '#6b7280' }
                return (
                  <tr key={nfe.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#374151' }}>
                      {nfe.numero_nfe ? `${nfe.numero_nfe}/${nfe.serie_nfe}` : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 500, color: '#1a1a2e' }}>{nfe.compradores?.nome ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{nfe.compradores?.cnpj ?? ''}</div>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ color: '#374151' }}>{nfe.lotes?.codigo ?? '—'}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>
                        {nfe.lotes?.produto_descricao ?? 'Multi-produto'}{(nfe.lotes as any)?.safras?.ano ? ` · Safra ${(nfe.lotes as any).safras.ano}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1a1a2e' }}>{fmt.moeda(Number(nfe.valor_bruto))}</td>
                    <td style={{ padding: '10px 14px', color: '#6b7280' }}>
                      {nfe.data_emissao_nfe ? new Date(nfe.data_emissao_nfe).toLocaleDateString('pt-BR') : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                        background: st.cor + '18', color: st.cor,
                      }}>{st.label}</span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {nfe.xml_nfe && (
                          <a href={nfe.xml_nfe} target="_blank" rel="noopener noreferrer" style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', textDecoration: 'none',
                          }}>XML</a>
                        )}
                        {nfe.chave_nfe && nfe.status_nfe === 'autorizada' && (
                          <a
                            href={`${nfe.xml_nfe ? nfe.xml_nfe.replace('/XMLs/', '/DANFEs/').replace('-nfe.xml', '-nfe.pdf') : ''}`}
                            target="_blank" rel="noopener noreferrer"
                            style={{
                              padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', textDecoration: 'none',
                            }}>DANFE</a>
                        )}
                        {nfe.status_nfe === 'autorizada' && (
                          <button onClick={() => setModalCancelar(nfe)} style={{
                            padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                            background: '#fff1f2', color: '#dc2626', border: '1px solid #fecaca', cursor: 'pointer',
                          }}>Cancelar</button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Cancelar */}
      {modalCancelar && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', width: 460, border: '1px solid #e5e3dc' }}>
            <h3 style={{ margin: '0 0 0.5rem', fontSize: 16, fontWeight: 700, color: '#1a1a2e' }}>Cancelar NF-e</h3>
            <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 1rem' }}>
              NF-e {modalCancelar.numero_nfe}/{modalCancelar.serie_nfe} — {modalCancelar.compradores?.nome}
            </p>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', fontSize: 12, color: '#9a3412' }}>
              ⚠️ Cancelamento irreversível. Permitido somente em até 24h após a emissão.
            </div>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
              Justificativa (mínimo 15 caracteres)
            </label>
            <textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              rows={3}
              placeholder="Ex: Erro no preço informado na nota fiscal"
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e3dc', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
            />
            <div style={{ fontSize: 11, color: justificativa.length < 15 ? '#dc2626' : '#15803d', marginBottom: '1rem' }}>
              {justificativa.length}/15 caracteres mínimos
            </div>
            {erroModal && (
              <div style={{
                background: '#fee2e2', border: '1px solid #fecaca', borderRadius: 8,
                padding: '0.75rem', marginBottom: '1rem', fontSize: 12, color: '#dc2626'
              }}>
                {erroModal}
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setModalCancelar(null); setJustificativa(''); setErroModal(null) }}
                style={{ padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: '1px solid #d1d5db', background: 'white', color: '#374151', cursor: 'pointer' }}
              >Voltar</button>
              <button
                onClick={handleCancelar}
                disabled={justificativa.length < 15 || carregando}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, border: 'none',
                  background: justificativa.length < 15 ? '#f3f4f6' : '#dc2626',
                  color: justificativa.length < 15 ? '#9ca3af' : 'white',
                  cursor: justificativa.length < 15 ? 'not-allowed' : 'pointer',
                }}
              >{carregando ? 'Cancelando...' : 'Confirmar cancelamento'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
