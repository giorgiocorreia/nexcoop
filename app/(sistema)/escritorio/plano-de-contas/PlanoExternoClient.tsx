'use client'

import { useEffect, useState } from 'react'
import { getEscritorioDoContador, getPlanoContasExterno, criarContaExterna } from '@/lib/contabil/actions'
import type { TipoConta } from '@/lib/contabil/types'
import { PageLayout, MODULO_ESCRITORIO, COM_C } from '@/components/nexcoop/ui'
const TIPOS: TipoConta[] = ['ATIVO','PASSIVO','PATRIMONIO_LIQUIDO','RECEITA','DESPESA']
const TIPO_LABEL: Record<string, string> = { ATIVO: 'Ativo', PASSIVO: 'Passivo', PATRIMONIO_LIQUIDO: 'Patrimônio Líquido', RECEITA: 'Receita', DESPESA: 'Despesa' }

interface Props { userId: string }

export default function PlanoExternoClient({ userId }: Props) {
  const [escritorioId, setEscritorioId] = useState('')
  const [contas, setContas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [codigo, setCodigo] = useState('')
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<TipoConta>('ATIVO')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    getEscritorioDoContador(userId).then(async esc => {
      if (!esc) { setLoading(false); return }
      setEscritorioId(esc.id)
      const c = await getPlanoContasExterno(esc.id)
      setContas(c)
    }).finally(() => setLoading(false))
  }, [userId])

  async function handleAdicionar() {
    if (!codigo || !nome) { setErro('Preencha código e nome.'); return }
    setSalvando(true); setErro('')
    try {
      await criarContaExterna({ escritorio_id: escritorioId, codigo, nome, tipo })
      const novas = await getPlanoContasExterno(escritorioId)
      setContas(novas)
      setSucesso('Conta adicionada!')
      setTimeout(() => setSucesso(''), 3000)
      setCodigo(''); setNome('')
    } catch (e: any) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  const porTipo = TIPOS.reduce((acc, t) => { acc[t] = contas.filter(c => c.tipo === t); return acc }, {} as Record<string, any[]>)

  return (
    <PageLayout
      titulo="Plano de Contas do Escritório"
      subtitulo="Cadastre aqui as contas do seu sistema contábil. Este plano será reutilizado em todas as cooperativas que você atende"
      icone="ti-list-numbers"
      modulo={MODULO_ESCRITORIO}
      breadcrumb={[{ label: 'Plano de Contas' }]}
    >
      <div style={{ maxWidth: 960 }}>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 20, marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Adicionar Conta</h2>
        {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#166534', fontSize: 13 }}>{sucesso}</div>}
        {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={codigo} onChange={e => setCodigo(e.target.value)} placeholder='Código (ex: 1.1.01.0001)' style={{ flex: 1, minWidth: 160, padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }} />
          <input value={nome} onChange={e => setNome(e.target.value)} placeholder='Nome da conta' style={{ flex: 2, minWidth: 200, padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }} />
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoConta)} style={{ flex: 1, minWidth: 160, padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
            {TIPOS.map(t => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
          </select>
          <button onClick={handleAdicionar} disabled={salvando} style={{ padding: '9px 18px', background: COM_C.verde, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {salvando ? 'Salvando...' : '+ Adicionar'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>Este plano é centralizado — disponível automaticamente em todas as cooperativas que você atende.</p>
      </div>

      {loading ? <p style={{ color: '#6b7280' }}>Carregando...</p> : contas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>Nenhuma conta cadastrada ainda.</div>
      ) : (
        TIPOS.filter(t => porTipo[t]?.length > 0).map(t => (
          <div key={t} style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 13, fontWeight: 700, color: COM_C.verde, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 1 }}>{TIPO_LABEL[t]} ({porTipo[t].length})</h3>
            <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {porTipo[t].map((c: any, i: number) => (
                    <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: COM_C.verde, fontSize: 13, width: 160 }}>{c.codigo}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13 }}>{c.nome}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
      </div>
    </PageLayout>
  )
}
