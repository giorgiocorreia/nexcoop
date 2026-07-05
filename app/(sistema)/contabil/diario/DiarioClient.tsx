'use client'

import { useEffect, useState } from 'react'
import { getExercicioAtivo, getLivroDiario } from '@/lib/contabil/actions'
import BotaoAjuda from '@/components/BotaoAjuda'
import { PageLayout, COM_C, MODULO_CONTABIL } from '@/components/nexcoop/ui'

function fmt(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default function DiarioClient({ orgId }: { orgId: string }) {
  const [exercicio, setExercicio] = useState<any>(null)
  const [itens, setItens] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [total, setTotal] = useState(0)

  useEffect(() => {
    getExercicioAtivo(orgId).then(async ex => {
      setExercicio(ex)
      if (ex) {
        const data = await getLivroDiario(orgId, ex.id)
        setItens(data)
        setTotal(data.reduce((s: number, i: any) => s + i.valor, 0))
      }
    }).finally(() => setLoading(false))
  }, [orgId])

  return (
    <PageLayout
      titulo="Livro Diário"
      subtitulo="Registro cronológico de todos os lançamentos contábeis do exercício"
      icone="ti-notebook"
      modulo={MODULO_CONTABIL}
      breadcrumb={[{ label: 'Livro Diário' }]}
      acoes={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '9px 18px', background: '#fff', color: COM_C.verde, border: `1px solid ${COM_C.verde}`, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          >
            🖨 Imprimir
          </button>
          <BotaoAjuda chave="manual_contabil_url" />
        </div>
      }
    >
      {exercicio && (
        <div style={{ background: '#f0fdf9', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#166534', fontWeight: 600 }}>
          Exercício {exercicio.ano} — {exercicio.status === 'ENCERRADO' ? 'Encerrado' : 'Em aberto'}
        </div>
      )}

      {loading ? (
        <p style={{ color: '#6b7280' }}>Carregando...</p>
      ) : itens.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>
          Nenhum lançamento classificado no exercício atual.
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#1a1a2e' }}>
                {['Nº', 'Data', 'Histórico', 'Conta Débito', 'Conta Crédito', 'Valor'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: h === 'Valor' ? 'right' : 'left', fontSize: 12, color: '#fff', fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {itens.map((item: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#9ca3af', width: 50 }}>{item.numero}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
                    {new Date(item.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 13 }}>{item.historico}</td>
                  <td style={{ padding: '9px 14px', fontSize: 12 }}>
                    <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{item.conta_debito_codigo}</span>
                    <span style={{ color: '#6b7280' }}> {item.conta_debito_nome}</span>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 12 }}>
                    <span style={{ color: '#166534', fontWeight: 600 }}>{item.conta_credito_codigo}</span>
                    <span style={{ color: '#6b7280' }}> {item.conta_credito_nome}</span>
                  </td>
                  <td style={{ padding: '9px 14px', fontSize: 13, textAlign: 'right', fontWeight: 600 }}>{fmt(item.valor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: '#f0fdf9', fontWeight: 700 }}>
                <td colSpan={5} style={{ padding: '10px 14px', fontSize: 13 }}>
                  Total de lançamentos: {itens.length}
                </td>
                <td style={{ padding: '10px 14px', fontSize: 14, textAlign: 'right', color: COM_C.verde }}>{fmt(total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </PageLayout>
  )
}
