'use client'

import { useEffect, useState } from 'react'
import { getEmpresasDoUsuario, aceitarVinculo } from '@/lib/parceiros/actions'

const COR = '#0F766E'

export default function EscritorioClient({ userId }: { userId: string }) {
  const [empresas, setEmpresas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [sucesso, setSucesso] = useState('')

  useEffect(() => {
    getEmpresasDoUsuario(userId).then(setEmpresas).finally(() => setLoading(false))
  }, [userId])

  async function handleAceitar(empresaId: string) {
    await aceitarVinculo(empresaId)
    const novas = await getEmpresasDoUsuario(userId)
    setEmpresas(novas)
    setSucesso('Vínculo aceito com sucesso!')
    setTimeout(() => setSucesso(''), 3000)
  }

  if (loading) return <div style={{ padding: 32, color: '#6b7280' }}>Carregando...</div>

  return (
    <div style={{ padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e', marginBottom: 4 }}>Meu Painel</h1>
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
                      <a href={`/contabil/plano-de-contas`}
                        style={{ padding: '9px 18px', background: COR, color: '#fff', borderRadius: 8, fontSize: 13, fontWeight: 600, textDecoration: 'none', cursor: 'pointer' }}>
                        Acessar Módulo Contábil
                      </a>
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
    </div>
  )
}
