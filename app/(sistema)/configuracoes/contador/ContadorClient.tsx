'use client'

import { useEffect, useState } from 'react'
import { getContadoresDaOrg, convidarContador, toggleContador } from '@/lib/contabil/actions'

const COR = '#0F766E'

interface Props { orgId: string }

export default function ContadorClient({ orgId }: Props) {
  const [contadores, setContadores] = useState<any[]>([])
  const [email, setEmail] = useState('')
  const [nivel, setNivel] = useState<'contador' | 'contador_aux'>('contador')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    getContadoresDaOrg(orgId).then(setContadores)
  }, [orgId])

  async function handleConvidar() {
    if (!email) { setErro('Informe o e-mail do contador.'); return }
    setSalvando(true); setErro('')
    try {
      await convidarContador(orgId, email, nivel)
      const novo = await getContadoresDaOrg(orgId)
      setContadores(novo)
      setSucesso('Contador vinculado com sucesso!')
      setTimeout(() => setSucesso(''), 3000)
      setEmail('')
    } catch (e: any) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  async function handleToggle(id: string, ativo: boolean) {
    await toggleContador(id, !ativo)
    setContadores(c => c.map(x => x.id === id ? { ...x, ativo: !ativo } : x))
  }

  return (
    <div style={{ padding: 32, maxWidth: 720, margin: '0 auto' }}>
      <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Contadores Vinculados</h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 28 }}>Gerencie o acesso do escritório de contabilidade à sua organização</p>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', padding: 24, marginBottom: 28 }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 16 }}>Vincular Contador</h2>
        {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#166534', fontSize: 13 }}>{sucesso}</div>}
        {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13 }}>{erro}</div>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder='E-mail do contador (deve ter conta no NexCoop)'
            style={{ flex: 2, minWidth: 240, padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }} />
          <select value={nivel} onChange={e => setNivel(e.target.value as any)} style={{ flex: 1, minWidth: 160, padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
            <option value='contador'>Contador (completo)</option>
            <option value='contador_aux'>Auxiliar Contábil</option>
          </select>
          <button onClick={handleConvidar} disabled={salvando} style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            {salvando ? 'Vinculando...' : 'Vincular'}
          </button>
        </div>
        <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 10 }}>O contador precisa ter uma conta criada no NexCoop.</p>
      </div>

      {contadores.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 40, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280', fontSize: 14 }}>Nenhum contador vinculado ainda.</div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          {contadores.map((c: any, i: number) => (
            <div key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 20px', borderBottom: i < contadores.length - 1 ? '1px solid #f3f4f6' : 'none', background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{c.usuarios?.nome || c.usuarios?.email || '—'}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{c.usuarios?.email} · {c.nivel === 'contador' ? 'Contador' : 'Auxiliar Contábil'}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, fontWeight: 600, background: c.ativo ? '#dcfce7' : '#f3f4f6', color: c.ativo ? '#166534' : '#6b7280' }}>{c.ativo ? 'Ativo' : 'Inativo'}</span>
                <button onClick={() => handleToggle(c.id, c.ativo)} style={{ padding: '6px 14px', border: `1px solid ${c.ativo ? '#fca5a5' : COR}`, borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', background: '#fff', color: c.ativo ? '#dc2626' : COR }}>
                  {c.ativo ? 'Inativar' : 'Reativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
