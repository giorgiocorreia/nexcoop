'use client'

import { useEffect, useState } from 'react'
import { getEmpresasDoUsuario, aceitarVinculo } from '@/lib/parceiros/actions'

const COR = '#0F766E'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', border: '1px solid #d5d3cc',
  borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box',
}

export default function EscritorioClient({ userId }: { userId: string }) {
  const [empresas, setEmpresas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sucesso, setSucesso] = useState('')
  const [nomeUsuario, setNomeUsuario] = useState('')

  const [modalPerfil, setModalPerfil] = useState(false)
  const [nomeCompleto, setNomeCompleto] = useState('')
  const [cargo, setCargo] = useState('')
  const [crc, setCrc] = useState('')
  const [salvandoPerfil, setSalvandoPerfil] = useState(false)

  useEffect(() => {
    getEmpresasDoUsuario(userId).then(setEmpresas).finally(() => setLoading(false))
  }, [userId])

  useEffect(() => {
    if (empresas.length > 0) {
      setNomeUsuario(empresas[0].nome || '')
    }
  }, [empresas])

  useEffect(() => {
    if (empresas.length > 0) {
      const prof = empresas[0]
      const nomeEhPadrao = !prof.nome || prof.nome === prof.empresa?.email_contato || prof.nome === prof.empresa?.razao_social
      if (nomeEhPadrao) setModalPerfil(true)
    }
  }, [empresas])

  async function handleAcessarContabil(orgId: string) {
    const res = await fetch('/api/parceiros/acessar-org', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orgId }),
    })
    if (res.ok) {
      window.location.href = '/contabil/plano-de-contas'
    }
  }

  async function handleAceitar(empresaId: string) {
    await aceitarVinculo(empresaId)
    const novas = await getEmpresasDoUsuario(userId)
    setEmpresas(novas)
    setSucesso('Vínculo aceito com sucesso!')
    setTimeout(() => setSucesso(''), 3000)
  }

  async function handleSalvarPerfil() {
    if (!nomeCompleto) return
    setSalvandoPerfil(true)
    try {
      await fetch('/api/aceitar-parceiro', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, nome: nomeCompleto, cargo, crc }),
      })
      const novas = await getEmpresasDoUsuario(userId)
      setEmpresas(novas)
      setModalPerfil(false)
    } catch (e) { console.error(e) }
    finally { setSalvandoPerfil(false) }
  }

  if (loading) return <div style={{ padding: 32, color: '#6b7280' }}>Carregando...</div>

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>
        {nomeUsuario ? `Olá, ${nomeUsuario}` : 'Meu Painel'}
      </h1>
      <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Organizações clientes vinculadas à sua empresa</p>

      {sucesso && <div style={{ background: '#dcfce7', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', marginBottom: 16, color: '#166534', fontSize: 13 }}>{sucesso}</div>}

      {empresas.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 12, border: '1px solid #e5e3dc', color: '#6b7280' }}>
          <p style={{ fontSize: 14 }}>Nenhuma organização vinculada ainda.</p>
          <p style={{ fontSize: 12, marginTop: 8 }}>Quando uma cooperativa ou associação vincular sua empresa, ela aparecerá aqui.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {empresas.map((item: any) => {
            const empresa = item.empresa
            const org = empresa?.org
            const pendente = empresa?.status === 'pendente'
            return (
              <div key={item.id} style={{ background: '#fff', borderRadius: 12, border: `1px solid ${pendente ? '#f59e0b' : '#e5e3dc'}`, padding: '20px 24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: 15 }}>{org?.nome || '—'}</p>
                      {pendente && (
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#fef9c3', color: '#854d0e' }}>
                          Aguardando aceite
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>
                      {org?.tipo === 'cooperativa' ? 'Cooperativa' : 'Associação'} · {item.nivel === 'responsavel' ? 'Responsável' : item.nivel === 'operador' ? 'Operador' : 'Consultor'}
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {pendente ? (
                      <button onClick={() => handleAceitar(empresa.id)}
                        style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Aceitar Vínculo
                      </button>
                    ) : (
                      <button onClick={() => handleAcessarContabil(empresa.org_id)}
                        style={{ padding: '9px 18px', background: COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        Acessar Módulo Contábil
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', gap: 12 }}>
        <a href='/escritorio/equipe'
          style={{ padding: '10px 18px', background: '#fff', color: COR, border: `1px solid ${COR}`, borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Gerenciar Equipe
        </a>
        <a href='/escritorio/perfil'
          style={{ padding: '10px 18px', background: '#fff', color: '#374151', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          Dados do Escritório
        </a>
      </div>

      {modalPerfil && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 440, maxWidth: '95vw' }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>Bem-vindo ao NexCoop!</h2>
            <p style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>Complete seu perfil para continuar.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {([
                ['Nome completo *', nomeCompleto, setNomeCompleto, 'Seu nome'],
                ['Cargo', cargo, setCargo, 'Ex: Contador, Auxiliar'],
                ['CRC', crc, setCrc, 'Ex: CRC-BA 012345/O-1'],
              ] as [string, string, (v: string) => void, string][]).map(([label, val, setter, ph]) => (
                <div key={label}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input value={val} onChange={e => setter(e.target.value)} placeholder={ph} style={inputStyle} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
              <button
                onClick={handleSalvarPerfil}
                disabled={!nomeCompleto || salvandoPerfil}
                style={{ flex: 1, padding: '10px', background: !nomeCompleto || salvandoPerfil ? '#9CA3AF' : COR, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: !nomeCompleto || salvandoPerfil ? 'not-allowed' : 'pointer' }}>
                {salvandoPerfil ? 'Salvando…' : 'Salvar e continuar'}
              </button>
              <button
                onClick={() => setModalPerfil(false)}
                style={{ padding: '10px 16px', background: '#fff', color: '#6b7280', border: '1px solid #e5e3dc', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                Agora não
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
