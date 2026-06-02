'use client'

import { useEffect, useState } from 'react'
import { getEmpresasDoUsuario, getProfissionais, convidarProfissional, toggleProfissional } from '@/lib/parceiros/actions'
import { NIVEL_LABEL, NivelProfissional } from '@/lib/parceiros/types'

const COR = '#0F766E'

export default function EquipeClient({ userId }: { userId: string }) {
  const [empresaId, setEmpresaId] = useState('')
  const [profissionais, setProfissionais] = useState<any[]>([])
  const [modal, setModal] = useState(false)
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cargo, setCargo] = useState('')
  const [crc, setCrc] = useState('')
  const [nivel, setNivel] = useState<NivelProfissional>('operador')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    getEmpresasDoUsuario(userId).then(empresas => {
      if (empresas.length > 0) {
        const id = empresas[0].empresa_id
        setEmpresaId(id)
        getProfissionais(id).then(setProfissionais)
      }
    })
  }, [userId])

  async function handleConvidar() {
    if (!nome || !email) { setErro('Preencha nome e e-mail.'); return }
    setSalvando(true); setErro('')
    try {
      await convidarProfissional({ empresa_id: empresaId, nome, email, cargo, crc, nivel })
      const novos = await getProfissionais(empresaId)
      setProfissionais(novos)
      setSucesso('Convite enviado!')
      setTimeout(() => setSucesso(''), 3000)
      setModal(false); setNome(''); setEmail(''); setCargo(''); setCrc('')
    } catch (e: any) { setErro(e.message) }
    finally { setSalvando(false) }
  }

  async function handleToggle(id: string, ativo: boolean) {
    await toggleProfissional(id, !ativo)
    setProfissionais(p => p.map(x => x.id === id ? { ...x, ativo: !ativo } : x))
  }

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>Equipe</h1>
          <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0' }}>Profissionais do seu escritório com acesso ao NexCoop</p>
        </div>
        <button onClick={() => setModal(true)}
          style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          + Convidar Profissional
        </button>
      </div>

      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}

      {profissionais.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 48, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>
          <p style={{ fontSize: 14 }}>Nenhum profissional cadastrado ainda.</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>Convide contadores e auxiliares da sua equipe.</p>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', overflow: 'hidden' }}>
          {profissionais.map((p: any, i: number) => (
            <div key={p.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px',
              borderBottom: i < profissionais.length - 1 ? '1px solid #f3f4f6' : 'none',
              background: i % 2 === 0 ? '#fff' : '#f8f7f4' }}>
              <div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 13 }}>{p.nome}</p>
                <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                  {p.email} · {NIVEL_LABEL[p.nivel as NivelProfissional]}
                  {p.crc && ` · CRC: ${p.crc}`}
                  {!p.aceito_em && ' · Convite pendente'}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: p.ativo ? '#dcfce7' : '#f3f4f6', color: p.ativo ? '#166534' : '#6b7280' }}>
                  {p.ativo ? 'Ativo' : 'Inativo'}
                </span>
                <button onClick={() => handleToggle(p.id, p.ativo)}
                  style={{ padding: '6px 12px', border: `1px solid ${p.ativo ? '#fca5a5' : '#86efac'}`,
                    borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', background: '#fff',
                    color: p.ativo ? '#dc2626' : '#166534' }}>
                  {p.ativo ? 'Inativar' : 'Reativar'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: 460, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 20 }}>Convidar Profissional</h2>
            {erro && <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 6, padding: '8px 12px', marginBottom: 14, color: '#dc2626', fontSize: 12 }}>{erro}</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                ['Nome completo *', nome, setNome, ''],
                ['E-mail *', email, setEmail, ''],
                ['Cargo', cargo, setCargo, 'Ex: Contador, Auxiliar'],
                ['CRC', crc, setCrc, 'Ex: CRC-BA 012345/O-1'],
              ].map(([label, val, setter, ph]: any) => (
                <div key={label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input value={val} onChange={e => setter(e.target.value)} placeholder={ph}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
                </div>
              ))}
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nível de acesso</label>
                <select value={nivel} onChange={e => setNivel(e.target.value as NivelProfissional)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13 }}>
                  <option value='responsavel'>Responsável — acesso completo, fecha exercício</option>
                  <option value='operador'>Operador — classifica, exporta, comenta</option>
                  <option value='consultor'>Consultor — somente leitura e classificação</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => { setModal(false); setErro('') }}
                style={{ padding: '9px 18px', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, background: '#fff', cursor: 'pointer' }}>
                Cancelar
              </button>
              <button onClick={handleConvidar} disabled={salvando}
                style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {salvando ? 'Enviando...' : 'Enviar Convite'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
